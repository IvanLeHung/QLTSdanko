import { Router } from 'express';
import { InventoryService } from '../services/inventory.service';
import { InventoryCountReportService } from '../services/inventory-count-report.service';
import { authenticateToken, AuthRequest, requirePermission } from '../middleware/auth.middleware';
import prisma from '../utils/prisma';
import { buildExcelWorkbook, formatDate } from '../utils/excel.util';
import { buildDataScopeWhere } from '../utils/data-scope.util';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'inventory');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

const router = Router();

const isMissingInventoryClosingMigration = (error: any) => {
  const text = `${error?.code || ''} ${error?.message || ''} ${error?.meta?.column || ''}`;
  return text.includes('P2022') || text.includes('lockedAt') || text.includes('lockedBy') || text.includes('closingScopeId') || text.includes('InventoryClosing');
};

router.post('/upload-photo', authenticateToken, upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Không nhận được file ảnh' });
  }
  const fileUrl = `/uploads/inventory/${req.file.filename}`;
  res.json({ url: fileUrl });
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const list = await InventoryService.getInventoryList();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/active-users', authenticateToken, async (req, res) => {
  try {
    const departmentId = req.query.departmentId ? Number(req.query.departmentId) : undefined;
    const departmentName = typeof req.query.departmentName === 'string' ? req.query.departmentName.trim() : '';
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const limit = Math.min(Number(req.query.limit) || 100, 200);

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        status: 'ACTIVE',
        ...(departmentId ? { departmentId } : {}),
        ...(departmentName ? { department: { name: departmentName } } : {}),
        ...(q ? {
          OR: [
            { fullName: { contains: q, mode: 'insensitive' } },
            { username: { contains: q, mode: 'insensitive' } },
            { employeeCode: { contains: q, mode: 'insensitive' } },
            { position: { contains: q, mode: 'insensitive' } }
          ]
        } : {})
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        employeeCode: true,
        position: true,
        departmentId: true,
        department: { select: { id: true, name: true } }
      },
      take: limit
    });

    const priority = (position?: string | null) => {
      const text = String(position || '').toLowerCase();
      if (/(trưởng|truong|head|manager)/i.test(text)) return 1;
      if (/(phó|pho|deputy)/i.test(text)) return 2;
      if (/(quản lý|quan ly|phụ trách|phu trach|lead|supervisor)/i.test(text)) return 3;
      return 4;
    };

    const result = users
      .sort((a, b) => priority(a.position) - priority(b.position) || a.fullName.localeCompare(b.fullName, 'vi'))
      .map((user) => ({
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        employeeCode: user.employeeCode,
        position: user.position,
        departmentId: user.departmentId,
        departmentName: user.department?.name || null
      }));

    res.json({ users: result });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id/sessions', authenticateToken, async (req, res) => {
  try {
    const sessions = await InventoryService.getInventorySessions(Number(req.params.id));
    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/sessions', authenticateToken, async (req, res) => {
  try {
    const session = await InventoryService.createInventoryVisit(Number(req.params.id), req.body);
    res.status(201).json(session);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/:id/sessions/preview', authenticateToken, async (req, res) => {
  try {
    const breakdown = await InventoryService.previewInventoryVisitAssets(req.body);
    res.json(breakdown);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const session = await InventoryService.getInventoryVisitDetail(Number(req.params.sessionId));
    res.json(session);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/sessions/:sessionId/start', authenticateToken, async (req, res) => {
  try {
    const session = await InventoryService.startInventoryVisit(Number(req.params.sessionId));
    res.json(session);
  } catch (error: any) {
    if (isMissingInventoryClosingMigration(error)) {
      return res.status(503).json({
        message: 'Database chưa chạy migration 20260619090000_add_inventory_closing. Cần chạy Prisma migration trên DB production/staging rồi thử lại.'
      });
    }
    res.status(400).json({ message: error.message });
  }
});

router.post('/session-details/:detailId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const checkedBy = req.user?.fullName || req.user?.username || 'system';
    const detail = await InventoryService.updateInventoryVisitDetail(Number(req.params.detailId), req.body, checkedBy);
    res.json(detail);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/sessions/:sessionId/extra', authenticateToken, async (req, res) => {
  try {
    const detail = await InventoryService.addExtraInventoryVisitAsset(Number(req.params.sessionId), req.body);
    res.status(201).json(detail);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/sessions/:sessionId/complete', authenticateToken, async (req, res) => {
  try {
    const session = await InventoryService.completeInventoryVisit(Number(req.params.sessionId));
    res.json(session);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    await InventoryService.deleteInventoryVisit(Number(req.params.sessionId));
    res.json({ message: 'Deleted session successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/sessions/:sessionId/barcode/:barcode', authenticateToken, async (req, res) => {
  const sessionId = Number(req.params.sessionId);
  const barcode = req.params.barcode as string;

  try {
    const details = await prisma.inventoryDetail.findMany({
      where: {
        sessionId,
        OR: [
          { assetCode: barcode },
          { serialNumber: barcode },
          { asset: { serialNumber: barcode } }
        ]
      },
      include: { asset: true }
    });

    if (details.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy tài sản trong phiên kiểm kê này' });
    }
    if (details.length > 1) {
      return res.status(300).json({ message: 'Trùng mã tài sản hoặc serial', items: details });
    }

    res.json(details[0]);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/sessions/:sessionId/fast-scan', authenticateToken, async (req: AuthRequest, res) => {
  const sessionId = Number(req.params.sessionId);
  const { barcode } = req.body;
  const checkedBy = req.user?.fullName || req.user?.username || 'system';

  if (!barcode) {
    return res.status(400).json({ message: 'Barcode is required' });
  }

  try {
    const details = await prisma.inventoryDetail.findMany({
      where: {
        sessionId,
        OR: [
          { assetCode: barcode },
          { serialNumber: barcode },
          { asset: { serialNumber: barcode } }
        ]
      },
      include: { asset: true }
    });

    if (details.length === 0) {
      const globalAsset = await prisma.asset.findFirst({
        where: {
          isDeleted: false,
          OR: [
            { assetCode: barcode },
            { serialNumber: barcode }
          ]
        }
      });

      if (globalAsset) {
        return res.json({
          success: false,
          action: 'OUT_OF_SCOPE',
          message: 'Tài sản tồn tại trên hệ thống nhưng không thuộc phạm vi của phiên kiểm kê này.',
          reason: ['Tài sản ngoài phạm vi phiên kiểm kê'],
          asset: globalAsset
        });
      }

      return res.json({
        success: false,
        action: 'NOT_FOUND',
        message: `Không tìm thấy tài sản với mã hoặc serial "${barcode}" trên hệ thống.`,
        reason: ['Tài sản không tồn tại']
      });
    }

    if (details.length > 1) {
      return res.json({
        success: false,
        action: 'DUPLICATE_CODE',
        message: 'Trùng mã tài sản hoặc serial. Vui lòng chọn tài sản cụ thể.',
        reason: ['Trùng mã/serial kiểm kê'],
        items: details
      });
    }

    const detail = details[0];

    if (detail.checkedAt) {
      return res.json({
        success: false,
        action: 'ALREADY_CHECKED',
        message: `Tài sản này đã được kiểm kê trước đó.`,
        reason: ['Đã kiểm kê trước đó'],
        item: detail,
        asset: detail.asset
      });
    }

    const expectedStatus = detail.asset?.status || 'ASSIGNED';

    if (expectedStatus === 'DAMAGED' || expectedStatus === 'LOST' || expectedStatus === 'LIQUIDATED') {
      return res.json({
        success: false,
        action: 'NEED_REVIEW',
        message: `Trạng thái sổ sách của tài sản là "${expectedStatus}". Cần người dùng kiểm tra chi tiết.`,
        reason: [`Trạng thái bất thường: ${expectedStatus}`],
        item: detail,
        asset: detail.asset,
        comparison: {
          status: 'DIFFERENT',
          location: 'MATCH',
          user: 'MATCH',
          serial: 'MATCH'
        }
      });
    }

    const visitSession = await prisma.inventorySession.findUnique({
      where: { id: sessionId }
    });

    const comparison = {
      status: 'MATCH',
      location: 'MATCH',
      user: 'MATCH',
      serial: 'MATCH'
    };
    const reasons: string[] = [];

    if (visitSession?.locationName && detail.bookLocationName && visitSession.locationName !== detail.bookLocationName) {
      comparison.location = 'DIFFERENT';
      reasons.push(`Vị trí sổ sách (${detail.bookLocationName}) khác vị trí phiên kiểm kê (${visitSession.locationName})`);
    }

    if (visitSession?.departmentName && detail.bookDepartmentName && visitSession.departmentName !== detail.bookDepartmentName) {
      comparison.user = 'DIFFERENT';
      reasons.push(`Bộ phận sổ sách (${detail.bookDepartmentName}) khác bộ phận phiên kiểm kê (${visitSession.departmentName})`);
    }

    if (reasons.length > 0) {
      return res.json({
        success: false,
        action: 'NEED_REVIEW',
        message: 'Có sự sai lệch thông tin vị trí hoặc bộ phận so với sổ sách.',
        reason: reasons,
        item: detail,
        asset: detail.asset,
        comparison
      });
    }

    const updated = await prisma.inventoryDetail.update({
      where: { id: detail.id },
      data: {
        actualLocationName: detail.bookLocationName || visitSession?.locationName || '',
        actualUserName: detail.bookUserName || '',
        actualDepartmentName: detail.bookDepartmentName || visitSession?.departmentName || '',
        resultStatus: 'MATCH',
        checkedAt: new Date()
      }
    });

    if (detail.assetId) {
      await prisma.asset.update({
        where: { id: detail.assetId },
        data: {
          lastInventoryDate: new Date(),
          lastInventoryStatus: 'MATCH'
        }
      });
      await prisma.auditLog.create({
        data: {
          entityType: 'ASSET',
          entityId: detail.assetId,
          action: 'FAST_SCAN_CHECK',
          details: `Tự động kiểm kê (Fast Scan) khớp hoàn toàn.`,
          performedBy: req.user?.username || 'system'
        }
      });
    }

    return res.json({
      success: true,
      action: 'MATCH_AUTO_SAVED',
      message: `Tự động kiểm kê thành công mã tài sản: ${detail.assetCode}`,
      item: updated,
      asset: detail.asset,
      comparison
    });

  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});


router.get('/sessions/:sessionId/report', authenticateToken, async (req, res) => {
  try {
    const report = await InventoryService.getInventoryVisitReport(Number(req.params.sessionId));
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', authenticateToken, requirePermission('INVENTORY_CREATE'), async (req: AuthRequest, res) => {
  const performedBy = req.user?.username || 'system';
  try {
    let payload = req.body;
    if (req.body?.scopeType === 'SELECTED') {
      const requestedIds = Array.from(new Set<number>(
        (Array.isArray(req.body?.assetIds) ? req.body.assetIds : [])
          .map(Number)
          .filter((id: number) => Number.isInteger(id) && id > 0)
      ));
      const scopeWhere = buildDataScopeWhere(req.user?.dataScope, req.user?.id || 0, {
        company: 'companyCode',
        department: 'departmentName',
        warehouse: 'locationName',
        user: 'currentUserName'
      });
      if (scopeWhere.id === -1) return res.status(403).json({ message: 'Bạn không có quyền kiểm kê các tài sản này.' });
      const allowedAssets = await prisma.asset.findMany({
        where: {
          id: { in: requestedIds },
          isDeleted: false,
          ...(Object.keys(scopeWhere).length > 0 ? { AND: [scopeWhere] } : {})
        },
        select: { id: true }
      });
      payload = { ...req.body, assetIds: allowedAssets.map((asset) => asset.id) };
    }
    const session = await InventoryService.createInventorySession(payload, performedBy);
    res.status(201).json(session);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/:id/count-sheet/assets', authenticateToken, requirePermission('INVENTORY_CREATE'), async (req: AuthRequest, res) => {
  const performedBy = req.user?.fullName || req.user?.username || 'system';
  try {
    const rawIds = Array.isArray(req.body?.assetIds) ? req.body.assetIds : [];
    const requestedIds = Array.from(new Set<number>(
      rawIds.map(Number).filter((id: number) => Number.isInteger(id) && id > 0)
    ));
    const scopeWhere = buildDataScopeWhere(req.user?.dataScope, req.user?.id || 0, {
      company: 'companyCode',
      department: 'departmentName',
      warehouse: 'locationName',
      user: 'currentUserName'
    });
    if (scopeWhere.id === -1) return res.status(403).json({ message: 'Bạn không có quyền thêm tài sản vào đợt kiểm kê.' });

    const allowedAssets = await prisma.asset.findMany({
      where: {
        id: { in: requestedIds },
        isDeleted: false,
        ...(Object.keys(scopeWhere).length > 0 ? { AND: [scopeWhere] } : {})
      },
      select: { id: true }
    });
    const result = await InventoryService.addAssetsToCountSheet(
      Number(req.params.id),
      allowedAssets.map((asset) => asset.id),
      performedBy
    );
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/:id/count-sheet', authenticateToken, requirePermission('INVENTORY_VIEW'), async (req: AuthRequest, res) => {
  try {
    const result = await InventoryService.getInventoryCountSheet(Number(req.params.id));
    if (!result) return res.status(404).json({ message: 'Không tìm thấy đợt kiểm kê.' });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id/count-sheet/export', authenticateToken, requirePermission('INVENTORY_VIEW'), async (req: AuthRequest, res) => {
  try {
    const inventoryId = Number(req.params.id);
    const inventory = await prisma.inventoryCheck.findUnique({
      where: { id: inventoryId },
      select: { inventoryCode: true }
    });
    if (!inventory) return res.status(404).json({ message: 'Không tìm thấy đợt kiểm kê.' });
    const scopeWhere = buildDataScopeWhere(req.user?.dataScope, req.user?.id || 0, {
      company: 'companyCode',
      department: 'departmentName',
      warehouse: 'locationName',
      user: 'currentUserName'
    });
    const safeCode = String(inventory.inventoryCode || req.params.id).replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=BaoCaoKiemKe_${safeCode}.xlsx`);
    await InventoryCountReportService.build({
      inventoryCheckId: inventoryId,
      requestedBy: req.user?.fullName || req.user?.username || 'system',
      assetWhere: scopeWhere,
      stream: res
    });
  } catch (error: any) {
    console.error('Inventory count report export failed:', error);
    if (!res.headersSent) res.status(500).json({ message: 'Không thể xuất báo cáo kiểm kê: ' + error.message });
    else res.end();
  }
});

router.patch('/:id/count-sheet', authenticateToken, requirePermission('INVENTORY_CREATE'), async (req: AuthRequest, res) => {
  const performedBy = req.user?.fullName || req.user?.username || 'system';
  try {
    const items = await InventoryService.saveCountSheetRows(Number(req.params.id), req.body?.rows, performedBy);
    res.json({ message: `Đã lưu ${items.length} dòng kiểm kê.`, items });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/:id/count-sheet/finalize', authenticateToken, requirePermission('INVENTORY_COMPLETE'), async (req: AuthRequest, res) => {
  const performedBy = req.user?.fullName || req.user?.username || 'system';
  try {
    const result = await InventoryService.finalizeCountSheet(Number(req.params.id), performedBy);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/item/:id/check', authenticateToken, async (req: AuthRequest, res) => {
  const checkedBy = req.user?.username || 'system';
  try {
    const item = await InventoryService.submitItemCheck(Number(req.params.id), {
      ...req.body,
      checkedBy
    });
    res.json(item);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/check/:inventoryCheckId/barcode/:barcode', authenticateToken, async (req, res) => {
  const inventoryCheckId = Number(req.params.inventoryCheckId);
  const barcode = req.params.barcode as string;

  try {
    const items = await prisma.inventoryItem.findMany({
      where: {
        inventoryCheckId,
        OR: [
          { assetCode: barcode },
          { asset: { serialNumber: barcode } }
        ]
      },
      include: { asset: true }
    });

    if (items.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy tài sản trong kỳ kiểm kê này' });
    }
    if (items.length > 1) {
      return res.status(300).json({ message: 'Trùng mã tài sản hoặc serial', items });
    }

    res.json(items[0]);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/check/:inventoryCheckId/fast-scan', authenticateToken, async (req: AuthRequest, res) => {
  const inventoryCheckId = Number(req.params.inventoryCheckId);
  const { barcode } = req.body;
  const checkedBy = req.user?.fullName || req.user?.username || 'system';

  if (!barcode) {
    return res.status(400).json({ message: 'Barcode is required' });
  }

  try {
    const items = await prisma.inventoryItem.findMany({
      where: {
        inventoryCheckId,
        OR: [
          { assetCode: barcode },
          { asset: { serialNumber: barcode } }
        ]
      },
      include: { asset: true }
    });

    if (items.length === 0) {
      const globalAsset = await prisma.asset.findFirst({
        where: {
          isDeleted: false,
          OR: [
            { assetCode: barcode },
            { serialNumber: barcode }
          ]
        }
      });

      if (globalAsset) {
        return res.json({
          success: false,
          action: 'OUT_OF_SCOPE',
          message: 'Tài sản tồn tại trên hệ thống nhưng không thuộc phạm vi của kỳ kiểm kê này.',
          reason: ['Tài sản ngoài phạm vi kỳ kiểm kê'],
          asset: globalAsset
        });
      }

      return res.json({
        success: false,
        action: 'NOT_FOUND',
        message: `Không tìm thấy tài sản với mã hoặc serial "${barcode}" trên hệ thống.`,
        reason: ['Tài sản không tồn tại']
      });
    }

    if (items.length > 1) {
      return res.json({
        success: false,
        action: 'DUPLICATE_CODE',
        message: 'Trùng mã tài sản hoặc serial. Vui lòng chọn tài sản cụ thể.',
        reason: ['Trùng mã/serial kiểm kê'],
        items: items
      });
    }

    const item = items[0];

    if (item.checkStatus === 'CHECKED') {
      return res.json({
        success: false,
        action: 'ALREADY_CHECKED',
        message: `Tài sản này đã được kiểm kê trước đó.`,
        reason: ['Đã kiểm kê trước đó'],
        item: item,
        asset: item.asset
      });
    }

    const expectedStatus = item.expectedStatus || 'IN_STOCK';
    const expectedLocation = item.expectedLocation || '';
    const expectedUser = item.asset?.currentUserName || '';
    const expectedSerial = item.asset?.serialNumber || '';

    if (expectedStatus === 'DAMAGED' || expectedStatus === 'LOST' || expectedStatus === 'LIQUIDATED') {
      return res.json({
        success: false,
        action: 'NEED_REVIEW',
        message: `Trạng thái sổ sách của tài sản là "${expectedStatus}". Cần người dùng kiểm tra chi tiết.`,
        reason: [`Trạng thái bất thường: ${expectedStatus}`],
        item: item,
        asset: item.asset,
        comparison: {
          status: 'DIFFERENT',
          location: 'MATCH',
          user: 'MATCH',
          serial: 'MATCH'
        }
      });
    }

    const comparison = {
      status: 'MATCH',
      location: 'MATCH',
      user: 'MATCH',
      serial: 'MATCH'
    };

    const updated = await prisma.$transaction(async (tx) => {
      const updatedItem = await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          actualStatus: expectedStatus,
          actualLocation: expectedLocation,
          quality: 'GOOD',
          result: 'MATCHED',
          checkStatus: 'CHECKED',
          checkedAt: new Date(),
          checkedBy,
          actualUserName: expectedUser,
          actualSerialNumber: expectedSerial,
          checkCondition: 'FOUND'
        }
      });

      if (item.assetId) {
        await tx.asset.update({
          where: { id: item.assetId },
          data: {
            lastInventoryDate: new Date(),
            lastInventoryStatus: 'MATCHED'
          }
        });

        await tx.auditLog.create({
          data: {
            entityType: 'ASSET',
            entityId: item.assetId,
            action: 'FAST_SCAN_CHECK',
            details: `Tự động kiểm kê (Fast Scan) khớp hoàn toàn.`,
            performedBy: req.user?.username || 'system'
          }
        });
      }

      return updatedItem;
    });

    return res.json({
      success: true,
      action: 'MATCH_AUTO_SAVED',
      message: `Tự động kiểm kê thành công mã tài sản: ${item.assetCode}`,
      item: updated,
      asset: item.asset,
      comparison
    });

  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/check-multiple-assets', authenticateToken, async (req: AuthRequest, res) => {
  const checkedBy = req.user?.fullName || req.user?.username || 'system';
  const {
    sessionId,
    assetIds,
    actualStatus,
    actualLocation,
    quality,
    note,
    photos,
    actualUserName,
    actualUserId,
    actualSerialNumber,
    checkCondition,
    physicalDetailsJson
  } = req.body;

  if (!sessionId || !assetIds || !Array.isArray(assetIds)) {
    return res.status(400).json({ message: 'Invalid payload' });
  }

  try {
    const results = await prisma.$transaction(async (tx) => {
      const session = await tx.inventoryCheck.findUnique({
        where: { id: Number(sessionId) }
      });
      if (!session || !['OPEN', 'IN_PROGRESS'].includes(session.status)) {
        throw new Error('Đợt kiểm kê không tồn tại hoặc không còn hoạt động');
      }

      const output = [];
      for (const assetId of assetIds) {
        const asset = await tx.asset.findUnique({ where: { id: Number(assetId) } });
        if (!asset) continue;
        const checkedAt = new Date();

        let item = await tx.inventoryItem.findFirst({
          where: { inventoryCheckId: Number(sessionId), assetId: Number(assetId) }
        });

        // Determine result status
        let result = 'MATCHED';
        if (checkCondition === 'MISSING' || actualStatus === 'LOST' || quality === 'LOST' || quality === 'MISSING') {
          result = 'MISSING';
        } else if (quality === 'DAMAGED' || quality === 'BAD' || actualStatus === 'DAMAGED') {
          result = 'DAMAGED';
        } else if ((actualLocation || asset.locationName) && (item?.expectedLocation || asset.locationName) && (actualLocation || asset.locationName) !== (item?.expectedLocation || asset.locationName)) {
          result = 'WRONG_LOCATION';
        } else if (item && actualStatus !== item.expectedStatus) {
          result = 'WRONG_STATUS';
        } else if (!item && actualStatus !== asset.status) {
          result = 'WRONG_STATUS';
        } else if (actualUserName && asset.currentUserName && actualUserName !== asset.currentUserName) {
          result = 'WRONG_USER';
        }

        if (item) {
          item = await tx.inventoryItem.update({
            where: { id: item.id },
            data: {
              actualStatus,
              actualLocation: actualLocation || item.expectedLocation || asset.locationName,
              quality,
              note: note || '',
              result,
              photos: photos || [],
              checkStatus: 'CHECKED',
              checkedAt,
              checkedBy,
              actualUserName: actualUserName || null,
              actualUserId: actualUserId || null,
              actualSerialNumber: actualSerialNumber || null,
              checkCondition: checkCondition || 'FOUND',
              physicalDetailsJson: physicalDetailsJson || null
            }
          });
        } else {
          item = await tx.inventoryItem.create({
            data: {
              inventoryCheckId: Number(sessionId),
              assetId: Number(assetId),
              assetCode: asset.assetCode,
              expectedStatus: asset.status,
              actualStatus,
              expectedLocation: asset.locationName || 'Trong kho',
              actualLocation: actualLocation || asset.locationName || 'Trong kho',
              quality,
              note: note || '',
              result,
              photos: photos || [],
              checkStatus: 'CHECKED',
              checkedAt,
              checkedBy,
              actualUserName: actualUserName || null,
              actualUserId: actualUserId || null,
              actualSerialNumber: actualSerialNumber || null,
              checkCondition: checkCondition || 'FOUND',
              physicalDetailsJson: physicalDetailsJson || null
            }
          });
        }

        await tx.asset.update({
          where: { id: Number(assetId) },
          data: {
            lastInventoryDate: checkedAt,
            lastInventoryStatus: result
          }
        });

        await tx.auditLog.create({
          data: {
            entityType: 'ASSET',
            entityId: Number(assetId),
            action: 'INVENTORY_CHECK',
            details: `Kiểm kê thủ công trong đợt ${session.inventoryCode}. Kết quả: ${result}.`,
            performedBy: checkedBy
          }
        });

        output.push(item);
      }

      // Transition parent session status if OPEN
      if (session.status === 'OPEN') {
        await tx.inventoryCheck.update({
          where: { id: session.id },
          data: { status: 'IN_PROGRESS' }
        });
      }

      return output;
    }, { timeout: 30000 });

    res.json({ message: `Đã kiểm kê thành công ${results.length} tài sản`, items: results });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});


router.patch('/:id/start', authenticateToken, async (req: AuthRequest, res) => {
  const performedBy = req.user?.username || 'system';
  try {
    const session = await InventoryService.startInventorySession(Number(req.params.id), performedBy);
    res.json(session);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.patch('/:id/close', authenticateToken, async (req: AuthRequest, res) => {
  const performedBy = req.user?.username || 'system';
  try {
    const session = await InventoryService.closeInventorySession(Number(req.params.id), performedBy);
    res.json(session);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.patch('/:id/cancel', authenticateToken, async (req: AuthRequest, res) => {
  const performedBy = req.user?.username || 'system';
  try {
    const session = await InventoryService.cancelInventorySession(Number(req.params.id), performedBy);
    res.json(session);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// GET /export-by-time - Kiểm kê tài sản (Inventory Audit by Date Range)
router.get('/export-by-time', authenticateToken, requirePermission('INVENTORY_VIEW'), async (req: AuthRequest, res) => {
  const { startDate, endDate } = req.query;
  const where: any = {};

  if (startDate || endDate) {
    where.inventoryCheck = {
      inventoryDate: {}
    };
    if (startDate) where.inventoryCheck.inventoryDate.gte = new Date(String(startDate));
    if (endDate) {
      const end = new Date(String(endDate));
      end.setHours(23, 59, 59, 999);
      where.inventoryCheck.inventoryDate.lte = end;
    }
  }

  // Data Scope
  const scopeWhere = buildDataScopeWhere(req.user?.dataScope, req.user?.id || 0, {
    company: 'companyCode',
    department: 'departmentName',
    warehouse: 'locationName',
    user: 'currentUserName'
  });
  if (Object.keys(scopeWhere).length > 0) {
    if (scopeWhere.id === -1) {
      const workbook = buildExcelWorkbook('DANH SÁCH KIỂM KÊ TÀI SẢN', 'Không tìm thấy dữ liệu', [], [], 'Kiểm kê');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=BaoCaoKiemKe.xlsx');
      await workbook.xlsx.write(res);
      return res.end();
    }
    where.asset = scopeWhere;
  }

  try {
    const items = await prisma.inventoryItem.findMany({
      where,
      include: {
        inventoryCheck: true,
        asset: true
      },
      orderBy: {
        inventoryCheck: {
          inventoryDate: 'desc'
        }
      }
    });

    const headers = [
      'Mã đợt kiểm kê', 'Tên đợt kiểm kê', 'Ngày mở kiểm kê', 'Trạng thái đợt',
      'Phạm vi kiểm kê', 'Mã tài sản', 'Tên tài sản', 'Người sử dụng',
      'Bộ phận quản lý', 'Trạng thái sổ sách', 'Trạng thái thực tế',
      'Chất lượng thực tế', 'Kết quả kiểm kê', 'Người kiểm', 'Ngày kiểm', 'Ghi chú kiểm kê'
    ];

    const rows = items.map(item => [
      item.inventoryCheck.inventoryCode,
      item.inventoryCheck.inventoryName,
      formatDate(item.inventoryCheck.inventoryDate),
      item.inventoryCheck.status === 'DRAFT' ? 'Nháp' :
      item.inventoryCheck.status === 'OPEN' ? 'Đang mở' :
      item.inventoryCheck.status === 'IN_PROGRESS' ? 'Đang kiểm kê' :
      item.inventoryCheck.status === 'COMPLETED' ? 'Hoàn thành' :
      item.inventoryCheck.status === 'CANCELLED' ? 'Đã hủy' : item.inventoryCheck.status,
      item.inventoryCheck.scopeType === 'ALL' ? 'Tất cả tài sản' :
      item.inventoryCheck.scopeType === 'COMPANY' ? `Công ty: ${item.inventoryCheck.scopeValue}` :
      item.inventoryCheck.scopeType === 'DEPARTMENT' ? `Phòng ban: ${item.inventoryCheck.scopeValue}` :
      item.inventoryCheck.scopeType === 'LOCATION' ? `Vị trí: ${item.inventoryCheck.scopeValue}` : item.inventoryCheck.scopeType || '',
      item.assetCode,
      item.asset.assetName,
      item.asset.currentUserName || '',
      item.asset.departmentName || '',
      item.expectedStatus === 'IN_STOCK' ? 'Trong kho' :
      item.expectedStatus === 'ASSIGNED' ? 'Đã cấp phát' : item.expectedStatus || '',
      item.actualStatus === 'IN_STOCK' ? 'Trong kho' :
      item.actualStatus === 'ASSIGNED' ? 'Đã cấp phát' :
      item.actualStatus === 'DAMAGED' ? 'Bị hỏng' :
      item.actualStatus === 'LOST' ? 'Bị mất' : item.actualStatus || '',
      item.quality === 'GOOD' ? 'Tốt' :
      item.quality === 'NORMAL' ? 'Bình thường' :
      item.quality === 'BAD' ? 'Kém/Hỏng' : item.quality || '',
      item.checkStatus === 'PENDING' ? 'Chưa kiểm' :
      item.result === 'MATCHED' ? 'Khớp dữ liệu' :
      item.result === 'WRONG_LOCATION' ? 'Lệch vị trí' :
      item.result === 'WRONG_STATUS' ? 'Lệch trạng thái' :
      item.result === 'DAMAGED' ? 'Báo hỏng' :
      item.result === 'MISSING' ? 'Báo thiếu' : 'Đã kiểm',
      item.checkedBy || '',
      formatDate(item.checkedAt),
      item.note || ''
    ]);

    const dateRangeStr = startDate && endDate ? `Từ ${startDate} đến ${endDate}` : 'Tất cả thời gian';
    const userStr = req.user?.fullName || req.user?.username || 'Admin';
    const workbook = buildExcelWorkbook(
      'BÁO CÁO TỔNG HỢP KIỂM KÊ TÀI SẢN',
      `Khoảng thời gian: ${dateRangeStr} | Người xuất: ${userStr}`,
      headers,
      rows,
      'Kiểm kê tài sản'
    );

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=BaoCaoKiemKeTaiSan.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi xuất Excel: ' + error.message });
  }
});

// Discovered assets routes
router.post('/:id/discovered', authenticateToken, async (req: AuthRequest, res) => {
  const createdById = req.user?.id;
  if (!createdById) {
    return res.status(401).json({ message: 'Không xác định được danh tính người dùng' });
  }
  try {
    const item = await InventoryService.reportDiscoveredAsset(
      Number(req.params.id),
      req.body,
      createdById
    );
    res.status(201).json(item);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.get('/:id/discovered', authenticateToken, async (req, res) => {
  try {
    const list = await InventoryService.getDiscoveredAssets(Number(req.params.id));
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/discovered/:discoveredId/review', authenticateToken, async (req: AuthRequest, res) => {
  const performedBy = req.user?.username || 'system';
  try {
    const result = await InventoryService.reviewDiscoveredAsset(
      Number(req.params.discoveredId),
      req.body,
      performedBy
    );
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// ──────────────────────────────────────────────────────────────
// UNIFIED FAST SCAN ENDPOINT
// ──────────────────────────────────────────────────────────────
router.post('/fast-scan', authenticateToken, async (req: AuthRequest, res) => {
  const { mode, inventoryCheckId, sessionId, barcode, scanSource, scope } = req.body;
  const username = req.user?.username || 'system';

  if (!barcode || !barcode.trim()) {
    return res.status(400).json({ message: 'Barcode/QR code is required' });
  }

  try {
    const checkIdInt = inventoryCheckId ? Number(inventoryCheckId) : null;
    const sessIdInt = sessionId ? Number(sessionId) : null;

    // 1. Anti-Double Scan Protection (1.5 seconds)
    const oneSecAgo = new Date(Date.now() - 1500);
    const recentScan = await prisma.inventoryScanLog.findFirst({
      where: {
        barcode: barcode.trim(),
        scannedBy: username,
        scannedAt: { gte: oneSecAgo },
        inventoryCheckId: checkIdInt,
        sessionId: sessIdInt
      }
    });

    if (recentScan) {
      const log = await prisma.inventoryScanLog.create({
        data: {
          assetId: recentScan.assetId,
          assetCode: recentScan.assetCode,
          barcode: barcode.trim(),
          inventoryCheckId: checkIdInt,
          sessionId: sessIdInt,
          action: 'DUPLICATE_IGNORED',
          result: 'IGNORED',
          reason: 'Quét trùng lặp trong 1.5 giây',
          scannedBy: username,
          isDuplicateIgnored: true
        }
      });
      return res.json({
        success: true,
        action: 'DUPLICATE_IGNORED',
        message: 'Đã bỏ qua mã quét trùng',
        scanLogId: String(log.id)
      });
    }

    const matchesScope = (assetBookValues: {
      cityName?: string | null;
      locationName?: string | null;
      projectName?: string | null;
      departmentName?: string | null;
      currentUserName?: string | null;
    }) => {
      if (!scope || !scope.isScopeLocked) return true;
      if (scope.city && assetBookValues.cityName !== scope.city) return false;
      if (scope.location && assetBookValues.locationName !== scope.location) return false;
      if (scope.project && assetBookValues.projectName !== scope.project) return false;
      if (scope.department && assetBookValues.departmentName !== scope.department) return false;
      if (scope.user && assetBookValues.currentUserName !== scope.user) return false;
      return true;
    };

    if (mode === 'SESSION') {
      const details = await prisma.inventoryDetail.findMany({
        where: {
          sessionId: sessIdInt!,
          OR: [
            { assetCode: barcode.trim() },
            { serialNumber: barcode.trim() },
            { asset: { serialNumber: barcode.trim() } }
          ]
        },
        include: { asset: true, session: true }
      });

      if (details.length === 0) {
        const log = await prisma.inventoryScanLog.create({
          data: {
            barcode: barcode.trim(),
            inventoryCheckId: checkIdInt,
            sessionId: sessIdInt,
            action: 'NOT_FOUND',
            scannedBy: username
          }
        });
        return res.json({
          success: false,
          action: 'NOT_FOUND',
          message: `Không tìm thấy tài sản "${barcode}" trong phiên này`,
          scanLogId: String(log.id)
        });
      }

      if (details.length > 1) {
        const log = await prisma.inventoryScanLog.create({
          data: {
            barcode: barcode.trim(),
            inventoryCheckId: checkIdInt,
            sessionId: sessIdInt,
            action: 'DUPLICATE_CODE',
            scannedBy: username
          }
        });
        return res.json({
          success: false,
          action: 'DUPLICATE_CODE',
          message: 'Trùng mã tài sản hoặc số serial',
          items: details,
          scanLogId: String(log.id)
        });
      }

      const detail = details[0];
      const asset = detail.asset;

      if (detail.checkedAt) {
        const timeStr = new Date(detail.checkedAt).toLocaleTimeString('vi-VN');
        const checkerName = (detail as any).session?.checkerName || 'system';
        const log = await prisma.inventoryScanLog.create({
          data: {
            assetId: detail.assetId,
            assetCode: detail.assetCode,
            barcode: barcode.trim(),
            inventoryCheckId: checkIdInt,
            sessionId: sessIdInt,
            action: 'ALREADY_CHECKED',
            scannedBy: username
          }
        });
        return res.json({
          success: true,
          action: 'ALREADY_CHECKED',
          message: `Tài sản đã được kiểm kê lúc ${timeStr} bởi ${checkerName}`,
          item: detail,
          asset,
          scanLogId: String(log.id)
        });
      }

      const bookCity = asset?.cityName || null;
      const bookLocation = detail.bookLocationName || asset?.locationName || null;
      const bookProject = asset?.projectName || null;
      const bookDept = detail.bookDepartmentName || asset?.departmentName || null;
      const bookUser = detail.bookUserName || asset?.currentUserName || null;

      const inScope = matchesScope({
        cityName: bookCity,
        locationName: bookLocation,
        projectName: bookProject,
        departmentName: bookDept,
        currentUserName: bookUser
      });

      if (!inScope) {
        const log = await prisma.inventoryScanLog.create({
          data: {
            assetId: detail.assetId,
            assetCode: detail.assetCode,
            barcode: barcode.trim(),
            inventoryCheckId: checkIdInt,
            sessionId: sessIdInt,
            action: 'OUT_OF_SCOPE',
            scannedBy: username
          }
        });
        return res.json({
          success: false,
          action: 'OUT_OF_SCOPE',
          message: 'Tài sản ngoài phạm vi đang kiểm',
          item: detail,
          asset,
          scanLogId: String(log.id)
        });
      }

      const targetLocation = scope?.location || bookLocation;
      const targetUser = scope?.user || bookUser;

      let discrepancyAction: "MATCH_AUTO_SAVED" | "NEED_REVIEW" | "MISMATCH_LOCATION" | "MISMATCH_USER" | "MISMATCH_SERIAL" = 'MATCH_AUTO_SAVED';
      let message = 'Tự động kiểm kê thành công!';

      if (asset?.status && ['DAMAGED', 'LOST', 'LIQUIDATED'].includes(asset.status)) {
        discrepancyAction = 'NEED_REVIEW';
        message = 'Tài sản bị báo hỏng hoặc mất trong sổ sách';
      } else if (bookLocation && targetLocation && bookLocation !== targetLocation) {
        discrepancyAction = 'MISMATCH_LOCATION';
        message = 'Sai lệch vị trí tài sản';
      } else if (bookUser && targetUser && bookUser !== targetUser) {
        discrepancyAction = 'MISMATCH_USER';
        message = 'Sai lệch người sử dụng';
      } else if (detail.serialNumber && asset?.serialNumber && detail.serialNumber !== asset.serialNumber) {
        discrepancyAction = 'MISMATCH_SERIAL';
        message = 'Sai lệch số serial';
      }

      if (discrepancyAction === 'MATCH_AUTO_SAVED') {
        const updated = await prisma.$transaction(async (tx) => {
          const updatedDetail = await tx.inventoryDetail.update({
            where: { id: detail.id },
            data: {
              actualUserName: bookUser,
              actualDepartmentName: bookDept || '',
              actualLocationName: bookLocation || '',
              resultStatus: 'MATCH',
              checkedAt: new Date(),
              checkedBy: username
            }
          });

          if (detail.assetId) {
            await tx.asset.update({
              where: { id: detail.assetId },
              data: {
                lastInventoryDate: new Date(),
                lastInventoryStatus: 'MATCH'
              }
            });
            await tx.auditLog.create({
              data: {
                entityType: 'ASSET',
                entityId: detail.assetId,
                action: 'FAST_SCAN_CHECK',
                details: `Tự động kiểm kê (Fast Scan) khớp hoàn toàn.`,
                performedBy: username
              }
            });
          }
          return updatedDetail;
        });

        const log = await prisma.inventoryScanLog.create({
          data: {
            assetId: detail.assetId,
            assetCode: detail.assetCode,
            barcode: barcode.trim(),
            inventoryCheckId: checkIdInt,
            sessionId: sessIdInt,
            action: 'MATCH_AUTO_SAVED',
            result: 'MATCHED',
            scannedBy: username
          }
        });

        return res.json({
          success: true,
          action: 'MATCH_AUTO_SAVED',
          message,
          item: updated,
          asset,
          scanLogId: String(log.id)
        });
      } else {
        const log = await prisma.inventoryScanLog.create({
          data: {
            assetId: detail.assetId,
            assetCode: detail.assetCode,
            barcode: barcode.trim(),
            inventoryCheckId: checkIdInt,
            sessionId: sessIdInt,
            action: discrepancyAction,
            scannedBy: username
          }
        });

        return res.json({
          success: true,
          action: discrepancyAction,
          message,
          item: detail,
          asset,
          scanLogId: String(log.id)
        });
      }
    } else {
      const items = await prisma.inventoryItem.findMany({
        where: {
          inventoryCheckId: checkIdInt!,
          OR: [
            { assetCode: barcode.trim() },
            { asset: { serialNumber: barcode.trim() } }
          ]
        },
        include: { asset: true }
      });

      if (items.length === 0) {
        const log = await prisma.inventoryScanLog.create({
          data: {
            barcode: barcode.trim(),
            inventoryCheckId: checkIdInt,
            sessionId: sessIdInt,
            action: 'NOT_FOUND',
            scannedBy: username
          }
        });
        return res.json({
          success: false,
          action: 'NOT_FOUND',
          message: `Không tìm thấy tài sản "${barcode}" trong kỳ này`,
          scanLogId: String(log.id)
        });
      }

      if (items.length > 1) {
        const log = await prisma.inventoryScanLog.create({
          data: {
            barcode: barcode.trim(),
            inventoryCheckId: checkIdInt,
            sessionId: sessIdInt,
            action: 'DUPLICATE_CODE',
            scannedBy: username
          }
        });
        return res.json({
          success: false,
          action: 'DUPLICATE_CODE',
          message: 'Trùng mã tài sản hoặc số serial',
          items,
          scanLogId: String(log.id)
        });
      }

      const item = items[0];
      const asset = item.asset;

      if (item.checkStatus === 'CHECKED') {
        const timeStr = item.checkedAt ? new Date(item.checkedAt).toLocaleTimeString('vi-VN') : '';
        const checkerName = item.checkedBy || 'system';
        const log = await prisma.inventoryScanLog.create({
          data: {
            assetId: item.assetId,
            assetCode: item.assetCode,
            barcode: barcode.trim(),
            inventoryCheckId: checkIdInt,
            sessionId: sessIdInt,
            action: 'ALREADY_CHECKED',
            scannedBy: username
          }
        });
        return res.json({
          success: true,
          action: 'ALREADY_CHECKED',
          message: `Tài sản đã được kiểm kê lúc ${timeStr} bởi ${checkerName}`,
          item,
          asset,
          scanLogId: String(log.id)
        });
      }

      const bookCity = asset?.cityName || null;
      const bookLocation = item.expectedLocation || asset?.locationName || null;
      const bookProject = asset?.projectName || null;
      const bookDept = asset?.departmentName || null;
      const bookUser = asset?.currentUserName || null;

      const inScope = matchesScope({
        cityName: bookCity,
        locationName: bookLocation,
        projectName: bookProject,
        departmentName: bookDept,
        currentUserName: bookUser
      });

      if (!inScope) {
        const log = await prisma.inventoryScanLog.create({
          data: {
            assetId: item.assetId,
            assetCode: item.assetCode,
            barcode: barcode.trim(),
            inventoryCheckId: checkIdInt,
            sessionId: sessIdInt,
            action: 'OUT_OF_SCOPE',
            scannedBy: username
          }
        });
        return res.json({
          success: false,
          action: 'OUT_OF_SCOPE',
          message: 'Tài sản ngoài phạm vi đang kiểm',
          item,
          asset,
          scanLogId: String(log.id)
        });
      }

      const targetLocation = scope?.location || bookLocation;
      const targetUser = scope?.user || bookUser;

      let discrepancyAction: "MATCH_AUTO_SAVED" | "NEED_REVIEW" | "MISMATCH_LOCATION" | "MISMATCH_USER" | "MISMATCH_SERIAL" = 'MATCH_AUTO_SAVED';
      let message = 'Tự động kiểm kê thành công!';

      if (asset?.status && ['DAMAGED', 'LOST', 'LIQUIDATED'].includes(asset.status)) {
        discrepancyAction = 'NEED_REVIEW';
        message = 'Tài sản bị báo hỏng hoặc mất trong sổ sách';
      } else if (bookLocation && targetLocation && bookLocation !== targetLocation) {
        discrepancyAction = 'MISMATCH_LOCATION';
        message = 'Sai lệch vị trí tài sản';
      } else if (bookUser && targetUser && bookUser !== targetUser) {
        discrepancyAction = 'MISMATCH_USER';
        message = 'Sai lệch người sử dụng';
      } else if (item.actualSerialNumber && asset?.serialNumber && item.actualSerialNumber !== asset.serialNumber) {
        discrepancyAction = 'MISMATCH_SERIAL';
        message = 'Sai lệch số serial';
      }

      if (discrepancyAction === 'MATCH_AUTO_SAVED') {
        const updated = await prisma.$transaction(async (tx) => {
          const updatedItem = await tx.inventoryItem.update({
            where: { id: item.id },
            data: {
              actualStatus: item.expectedStatus,
              actualLocation: bookLocation,
              quality: 'GOOD',
              result: 'MATCHED',
              checkStatus: 'CHECKED',
              checkedAt: new Date(),
              checkedBy: username,
              actualUserName: bookUser,
              actualSerialNumber: asset?.serialNumber || null,
              checkCondition: 'FOUND'
            }
          });

          if (item.assetId) {
            await tx.asset.update({
              where: { id: item.assetId },
              data: {
                lastInventoryDate: new Date(),
                lastInventoryStatus: 'MATCHED'
              }
            });
            await tx.auditLog.create({
              data: {
                entityType: 'ASSET',
                entityId: item.assetId,
                action: 'FAST_SCAN_CHECK',
                details: `Tự động kiểm kê (Fast Scan) khớp hoàn toàn.`,
                performedBy: username
              }
            });
          }
          return updatedItem;
        });

        const log = await prisma.inventoryScanLog.create({
          data: {
            assetId: item.assetId,
            assetCode: item.assetCode,
            barcode: barcode.trim(),
            inventoryCheckId: checkIdInt,
            sessionId: sessIdInt,
            action: 'MATCH_AUTO_SAVED',
            result: 'MATCHED',
            scannedBy: username
          }
        });

        return res.json({
          success: true,
          action: 'MATCH_AUTO_SAVED',
          message,
          item: updated,
          asset,
          scanLogId: String(log.id)
        });
      } else {
        const log = await prisma.inventoryScanLog.create({
          data: {
            assetId: item.assetId,
            assetCode: item.assetCode,
            barcode: barcode.trim(),
            inventoryCheckId: checkIdInt,
            sessionId: sessIdInt,
            action: discrepancyAction,
            scannedBy: username
          }
        });

        return res.json({
          success: true,
          action: discrepancyAction,
          message,
          item,
          asset,
          scanLogId: String(log.id)
        });
      }
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ──────────────────────────────────────────────────────────────
// BATCH PROCESS INVENTORY SCANS (CONTINUOUS SCAN MODE)
// ──────────────────────────────────────────────────────────────
router.post('/batch-scan-process', authenticateToken, async (req: any, res) => {
  const { mode, inventoryCheckId, sessionId, barcodes, scope } = req.body;
  const username = req.user?.username || 'system';

  if (!barcodes || !Array.isArray(barcodes)) {
    return res.status(400).json({ message: 'Danh sách mã quét là bắt buộc' });
  }

  // 1. Batch size limit check (Max 500)
  if (barcodes.length > 500) {
    return res.status(400).json({ message: 'Vượt quá giới hạn tối đa 500 mã/lần xử lý. Vui lòng chia nhỏ hàng đợi.' });
  }

  const checkIdInt = inventoryCheckId ? Number(inventoryCheckId) : null;
  const sessIdInt = sessionId ? Number(sessionId) : null;
  
  // Generate UUID batchId
  const batchId = crypto.randomUUID();

  // Stats Counters
  const totalScanned = barcodes.length;
  // Deduplicate locally
  const uniqueBarcodesList = Array.from(new Set(barcodes.map(b => b.trim()).filter(Boolean)));
  const uniqueBarcodes = uniqueBarcodesList.length;
  const duplicatedInBatch = totalScanned - uniqueBarcodes;

  let autoSaved = 0;
  let needReview = 0;
  let alreadyChecked = 0;
  let outOfScope = 0;
  let outOfBook = 0;
  let failed = 0;

  // Detailed lists returned to frontend
  const autoSavedItems: any[] = [];
  const reviewItems: any[] = [];
  const alreadyCheckedItems: any[] = [];
  const outOfBookItems: any[] = [];
  const failedItems: any[] = [];

  const matchesScope = (assetBookValues: {
    cityName?: string | null;
    locationName?: string | null;
    projectName?: string | null;
    departmentName?: string | null;
    currentUserName?: string | null;
  }) => {
    if (!scope || !scope.isScopeLocked) return true;
    if (scope.city && assetBookValues.cityName !== scope.city) return false;
    if (scope.location && assetBookValues.locationName !== scope.location) return false;
    if (scope.project && assetBookValues.projectName !== scope.project) return false;
    if (scope.department && assetBookValues.departmentName !== scope.department) return false;
    if (scope.user && assetBookValues.currentUserName !== scope.user) return false;
    return true;
  };

  const firstValue = (...values: any[]) => {
    const value = values.find(v => v !== null && v !== undefined && String(v).trim() !== '');
    return value === undefined ? 'N/A' : value;
  };

  const buildSessionBatchItem = (detail: any, asset: any, barcode: string, extra: any = {}) => ({
    id: detail.id,
    assetId: detail.assetId,
    barcode,
    assetName: asset?.assetName || detail.assetName || 'Tài sản',
    expectedLocation: firstValue(detail.bookLocationName, asset?.locationName, 'Trong kho'),
    expectedUser: firstValue(detail.bookUserName, asset?.currentUserName),
    expectedStatus: firstValue(asset?.status, 'IN_STOCK'),
    expectedSerial: firstValue(detail.serialNumber, asset?.serialNumber),
    expectedDepartment: firstValue(detail.bookDepartmentName, asset?.departmentName),
    expectedProject: firstValue(detail.session?.projectName, asset?.projectName),
    actualLocation: detail.actualLocationName || '',
    actualUser: detail.actualUserName || '',
    actualDepartment: detail.actualDepartmentName || '',
    actualProject: detail.actualProjectName || '',
    actualStatus: detail.resultStatus || '',
    actualSerial: detail.serialNumber || asset?.serialNumber || '',
    checkStatus: detail.checkStatus || 'PENDING',
    checkedAt: detail.checkedAt,
    checkedBy: detail.checkedBy || '',
    resultStatus: detail.resultStatus,
    batchId: detail.batchId,
    outOfBookStatus: detail.outOfBookStatus,
    ...extra
  });

  const buildCheckBatchItem = (item: any, asset: any, barcode: string, extra: any = {}) => ({
    id: item.id,
    assetId: item.assetId,
    barcode,
    assetName: asset?.assetName || 'Tài sản',
    expectedLocation: firstValue(item.expectedLocation, asset?.locationName, 'Trong kho'),
    expectedUser: firstValue(asset?.currentUserName),
    expectedStatus: firstValue(item.expectedStatus, asset?.status, 'IN_STOCK'),
    expectedSerial: firstValue(asset?.serialNumber),
    expectedDepartment: firstValue(asset?.departmentName),
    expectedProject: firstValue(asset?.projectName),
    actualLocation: item.actualLocation || '',
    actualUser: item.actualUserName || '',
    actualDepartment: item.actualDepartment || '',
    actualProject: item.actualProject || '',
    actualStatus: item.actualStatus || '',
    actualSerial: item.actualSerialNumber || '',
    checkStatus: item.checkStatus || 'PENDING',
    checkedAt: item.checkedAt,
    checkedBy: item.checkedBy || '',
    resultStatus: item.result || item.resultStatus,
    batchId: item.batchId,
    outOfBookStatus: item.outOfBookStatus,
    ...extra
  });

  // Process barcodes individually
  for (const barcode of uniqueBarcodesList) {
    try {
      // Find asset by code or serial
      const asset = await prisma.asset.findFirst({
        where: {
          OR: [
            { assetCode: barcode },
            { serialNumber: barcode }
          ],
          isDeleted: false
        }
      });

      // 1. Out of Book (Asset not found)
      if (!asset) {
        // Create DiscoveredAsset if not exists
        const existsDiscovered = await prisma.discoveredAsset.findFirst({
          where: {
            tempCode: barcode,
            inventoryCheckId: checkIdInt || 0
          }
        });

        if (!existsDiscovered && checkIdInt) {
          const dbUser = await prisma.user.findUnique({ where: { username } });
          if (dbUser) {
            await prisma.discoveredAsset.create({
              data: {
                tempCode: barcode,
                name: `Tài sản chưa rõ tên (${barcode})`,
                note: 'Tự động tạo từ phiên quét liên tục',
                inventoryCheckId: checkIdInt,
                createdById: dbUser.id
              }
            });
          }
        }

        await prisma.inventoryScanLog.create({
          data: {
            barcode,
            inventoryCheckId: checkIdInt,
            sessionId: sessIdInt,
            action: 'SCANNED_PENDING_REVIEW',
            result: 'OUT_OF_BOOK',
            scannedBy: username,
            batchId
          }
        });

        outOfBook++;
        outOfBookItems.push({ barcode, assetName: 'Tài sản ngoài sổ', status: 'NOT_FOUND' });
        continue;
      }

      // 2. Mode SESSION
      if (mode === 'SESSION') {
        const details = await prisma.inventoryDetail.findMany({
          where: {
            sessionId: sessIdInt!,
            OR: [
              { assetCode: barcode },
              { serialNumber: barcode },
              { asset: { serialNumber: barcode } }
            ]
          },
          include: { asset: true, session: true }
        });

        if (details.length === 0) {
          await prisma.inventoryScanLog.create({
            data: {
              assetId: asset.id,
              assetCode: asset.assetCode,
              barcode,
              inventoryCheckId: checkIdInt,
              sessionId: sessIdInt,
              action: 'SCANNED_PENDING_REVIEW',
              result: 'OUT_OF_SCOPE',
              reason: 'Không thuộc danh mục kiểm kê của phiên này',
              scannedBy: username,
              batchId
            }
          });
          outOfScope++;
          failedItems.push({ barcode, assetName: asset.assetName, reason: 'Không thuộc danh mục kiểm kê của phiên này' });
          continue;
        }

        if (details.length > 1) {
          await prisma.inventoryScanLog.create({
            data: {
              assetId: asset.id,
              assetCode: asset.assetCode,
              barcode,
              inventoryCheckId: checkIdInt,
              sessionId: sessIdInt,
              action: 'SCANNED_PENDING_REVIEW',
              result: 'NEED_REVIEW',
              reason: 'Trùng mã tài sản trong danh sách kiểm kê',
              scannedBy: username,
              batchId
            }
          });
          needReview++;
          reviewItems.push({ barcode, assetName: asset.assetName, reason: 'Trùng mã tài sản trong danh sách kiểm kê' });
          continue;
        }

        const detail = details[0];

        // Already Checked
        if (detail.checkedAt) {
          await prisma.inventoryScanLog.create({
            data: {
              assetId: detail.assetId,
              assetCode: detail.assetCode,
              barcode,
              inventoryCheckId: checkIdInt,
              sessionId: sessIdInt,
              action: 'SCANNED_PENDING_REVIEW',
              result: 'ALREADY_CHECKED',
              scannedBy: username,
              batchId
            }
          });
          alreadyChecked++;
          alreadyCheckedItems.push(buildSessionBatchItem(detail, asset, barcode, { checkStatus: 'CHECKED', checkedAt: detail.checkedAt }));
          continue;
        }

        const bookCity = asset.cityName || null;
        const bookLocation = detail.bookLocationName || asset.locationName || null;
        const bookProject = asset.projectName || null;
        const bookDept = detail.bookDepartmentName || asset.departmentName || null;
        const bookUser = detail.bookUserName || asset.currentUserName || null;

        const inScope = matchesScope({
          cityName: bookCity,
          locationName: bookLocation,
          projectName: bookProject,
          departmentName: bookDept,
          currentUserName: bookUser
        });

        if (!inScope) {
          await prisma.inventoryScanLog.create({
            data: {
              assetId: detail.assetId,
              assetCode: detail.assetCode,
              barcode,
              inventoryCheckId: checkIdInt,
              sessionId: sessIdInt,
              action: 'SCANNED_PENDING_REVIEW',
              result: 'OUT_OF_SCOPE',
              reason: 'Ngoài phạm vi được khóa bộ lọc',
              scannedBy: username,
              batchId
            }
          });
          outOfScope++;
          failedItems.push({ barcode, assetName: asset.assetName, reason: 'Ngoài phạm vi được khóa bộ lọc' });
          continue;
        }

        const targetLocation = scope?.location || bookLocation;
        const targetUser = scope?.user || bookUser;

        let discrepancyAction: "MATCH_AUTO_SAVED" | "NEED_REVIEW" | "MISMATCH_LOCATION" | "MISMATCH_USER" | "MISMATCH_SERIAL" = 'MATCH_AUTO_SAVED';
        if (asset.status && ['DAMAGED', 'LOST', 'LIQUIDATED'].includes(asset.status)) {
          discrepancyAction = 'NEED_REVIEW';
        } else if (bookLocation && targetLocation && bookLocation !== targetLocation) {
          discrepancyAction = 'MISMATCH_LOCATION';
        } else if (bookUser && targetUser && bookUser !== targetUser) {
          discrepancyAction = 'MISMATCH_USER';
        } else if (detail.serialNumber && asset.serialNumber && detail.serialNumber !== asset.serialNumber) {
          discrepancyAction = 'MISMATCH_SERIAL';
        }

        if (discrepancyAction === 'MATCH_AUTO_SAVED') {
          await prisma.inventoryScanLog.create({
            data: {
              assetId: detail.assetId,
              assetCode: detail.assetCode,
              barcode,
              inventoryCheckId: checkIdInt,
              sessionId: sessIdInt,
              action: 'SCANNED_PENDING_REVIEW',
              result: 'MATCH_PENDING_CONFIRM',
              scannedBy: username,
              batchId
            }
          });

          await prisma.inventoryDetail.update({
            where: { id: detail.id },
            data: {
              batchId,
              checkStatus: 'MATCH_PENDING_CONFIRM',
              resultStatus: 'MATCH'
            }
          });

          autoSaved++;
          autoSavedItems.push(buildSessionBatchItem(detail, asset, barcode, { checkStatus: 'MATCH_PENDING_CONFIRM', resultStatus: 'MATCH' }));
        } else {
          await prisma.inventoryScanLog.create({
            data: {
              assetId: detail.assetId,
              assetCode: detail.assetCode,
              barcode,
              inventoryCheckId: checkIdInt,
              sessionId: sessIdInt,
              action: 'SCANNED_PENDING_REVIEW',
              result: 'NEED_REVIEW',
              reason: discrepancyAction,
              scannedBy: username,
              batchId
            }
          });

          let dbResultStatus = 'NEED_REVIEW';
          if (discrepancyAction === 'MISMATCH_LOCATION') dbResultStatus = 'WRONG_LOCATION';
          else if (discrepancyAction === 'MISMATCH_USER') dbResultStatus = 'WRONG_USER';

          await prisma.inventoryDetail.update({
            where: { id: detail.id },
            data: {
              batchId,
              checkStatus: 'NEED_REVIEW',
              resultStatus: dbResultStatus
            }
          });

          needReview++;
          reviewItems.push(buildSessionBatchItem(detail, asset, barcode, { reason: discrepancyAction, checkStatus: 'NEED_REVIEW', resultStatus: dbResultStatus }));
        }
      } 
      // 3. Mode CHECK (Main inventory campaign)
      else {
        const items = await prisma.inventoryItem.findMany({
          where: {
            inventoryCheckId: checkIdInt!,
            OR: [
              { assetCode: barcode },
              { asset: { serialNumber: barcode } }
            ]
          },
          include: { asset: true }
        });

        if (items.length === 0) {
          await prisma.inventoryScanLog.create({
            data: {
              assetId: asset.id,
              assetCode: asset.assetCode,
              barcode,
              inventoryCheckId: checkIdInt,
              sessionId: sessIdInt,
              action: 'SCANNED_PENDING_REVIEW',
              result: 'OUT_OF_SCOPE',
              reason: 'Không thuộc danh mục kiểm kê của kỳ này',
              scannedBy: username,
              batchId
            }
          });
          outOfScope++;
          failedItems.push({ barcode, assetName: asset.assetName, reason: 'Không thuộc danh mục kiểm kê của kỳ này' });
          continue;
        }

        if (items.length > 1) {
          await prisma.inventoryScanLog.create({
            data: {
              assetId: asset.id,
              assetCode: asset.assetCode,
              barcode,
              inventoryCheckId: checkIdInt,
              sessionId: sessIdInt,
              action: 'SCANNED_PENDING_REVIEW',
              result: 'NEED_REVIEW',
              reason: 'Trùng mã tài sản',
              scannedBy: username,
              batchId
            }
          });
          needReview++;
          reviewItems.push({ barcode, assetName: asset.assetName, reason: 'Trùng mã tài sản' });
          continue;
        }

        const item = items[0];

        // Already Checked
        if (item.checkStatus === 'CHECKED') {
          await prisma.inventoryScanLog.create({
            data: {
              assetId: item.assetId,
              assetCode: item.assetCode,
              barcode,
              inventoryCheckId: checkIdInt,
              sessionId: sessIdInt,
              action: 'SCANNED_PENDING_REVIEW',
              result: 'ALREADY_CHECKED',
              scannedBy: username,
              batchId
            }
          });
          alreadyChecked++;
          alreadyCheckedItems.push(buildCheckBatchItem(item, asset, barcode, { checkStatus: 'CHECKED', checkedAt: item.checkedAt, checkedBy: item.checkedBy }));
          continue;
        }

        const bookCity = asset.cityName || null;
        const bookLocation = item.expectedLocation || asset.locationName || null;
        const bookProject = asset.projectName || null;
        const bookDept = asset.departmentName || null;
        const bookUser = asset.currentUserName || null;

        const inScope = matchesScope({
          cityName: bookCity,
          locationName: bookLocation,
          projectName: bookProject,
          departmentName: bookDept,
          currentUserName: bookUser
        });

        if (!inScope) {
          await prisma.inventoryScanLog.create({
            data: {
              assetId: item.assetId,
              assetCode: item.assetCode,
              barcode,
              inventoryCheckId: checkIdInt,
              sessionId: sessIdInt,
              action: 'SCANNED_PENDING_REVIEW',
              result: 'OUT_OF_SCOPE',
              reason: 'Ngoài phạm vi được khóa bộ lọc',
              scannedBy: username,
              batchId
            }
          });
          outOfScope++;
          failedItems.push({ barcode, assetName: asset.assetName, reason: 'Ngoài phạm vi được khóa bộ lọc' });
          continue;
        }

        const targetLocation = scope?.location || bookLocation;
        const targetUser = scope?.user || bookUser;

        let discrepancyAction: "MATCH_AUTO_SAVED" | "NEED_REVIEW" | "MISMATCH_LOCATION" | "MISMATCH_USER" | "MISMATCH_SERIAL" = 'MATCH_AUTO_SAVED';
        if (asset.status && ['DAMAGED', 'LOST', 'LIQUIDATED'].includes(asset.status)) {
          discrepancyAction = 'NEED_REVIEW';
        } else if (bookLocation && targetLocation && bookLocation !== targetLocation) {
          discrepancyAction = 'MISMATCH_LOCATION';
        } else if (bookUser && targetUser && bookUser !== targetUser) {
          discrepancyAction = 'MISMATCH_USER';
        } else if (item.actualSerialNumber && asset.serialNumber && item.actualSerialNumber !== asset.serialNumber) {
          discrepancyAction = 'MISMATCH_SERIAL';
        }

        if (discrepancyAction === 'MATCH_AUTO_SAVED') {
          await prisma.inventoryScanLog.create({
            data: {
              assetId: item.assetId,
              assetCode: item.assetCode,
              barcode,
              inventoryCheckId: checkIdInt,
              sessionId: sessIdInt,
              action: 'SCANNED_PENDING_REVIEW',
              result: 'MATCH_PENDING_CONFIRM',
              scannedBy: username,
              batchId
            }
          });

          await prisma.inventoryItem.update({
            where: { id: item.id },
            data: {
              batchId,
              checkStatus: 'MATCH_PENDING_CONFIRM',
              result: 'MATCHED',
              resultStatus: 'MATCH'
            }
          });

          autoSaved++;
          autoSavedItems.push(buildCheckBatchItem(item, asset, barcode, { checkStatus: 'MATCH_PENDING_CONFIRM', resultStatus: 'MATCH' }));
        } else {
          await prisma.inventoryScanLog.create({
            data: {
              assetId: item.assetId,
              assetCode: item.assetCode,
              barcode,
              inventoryCheckId: checkIdInt,
              sessionId: sessIdInt,
              action: 'SCANNED_PENDING_REVIEW',
              result: 'NEED_REVIEW',
              reason: discrepancyAction,
              scannedBy: username,
              batchId
            }
          });

          let dbResultStatus = 'NEED_REVIEW';
          if (discrepancyAction === 'MISMATCH_LOCATION') dbResultStatus = 'WRONG_LOCATION';
          else if (discrepancyAction === 'MISMATCH_USER') dbResultStatus = 'WRONG_USER';

          await prisma.inventoryItem.update({
            where: { id: item.id },
            data: {
              batchId,
              checkStatus: 'NEED_REVIEW',
              result: dbResultStatus,
              resultStatus: dbResultStatus
            }
          });

          needReview++;
          reviewItems.push(buildCheckBatchItem(item, asset, barcode, { reason: discrepancyAction, checkStatus: 'NEED_REVIEW', resultStatus: dbResultStatus }));
        }
      }
    } catch (itemErr: any) {
      console.error(`Lỗi xử lý barcode ${barcode}:`, itemErr);
      failed++;
      failedItems.push({ barcode, assetName: 'Mã lỗi xử lý', reason: itemErr.message || 'Lỗi hệ thống' });
      
      await prisma.inventoryScanLog.create({
        data: {
          barcode,
          inventoryCheckId: checkIdInt,
          sessionId: sessIdInt,
          action: 'FAILED',
          result: 'FAILED',
          reason: itemErr.message || 'Lỗi hệ thống',
          scannedBy: username,
          batchId
        }
      });
    }
  }

  // Create BatchScanJob
  let jobStatus = 'COMPLETED';
  if (failed > 0 && autoSaved === 0 && needReview === 0) {
    jobStatus = 'FAILED';
  }

  try {
    await prisma.batchScanJob.create({
      data: {
        inventoryCheckId: checkIdInt,
        sessionId: sessIdInt,
        batchId,
        totalScanned,
        processedCount: uniqueBarcodes,
        successCount: autoSaved,
        reviewCount: needReview,
        outOfBookCount: outOfBook,
        failedCount: failed,
        status: jobStatus,
        createdBy: username
      }
    });
  } catch (jobErr) {
    console.error('Lỗi khi lưu BatchScanJob:', jobErr);
  }

  res.json({
    success: true,
    batchId,
    summary: {
      totalScanned,
      uniqueBarcodes,
      duplicatedInBatch,
      autoSaved,
      needReview,
      alreadyChecked,
      outOfScope,
      outOfBook,
      failed
    },
    autoSavedItems,
    reviewItems,
    alreadyCheckedItems,
    outOfBookItems,
    failedItems
  });
});

// ──────────────────────────────────────────────────────────────
// GET PENDING BATCHES (RECONSTRUCT FROM DATABASE LOGS)
// ──────────────────────────────────────────────────────────────
router.get('/pending-batches', authenticateToken, async (req: any, res) => {
  const { inventoryCheckId, sessionId } = req.query;
  const checkIdInt = inventoryCheckId ? Number(inventoryCheckId) : null;
  const sessIdInt = sessionId ? Number(sessionId) : null;

  try {
    const where: any = { action: 'SCANNED_PENDING_REVIEW' };
    if (checkIdInt) where.inventoryCheckId = checkIdInt;
    if (sessIdInt) where.sessionId = sessIdInt;

    const logs = await prisma.inventoryScanLog.findMany({
      where,
      orderBy: { scannedAt: 'asc' }
    });

    const batchesMap: { [batchId: string]: any } = {};

    for (const log of logs) {
      const bId = log.batchId || 'UNTRACKED';
      if (!batchesMap[bId]) {
        batchesMap[bId] = {
          batchId: bId,
          createdAt: log.scannedAt,
          totalCount: 0,
          barcodes: []
        };
      }
      batchesMap[bId].barcodes.push(log);
      batchesMap[bId].totalCount++;
    }

    const resultBatches = [];

    for (const batchId of Object.keys(batchesMap)) {
      const batchInfo = batchesMap[batchId];
      const matchPendingItems: any[] = [];
      const reviewItems: any[] = [];
      const alreadyCheckedItems: any[] = [];
      const outOfBookItems: any[] = [];
      const failedItems: any[] = [];

      for (const log of batchInfo.barcodes) {
        const barcode = log.barcode;
        const groupType = log.result;

        if (groupType === 'OUT_OF_BOOK') {
          outOfBookItems.push({ barcode, assetName: 'Tài sản ngoài sổ', status: 'NOT_FOUND', outOfBookStatus: 'PENDING' });
          continue;
        }
        if (groupType === 'OUT_OF_BOOK_IGNORED') {
          // Hide from review items as per requirement!
          continue;
        }
        if (groupType === 'OUT_OF_BOOK_REGISTERED') {
          outOfBookItems.push({ barcode, assetName: 'Tài sản ngoài sổ (Đã đăng ký)', status: 'REGISTERED', outOfBookStatus: 'REGISTERED' });
          continue;
        }

        if (sessIdInt) {
          const detail = await prisma.inventoryDetail.findFirst({
            where: {
              sessionId: sessIdInt,
              OR: [
                { assetCode: barcode },
                { serialNumber: barcode },
                { asset: { serialNumber: barcode } }
              ]
            },
            include: { asset: true }
          });

          if (detail) {
            const itemObj = {
              id: detail.id,
              assetId: detail.assetId,
              barcode,
              assetName: detail.asset?.assetName || detail.assetName || 'Tài sản',
              expectedLocation: detail.bookLocationName || detail.asset?.locationName || 'Trong kho',
              expectedUser: detail.bookUserName || detail.asset?.currentUserName || 'N/A',
              expectedStatus: detail.asset?.status || 'N/A',
              expectedSerial: detail.serialNumber || detail.asset?.serialNumber || 'N/A',
              expectedDepartment: detail.bookDepartmentName || detail.asset?.departmentName || 'N/A',
              expectedProject: detail.asset?.projectName || 'N/A',
              actualLocation: detail.actualLocationName || '',
              actualUser: detail.actualUserName || '',
              actualDepartment: detail.actualDepartmentName || '',
              actualProject: detail.actualProjectName || '',
              actualStatus: detail.resultStatus || '',
              checkStatus: detail.checkStatus || 'PENDING',
              checkedAt: detail.checkedAt,
              checkedBy: detail.checkedBy || '',
              resultStatus: detail.resultStatus,
              batchId: detail.batchId,
              outOfBookStatus: detail.outOfBookStatus,
              reason: log.reason,
              undoDeadline: detail.checkedAt ? new Date(new Date(detail.checkedAt).getTime() + 30 * 60000).toISOString() : null
            };

            if (detail.checkStatus === 'CHECKED') {
              alreadyCheckedItems.push(itemObj);
            } else if (detail.checkStatus === 'MATCH_PENDING_CONFIRM') {
              matchPendingItems.push(itemObj);
            } else {
              // Both NEED_REVIEW and ACTUAL_UPDATED go to reviewItems
              reviewItems.push(itemObj);
            }
          } else {
            failedItems.push({ barcode, assetName: 'Không xác định', reason: 'Không tìm thấy dòng thông tin trong phiên' });
          }
        } else if (checkIdInt) {
          const item = await prisma.inventoryItem.findFirst({
            where: {
              inventoryCheckId: checkIdInt,
              OR: [
                { assetCode: barcode },
                { asset: { serialNumber: barcode } }
              ]
            },
            include: { asset: true }
          });

          if (item) {
            const itemObj = {
              id: item.id,
              assetId: item.assetId,
              barcode,
              assetName: item.asset?.assetName || 'Tài sản',
              expectedLocation: item.expectedLocation || item.asset?.locationName || 'Trong kho',
              expectedUser: item.asset?.currentUserName || 'N/A',
              expectedStatus: item.expectedStatus || item.asset?.status || 'N/A',
              expectedSerial: item.asset?.serialNumber || 'N/A',
              expectedDepartment: item.asset?.departmentName || 'N/A',
              expectedProject: item.asset?.projectName || 'N/A',
              actualLocation: item.actualLocation || '',
              actualUser: item.actualUserName || '',
              actualDepartment: item.actualDepartment || '',
              actualProject: item.actualProject || '',
              actualStatus: item.actualStatus || '',
              actualSerial: item.actualSerialNumber || '',
              checkStatus: item.checkStatus || 'PENDING',
              checkedAt: item.checkedAt,
              checkedBy: item.checkedBy || '',
              resultStatus: item.result,
              batchId: item.batchId,
              outOfBookStatus: item.outOfBookStatus,
              reason: log.reason,
              undoDeadline: item.checkedAt ? new Date(new Date(item.checkedAt).getTime() + 30 * 60000).toISOString() : null
            };

            if (item.checkStatus === 'CHECKED') {
              alreadyCheckedItems.push(itemObj);
            } else if (item.checkStatus === 'MATCH_PENDING_CONFIRM') {
              matchPendingItems.push(itemObj);
            } else {
              // Both NEED_REVIEW and ACTUAL_UPDATED go to reviewItems
              reviewItems.push(itemObj);
            }
          } else {
            failedItems.push({ barcode, assetName: 'Không xác định', reason: 'Không tìm thấy dòng thông tin trong kỳ' });
          }
        }
      }

      resultBatches.push({
        batchId,
        createdAt: batchInfo.createdAt,
        totalCount: batchInfo.totalCount,
        groups: {
          matchPendingItems,
          reviewItems,
          alreadyCheckedItems,
          outOfBookItems,
          failedItems
        }
      });
    }

    res.json(resultBatches);
  } catch (error: any) {
    console.error('Lỗi pending-batches:', error);
    res.status(500).json({ message: error.message || 'Lỗi hệ thống' });
  }
});

// ──────────────────────────────────────────────────────────────
// POST BATCH ADJUST (ĐIỀU CHỈNH THÔNG TIN THỰC TẾ TRƯỚC KHI XÁC NHẬN)
// ──────────────────────────────────────────────────────────────
router.post('/batch-adjust', authenticateToken, async (req: any, res) => {
  const { mode, itemId, actualLocation, actualProject, actualDepartment, actualUser, actualSerial, actualStatus, condition, note } = req.body;
  const username = req.user?.username || 'system';

  if (!itemId) {
    return res.status(400).json({ message: 'itemId là bắt buộc' });
  }

  const idInt = Number(itemId);

  try {
    if (mode === 'SESSION') {
      const detail = await prisma.inventoryDetail.findUnique({
        where: { id: idInt },
        include: { asset: true }
      });

      if (!detail) {
        return res.status(404).json({ message: 'Không tìm thấy dòng chi tiết kiểm kê' });
      }

      const asset = detail.asset;
      const bookLocation = detail.bookLocationName || asset?.locationName || '';
      const bookUser = detail.bookUserName || asset?.currentUserName || '';
      const bookDept = detail.bookDepartmentName || asset?.departmentName || '';
      const bookProject = asset?.projectName || '';
      const bookSerial = detail.serialNumber || asset?.serialNumber || '';
      const bookStatus = asset?.status || 'GOOD';

      // Check if adjusted actual values match expected book values exactly
      let matchesExpected = true;
      if ((actualLocation || '') !== bookLocation) matchesExpected = false;
      if ((actualUser || '') !== bookUser) matchesExpected = false;
      if ((actualDepartment || '') !== bookDept) matchesExpected = false;
      if ((actualProject || '') !== bookProject) matchesExpected = false;
      if ((actualSerial || '') !== bookSerial) matchesExpected = false;
      if ((actualStatus || '') !== bookStatus) matchesExpected = false;
      if (condition === 'DAMAGED' || condition === 'LOST') matchesExpected = false;

      const newStatus = matchesExpected ? 'MATCH_PENDING_CONFIRM' : 'ACTUAL_UPDATED';
      const resultStatus = matchesExpected ? 'MATCH' : 'MISMATCH';

      // Record logs details
      const oldVals = `Vị trí: ${detail.actualLocationName || ''}, Người: ${detail.actualUserName || ''}, PB: ${detail.actualDepartmentName || ''}, DA: ${detail.actualProjectName || ''}, Serial: ${detail.serialNumber || ''}, TT: ${detail.resultStatus || ''}`;
      const newVals = `Vị trí: ${actualLocation || ''}, Người: ${actualUser || ''}, PB: ${actualDepartment || ''}, DA: ${actualProject || ''}, Serial: ${actualSerial || ''}, TT: ${actualStatus || ''}`;

      await prisma.inventoryDetail.update({
        where: { id: idInt },
        data: {
          actualLocationName: actualLocation || '',
          actualUserName: actualUser || '',
          actualDepartmentName: actualDepartment || '',
          actualProjectName: actualProject || '',
          resultStatus: actualStatus || resultStatus,
          checkStatus: newStatus,
          note: note || ''
        }
      });

      await prisma.inventoryScanLog.create({
        data: {
          assetId: detail.assetId,
          assetCode: detail.assetCode,
          barcode: detail.assetCode || '',
          inventoryCheckId: null,
          sessionId: detail.sessionId,
          action: 'ADJUST_ACTUAL',
          result: newStatus,
          reason: `Thay đổi thực tế. Trước: [${oldVals}] -> Sau: [${newVals}]`,
          scannedBy: username,
          batchId: detail.batchId
        }
      });

      res.json({ success: true, checkStatus: newStatus });
    } else {
      // CHECK mode
      const item = await prisma.inventoryItem.findUnique({
        where: { id: idInt },
        include: { asset: true }
      });

      if (!item) {
        return res.status(404).json({ message: 'Không tìm thấy dòng tài sản kiểm kê' });
      }

      const asset = item.asset;
      const bookLocation = item.expectedLocation || asset?.locationName || '';
      const bookUser = asset?.currentUserName || '';
      const bookDept = asset?.departmentName || '';
      const bookProject = asset?.projectName || '';
      const bookSerial = asset?.serialNumber || '';
      const bookStatus = item.expectedStatus || asset?.status || 'GOOD';

      let matchesExpected = true;
      if ((actualLocation || '') !== bookLocation) matchesExpected = false;
      if ((actualUser || '') !== bookUser) matchesExpected = false;
      if ((actualDepartment || '') !== bookDept) matchesExpected = false;
      if ((actualProject || '') !== bookProject) matchesExpected = false;
      if ((actualSerial || '') !== bookSerial) matchesExpected = false;
      if ((actualStatus || '') !== bookStatus) matchesExpected = false;
      if (condition === 'DAMAGED' || condition === 'LOST') matchesExpected = false;

      const newStatus = matchesExpected ? 'MATCH_PENDING_CONFIRM' : 'ACTUAL_UPDATED';
      const result = matchesExpected ? 'MATCHED' : 'NEED_REVIEW';

      const oldVals = `Vị trí: ${item.actualLocation || ''}, Người: ${item.actualUserName || ''}, PB: ${item.actualDepartment || ''}, DA: ${item.actualProject || ''}, Serial: ${item.actualSerialNumber || ''}, TT: ${item.actualStatus || ''}`;
      const newVals = `Vị trí: ${actualLocation || ''}, Người: ${actualUser || ''}, PB: ${actualDepartment || ''}, DA: ${actualProject || ''}, Serial: ${actualSerial || ''}, TT: ${actualStatus || ''}`;

      await prisma.inventoryItem.update({
        where: { id: idInt },
        data: {
          actualLocation: actualLocation || '',
          actualUserName: actualUser || '',
          actualDepartment: actualDepartment || '',
          actualProject: actualProject || '',
          actualStatus: actualStatus || '',
          checkStatus: newStatus,
          result: result,
          resultStatus: result,
          checkCondition: condition || 'FOUND',
          actualSerialNumber: actualSerial || '',
          note: note || ''
        }
      });

      await prisma.inventoryScanLog.create({
        data: {
          assetId: item.assetId,
          assetCode: item.assetCode,
          barcode: item.assetCode || '',
          inventoryCheckId: item.inventoryCheckId,
          sessionId: null,
          action: 'ADJUST_ACTUAL',
          result: newStatus,
          reason: `Thay đổi thực tế. Trước: [${oldVals}] -> Sau: [${newVals}]`,
          scannedBy: username,
          batchId: item.batchId
        }
      });

      res.json({ success: true, checkStatus: newStatus });
    }
  } catch (error: any) {
    console.error('Lỗi batch-adjust:', error);
    res.status(400).json({ message: error.message || 'Lỗi điều chỉnh thực tế' });
  }
});

// ──────────────────────────────────────────────────────────────
// POST BATCH CONFIRM (XÁC NHẬN KẾT QUẢ QUÉT THEO LÔ)
// ──────────────────────────────────────────────────────────────
router.post('/batch-confirm', authenticateToken, async (req: any, res) => {
  const { mode, inventoryCheckId, sessionId, batchId, confirmedItems, confirmMatchOnly } = req.body;
  const username = req.user?.username || 'system';

  const checkIdInt = inventoryCheckId ? Number(inventoryCheckId) : null;
  const sessIdInt = sessionId ? Number(sessionId) : null;

  try {
    let itemsToConfirm: any[] = [];

    if (confirmMatchOnly) {
      const pendingLogs = await prisma.inventoryScanLog.findMany({
        where: {
          batchId,
          action: 'SCANNED_PENDING_REVIEW',
          result: 'MATCH_PENDING_CONFIRM'
        }
      });

      for (const log of pendingLogs) {
        if (sessIdInt) {
          const detail = await prisma.inventoryDetail.findFirst({
            where: {
              sessionId: sessIdInt,
              OR: [
                { assetCode: log.barcode },
                { serialNumber: log.barcode },
                { asset: { serialNumber: log.barcode } }
              ]
            },
            include: { asset: true }
          });
          if (detail && detail.checkStatus !== 'CHECKED') {
            itemsToConfirm.push({
              id: detail.id,
              assetCode: detail.assetCode,
              actualLocation: detail.bookLocationName || detail.asset?.locationName || 'Trong kho',
              actualUser: detail.bookUserName || detail.asset?.currentUserName || 'N/A',
              actualDepartment: detail.bookDepartmentName || detail.asset?.departmentName || '',
              actualProject: detail.asset?.projectName || '',
              actualStatus: detail.asset?.status || 'GOOD',
              quality: 'GOOD',
              checkCondition: 'FOUND',
              assetId: detail.assetId,
              serial: detail.serialNumber || detail.asset?.serialNumber || ''
            });
          }
        } else if (checkIdInt) {
          const item = await prisma.inventoryItem.findFirst({
            where: {
              inventoryCheckId: checkIdInt,
              OR: [
                { assetCode: log.barcode },
                { asset: { serialNumber: log.barcode } }
              ]
            },
            include: { asset: true }
          });
          if (item && item.checkStatus !== 'CHECKED') {
            itemsToConfirm.push({
              id: item.id,
              assetCode: item.assetCode,
              actualLocation: item.expectedLocation || item.asset?.locationName || 'Trong kho',
              actualUser: item.asset?.currentUserName || 'N/A',
              actualDepartment: item.asset?.departmentName || '',
              actualProject: item.asset?.projectName || '',
              actualStatus: item.expectedStatus || item.asset?.status || 'GOOD',
              quality: 'GOOD',
              checkCondition: 'FOUND',
              assetId: item.assetId,
              serial: item.actualSerialNumber || item.asset?.serialNumber || ''
            });
          }
        }
      }
    } else {
      if (!confirmedItems || !Array.isArray(confirmedItems)) {
        return res.status(400).json({ message: 'Danh sách xác nhận là bắt buộc' });
      }
      itemsToConfirm = confirmedItems;
    }

    const responseConfirmedList: { itemId: number; checkedAt: Date; confirmedAt: Date; undoDeadline: string }[] = [];

    await prisma.$transaction(async (tx) => {
      for (const itemConf of itemsToConfirm) {
        const itemId = Number(itemConf.id);

        if (sessIdInt) {
          const detail = await tx.inventoryDetail.findUnique({
            where: { id: itemId },
            include: { asset: true }
          });

          if (!detail) {
            throw new Error(`Không tìm thấy dòng chi tiết kiểm kê ID: ${itemId}`);
          }

          if (!detail.assetId) {
            throw new Error(`Tài sản ngoài sổ (không có liên kết gốc) không được phép xác nhận kiểm kê trực tiếp.`);
          }

          const isOverride = detail.checkStatus === 'CHECKED';
          const confirmedAt = new Date();

          const asset = detail.asset!;
          const bookLocation = detail.bookLocationName || asset.locationName || '';
          const bookUser = detail.bookUserName || asset.currentUserName || '';
          const bookDept = detail.bookDepartmentName || asset.departmentName || '';
          const bookProject = asset.projectName || '';
          const bookSerial = detail.serialNumber || asset.serialNumber || '';
          const bookStatus = asset.status || 'GOOD';

          const actualLoc = itemConf.actualLocation !== undefined ? itemConf.actualLocation : (detail.actualLocationName || bookLocation);
          const actualUsr = itemConf.actualUser !== undefined ? itemConf.actualUser : (detail.actualUserName || bookUser);
          const actualDep = itemConf.actualDepartment !== undefined ? itemConf.actualDepartment : (detail.actualDepartmentName || bookDept);
          const actualProj = itemConf.actualProject !== undefined ? itemConf.actualProject : (detail.actualProjectName || bookProject);
          const actualSer = itemConf.serial !== undefined ? itemConf.serial : (detail.serialNumber || bookSerial);
          const actualStat = itemConf.actualStatus !== undefined ? itemConf.actualStatus : (detail.resultStatus || bookStatus);

          let matchesExpected = true;
          if (actualLoc !== bookLocation) matchesExpected = false;
          if (actualUsr !== bookUser) matchesExpected = false;
          if (actualDep !== bookDept) matchesExpected = false;
          if (actualProj !== bookProject) matchesExpected = false;
          if (actualSer !== bookSerial) matchesExpected = false;
          if (actualStat !== bookStatus) matchesExpected = false;
          if (itemConf.quality === 'DAMAGED' || itemConf.quality === 'LOST') matchesExpected = false;

          const resultStatus = matchesExpected ? 'MATCH' : 'MISMATCH';
          const confirmAction = isOverride ? 'OVERRIDE_CHECKED' : (confirmMatchOnly ? 'BULK_CONFIRM' : 'CONFIRM');

          await tx.inventoryDetail.update({
            where: { id: itemId },
            data: {
              actualLocationName: actualLoc,
              actualUserName: actualUsr,
              actualDepartmentName: actualDep,
              actualProjectName: actualProj,
              note: itemConf.note || detail.note || '',
              resultStatus: actualStat || resultStatus,
              checkStatus: 'CHECKED',
              checkedAt: confirmedAt,
              checkedBy: username,
              batchId: batchId || detail.batchId
            }
          });

          await tx.asset.update({
            where: { id: detail.assetId },
            data: {
              lastInventoryDate: confirmedAt,
              lastInventoryStatus: resultStatus
            }
          });

          await tx.auditLog.create({
            data: {
              entityType: 'ASSET',
              entityId: detail.assetId,
              action: confirmAction,
              details: `Xác nhận kiểm kê lô ${batchId}. Trạng thái: ${resultStatus}. Thực tế: Vị trí [${actualLoc}], Người [${actualUsr}], PB [${actualDep}], DA [${actualProj}], Serial [${actualSer}], TT [${actualStat}]`,
              performedBy: username
            }
          });

          await tx.inventoryScanLog.create({
            data: {
              assetId: detail.assetId,
              assetCode: detail.assetCode,
              barcode: detail.assetCode || '',
              inventoryCheckId: checkIdInt,
              sessionId: sessIdInt,
              action: confirmAction,
              result: resultStatus === 'MATCH' ? 'MATCHED' : 'MISMATCH',
              reason: `Xác nhận thực tế. Vị trí [${actualLoc}], Người [${actualUsr}], PB [${actualDep}], DA [${actualProj}], Serial [${actualSer}], TT [${actualStat}]`,
              scannedBy: username,
              batchId: batchId || detail.batchId
            }
          });

          responseConfirmedList.push({
            itemId,
            checkedAt: confirmedAt,
            confirmedAt,
            undoDeadline: new Date(confirmedAt.getTime() + 30 * 60000).toISOString()
          });

        } else if (checkIdInt) {
          const item = await tx.inventoryItem.findUnique({
            where: { id: itemId },
            include: { asset: true }
          });

          if (!item) {
            throw new Error(`Không tìm thấy dòng tài sản kiểm kê ID: ${itemId}`);
          }

          if (!item.assetId) {
            throw new Error(`Tài sản ngoài sổ không được phép xác nhận kiểm kê trực tiếp.`);
          }

          const isOverride = item.checkStatus === 'CHECKED';
          const confirmedAt = new Date();

          const asset = item.asset!;
          const bookLocation = item.expectedLocation || asset.locationName || '';
          const bookUser = asset.currentUserName || '';
          const bookDept = asset.departmentName || '';
          const bookProject = asset.projectName || '';
          const bookSerial = asset.serialNumber || '';
          const bookStatus = item.expectedStatus || asset.status || 'GOOD';

          const actualLoc = itemConf.actualLocation !== undefined ? itemConf.actualLocation : (item.actualLocation || bookLocation);
          const actualUsr = itemConf.actualUser !== undefined ? itemConf.actualUser : (item.actualUserName || bookUser);
          const actualDep = itemConf.actualDepartment !== undefined ? itemConf.actualDepartment : (item.actualDepartment || bookDept);
          const actualProj = itemConf.actualProject !== undefined ? itemConf.actualProject : (item.actualProject || bookProject);
          const actualSer = itemConf.serial !== undefined ? itemConf.serial : (item.actualSerialNumber || bookSerial);
          const actualStat = itemConf.actualStatus !== undefined ? itemConf.actualStatus : (item.actualStatus || bookStatus);
          const quality = itemConf.quality || item.quality || 'GOOD';

          let matchesExpected = true;
          if (actualLoc !== bookLocation) matchesExpected = false;
          if (actualUsr !== bookUser) matchesExpected = false;
          if (actualDep !== bookDept) matchesExpected = false;
          if (actualProj !== bookProject) matchesExpected = false;
          if (actualSer !== bookSerial) matchesExpected = false;
          if (actualStat !== bookStatus) matchesExpected = false;
          if (quality === 'DAMAGED' || actualStat === 'LOST') matchesExpected = false;

          let result: 'MATCHED' | 'MISSING' | 'DAMAGED' | 'WRONG_LOCATION' | 'WRONG_STATUS' | 'WRONG_USER' = 'MATCHED';
          if (itemConf.checkCondition === 'MISSING' || actualStat === 'LOST') {
            result = 'MISSING';
          } else if (quality === 'DAMAGED' || actualStat === 'DAMAGED') {
            result = 'DAMAGED';
          } else if (actualLoc !== bookLocation) {
            result = 'WRONG_LOCATION';
          } else if (actualStat !== bookStatus) {
            result = 'WRONG_STATUS';
          } else if (actualUsr !== bookUser) {
            result = 'WRONG_USER';
          }

          const confirmAction = isOverride ? 'OVERRIDE_CHECKED' : (confirmMatchOnly ? 'BULK_CONFIRM' : 'CONFIRM');

          await tx.inventoryItem.update({
            where: { id: itemId },
            data: {
              actualLocation: actualLoc,
              actualUserName: actualUsr,
              actualDepartment: actualDep,
              actualProject: actualProj,
              actualStatus: actualStat,
              quality: quality,
              note: itemConf.note || item.note || '',
              checkStatus: 'CHECKED',
              checkedAt: confirmedAt,
              checkedBy: username,
              result,
              resultStatus: result,
              checkCondition: itemConf.checkCondition || item.checkCondition || 'FOUND',
              actualSerialNumber: actualSer,
              batchId: batchId || item.batchId
            }
          });

          await tx.asset.update({
            where: { id: item.assetId },
            data: {
              lastInventoryDate: confirmedAt,
              lastInventoryStatus: result
            }
          });

          await tx.auditLog.create({
            data: {
              entityType: 'ASSET',
              entityId: item.assetId,
              action: confirmAction,
              details: `Xác nhận kiểm kê lô ${batchId}. Kết quả: ${result}. Thực tế: Vị trí [${actualLoc}], Người [${actualUsr}], PB [${actualDep}], DA [${actualProj}], Serial [${actualSer}], TT [${actualStat}]`,
              performedBy: username
            }
          });

          await tx.inventoryScanLog.create({
            data: {
              assetId: item.assetId,
              assetCode: item.assetCode,
              barcode: item.assetCode || '',
              inventoryCheckId: checkIdInt,
              sessionId: sessIdInt,
              action: confirmAction,
              result,
              reason: `Xác nhận thực tế. Vị trí [${actualLoc}], Người [${actualUsr}], PB [${actualDep}], DA [${actualProj}], Serial [${actualSer}], TT [${actualStat}]`,
              scannedBy: username,
              batchId: batchId || item.batchId
            }
          });

          responseConfirmedList.push({
            itemId,
            checkedAt: confirmedAt,
            confirmedAt,
            undoDeadline: new Date(confirmedAt.getTime() + 30 * 60000).toISOString()
          });
        }
      }
    });

    res.json({
      success: true,
      confirmedItems: responseConfirmedList
    });
  } catch (error: any) {
    console.error('Lỗi batch-confirm:', error);
    res.status(400).json({ message: error.message || 'Lỗi xác nhận lô quét' });
  }
});

// ──────────────────────────────────────────────────────────────
// POST BATCH SAVE ONLY (CHỈ LƯU THỰC TẾ - KHÔNG XÁC NHẬN)
// ──────────────────────────────────────────────────────────────
router.post('/batch-save', authenticateToken, async (req: any, res) => {
  const { mode, inventoryCheckId, sessionId, batchId, savedItems } = req.body;
  const username = req.user?.username || 'system';

  const checkIdInt = inventoryCheckId ? Number(inventoryCheckId) : null;
  const sessIdInt = sessionId ? Number(sessionId) : null;

  if (!savedItems || !Array.isArray(savedItems) || savedItems.length === 0) {
    return res.status(400).json({ message: 'Danh sách tài sản cần lưu là bắt buộc' });
  }

  try {
    const savedList: { itemId: number }[] = [];

    await prisma.$transaction(async (tx) => {
      for (const itemConf of savedItems) {
        const itemId = Number(itemConf.id);

        if (sessIdInt) {
          const detail = await tx.inventoryDetail.findUnique({
            where: { id: itemId },
            include: { asset: true }
          });
          if (!detail) throw new Error(`Không tìm thấy dòng chi tiết kiểm kê ID: ${itemId}`);

          await tx.inventoryDetail.update({
            where: { id: itemId },
            data: {
              actualLocationName: itemConf.actualLocation || detail.actualLocationName,
              actualUserName: itemConf.actualUser || detail.actualUserName,
              actualDepartmentName: itemConf.actualDepartment || detail.actualDepartmentName,
              actualProjectName: itemConf.actualProject || detail.actualProjectName,
              note: itemConf.note || detail.note,
              checkStatus: 'ACTUAL_UPDATED',
              batchId: batchId || detail.batchId
            }
          });

          await tx.auditLog.create({
            data: {
              entityType: 'INVENTORY_DETAIL',
              entityId: detail.id,
              action: 'ACTUAL_SAVE',
              details: `Lưu thực tế lô ${batchId}. Vị trí [${itemConf.actualLocation}], Người [${itemConf.actualUser}], PB [${itemConf.actualDepartment}], DA [${itemConf.actualProject}]`,
              performedBy: username
            }
          });

          savedList.push({ itemId });

        } else if (checkIdInt) {
          const item = await tx.inventoryItem.findUnique({
            where: { id: itemId },
            include: { asset: true }
          });
          if (!item) throw new Error(`Không tìm thấy dòng tài sản kiểm kê ID: ${itemId}`);

          await tx.inventoryItem.update({
            where: { id: itemId },
            data: {
              actualLocation: itemConf.actualLocation || item.actualLocation,
              actualUserName: itemConf.actualUser || item.actualUserName,
              actualDepartment: itemConf.actualDepartment || item.actualDepartment,
              actualProject: itemConf.actualProject || item.actualProject,
              actualStatus: itemConf.actualStatus || item.actualStatus,
              quality: itemConf.quality || item.quality,
              note: itemConf.note || item.note,
              checkStatus: 'ACTUAL_UPDATED',
              actualSerialNumber: itemConf.serial || item.actualSerialNumber,
              batchId: batchId || item.batchId
            }
          });

          await tx.auditLog.create({
            data: {
              entityType: 'INVENTORY_ITEM',
              entityId: item.id,
              action: 'ACTUAL_SAVE',
              details: `Lưu thực tế lô ${batchId}. Vị trí [${itemConf.actualLocation}], Người [${itemConf.actualUser}], PB [${itemConf.actualDepartment}], DA [${itemConf.actualProject}]`,
              performedBy: username
            }
          });

          savedList.push({ itemId });
        }
      }
    });

    res.json({ success: true, savedItems: savedList });
  } catch (error: any) {
    console.error('Lỗi batch-save:', error);
    res.status(400).json({ message: error.message || 'Lỗi lưu dữ liệu thực tế' });
  }
});

// ──────────────────────────────────────────────────────────────
// POST BATCH PROPOSE BOOK UPDATE (ĐỀ XUẤT CẬP NHẬT SỔ)
// ──────────────────────────────────────────────────────────────
router.post('/batch-propose-book-update', authenticateToken, async (req: any, res) => {
  const { inventoryCheckId, sessionId, batchId, assetId, itemId, fields } = req.body;
  // fields: Array of { fieldName, oldValue, newValue, reason }
  const username = req.user?.username || 'system';
  const checkIdInt = inventoryCheckId ? Number(inventoryCheckId) : null;
  const sessIdInt = sessionId ? Number(sessionId) : null;
  const assetIdInt = assetId ? Number(assetId) : null;

  if (!assetIdInt) {
    return res.status(400).json({ message: 'assetId là bắt buộc' });
  }
  if (!fields || !Array.isArray(fields) || fields.length === 0) {
    return res.status(400).json({ message: 'Danh sách trường đề xuất cập nhật là bắt buộc' });
  }

  try {
    // Delete any existing PENDING_APPROVAL proposals for same asset+batch to avoid duplicates
    await prisma.assetUpdateProposal.deleteMany({
      where: {
        assetId: assetIdInt,
        batchId,
        status: 'PENDING_APPROVAL'
      }
    });

    const proposals = await Promise.all(
      fields.map((field: { fieldName: string; oldValue: string; newValue: string; reason?: string }) =>
        prisma.assetUpdateProposal.create({
          data: {
            assetId: assetIdInt,
            inventoryCheckId: checkIdInt,
            sessionId: sessIdInt,
            batchId,
            fieldName: field.fieldName,
            oldValue: field.oldValue || '',
            newValue: field.newValue || '',
            reason: field.reason || 'Sai lệch phát hiện trong đợt kiểm kê lô',
            source: 'BATCH_REVIEW',
            status: 'PENDING_APPROVAL',
            createdBy: username
          }
        })
      )
    );

    await prisma.auditLog.create({
      data: {
        entityType: 'ASSET',
        entityId: assetIdInt,
        action: 'PROPOSE_BOOK_UPDATE',
        details: `Đề xuất cập nhật sổ từ lô ${batchId}. Các trường: ${fields.map((f: any) => f.fieldName).join(', ')}`,
        performedBy: username
      }
    });

    res.json({ success: true, proposals: proposals.length });
  } catch (error: any) {
    console.error('Lỗi batch-propose-book-update:', error);
    res.status(400).json({ message: error.message || 'Lỗi tạo đề xuất cập nhật sổ' });
  }
});

// ──────────────────────────────────────────────────────────────
// POST BATCH UNDO (HOÀN TÁC CÁC MÃ ĐÃ XÁC NHẬN KIỂM TRONG LÔ)
// ──────────────────────────────────────────────────────────────
router.post('/batch-undo', authenticateToken, async (req: any, res) => {
  const { batchId, itemIds } = req.body;
  const username = req.user?.username || 'system';

  if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
    return res.status(400).json({ message: 'Danh sách itemId hoàn tác là bắt buộc' });
  }

  try {
    const undoneList: number[] = [];

    await prisma.$transaction(async (tx) => {
      for (const idVal of itemIds) {
        const itemId = Number(idVal);

        let detail = await tx.inventoryDetail.findUnique({
          where: { id: itemId },
          include: { asset: true }
        });

        if (detail) {
          if (detail.checkStatus !== 'CHECKED' || !detail.checkedAt) {
            throw new Error(`Tài sản ${detail.assetCode} chưa được kiểm kê, không thể hoàn tác.`);
          }

          const now = new Date();
          const diffMin = (now.getTime() - new Date(detail.checkedAt).getTime()) / 60000;
          if (diffMin > 30) {
            throw new Error(`Quá hạn 30 phút để hoàn tác tài sản ${detail.assetCode}`);
          }

          const lastLog = await tx.inventoryScanLog.findFirst({
            where: {
              assetId: detail.assetId,
              sessionId: detail.sessionId,
              batchId: batchId || detail.batchId || undefined
            },
            orderBy: { scannedAt: 'desc' }
          });

          let prevStatus = 'MATCH_PENDING_CONFIRM';
          if (lastLog) {
            if (lastLog.action === 'ADJUST_ACTUAL' || lastLog.result === 'NEED_REVIEW' || lastLog.result === 'ACTUAL_UPDATED') {
              prevStatus = 'NEED_REVIEW';
            }
          }

          const hasAdjust = await tx.inventoryScanLog.findFirst({
            where: {
              assetId: detail.assetId,
              sessionId: detail.sessionId,
              action: 'ADJUST_ACTUAL'
            }
          });

          if (!hasAdjust) {
            await tx.inventoryDetail.update({
              where: { id: itemId },
              data: {
                actualLocationName: '',
                actualUserName: '',
                actualDepartmentName: '',
                actualProjectName: '',
                note: null,
                resultStatus: 'MATCH',
                checkedAt: null,
                checkedBy: null,
                checkStatus: prevStatus
              }
            });
          } else {
            await tx.inventoryDetail.update({
              where: { id: itemId },
              data: {
                checkedAt: null,
                checkedBy: null,
                checkStatus: 'NEED_REVIEW'
              }
            });
          }

          const nextRecentLog = await tx.inventoryScanLog.findFirst({
            where: {
              assetId: detail.assetId,
              action: { in: ['CHECKED', 'OVERRIDE_CHECKED', 'MATCH_AUTO_SAVED', 'FAST_SCAN_CHECK'] },
              scannedAt: { lt: detail.checkedAt }
            },
            orderBy: { scannedAt: 'desc' }
          });

          await tx.asset.update({
            where: { id: detail.assetId! },
            data: {
              lastInventoryDate: nextRecentLog ? nextRecentLog.scannedAt : null,
              lastInventoryStatus: nextRecentLog ? (nextRecentLog.result === 'MATCHED' ? 'MATCH' : 'MISMATCH') : null
            }
          });

          await tx.auditLog.create({
            data: {
              entityType: 'ASSET',
              entityId: detail.assetId!,
              action: 'UNDO_CHECKED',
              details: `Hoàn tác kiểm kê trong lô ${batchId}`,
              performedBy: username
            }
          });

          await tx.inventoryScanLog.create({
            data: {
              assetId: detail.assetId,
              assetCode: detail.assetCode,
              barcode: detail.assetCode || '',
              sessionId: detail.sessionId,
              action: 'UNDO_CHECKED',
              result: prevStatus === 'MATCH_PENDING_CONFIRM' ? 'MATCH_PENDING_CONFIRM' : 'NEED_REVIEW',
              reason: `Hoàn tác xác nhận kiểm kê. Quay lại trạng thái chờ rà soát.`,
              scannedBy: username,
              batchId: batchId || detail.batchId
            }
          });

          undoneList.push(itemId);
          continue;
        }

        let item = await tx.inventoryItem.findUnique({
          where: { id: itemId },
          include: { asset: true }
        });

        if (item) {
          if (item.checkStatus !== 'CHECKED' || !item.checkedAt) {
            throw new Error(`Tài sản ${item.assetCode} chưa được kiểm kê, không thể hoàn tác.`);
          }

          const now = new Date();
          const diffMin = (now.getTime() - new Date(item.checkedAt).getTime()) / 60000;
          if (diffMin > 30) {
            throw new Error(`Quá hạn 30 phút để hoàn tác tài sản ${item.assetCode}`);
          }

          const lastLog = await tx.inventoryScanLog.findFirst({
            where: {
              assetId: item.assetId,
              inventoryCheckId: item.inventoryCheckId,
              batchId: batchId || item.batchId || undefined
            },
            orderBy: { scannedAt: 'desc' }
          });

          let prevStatus = 'MATCH_PENDING_CONFIRM';
          if (lastLog) {
            if (lastLog.action === 'ADJUST_ACTUAL' || lastLog.result === 'NEED_REVIEW' || lastLog.result === 'ACTUAL_UPDATED') {
              prevStatus = 'NEED_REVIEW';
            }
          }

          const hasAdjust = await tx.inventoryScanLog.findFirst({
            where: {
              assetId: item.assetId,
              inventoryCheckId: item.inventoryCheckId,
              action: 'ADJUST_ACTUAL'
            }
          });

          if (!hasAdjust) {
            await tx.inventoryItem.update({
              where: { id: itemId },
              data: {
                actualLocation: '',
                actualUserName: '',
                actualStatus: '',
                quality: 'GOOD',
                note: '',
                checkStatus: prevStatus,
                checkedAt: null,
                checkedBy: null,
                result: 'MATCHED',
                resultStatus: 'MATCH',
                checkCondition: 'FOUND',
                actualSerialNumber: ''
              }
            });
          } else {
            await tx.inventoryItem.update({
              where: { id: itemId },
              data: {
                checkedAt: null,
                checkedBy: null,
                checkStatus: 'NEED_REVIEW'
              }
            });
          }

          const nextRecentLog = await tx.inventoryScanLog.findFirst({
            where: {
              assetId: item.assetId,
              action: { in: ['CHECKED', 'OVERRIDE_CHECKED', 'MATCH_AUTO_SAVED', 'FAST_SCAN_CHECK'] },
              scannedAt: { lt: item.checkedAt }
            },
            orderBy: { scannedAt: 'desc' }
          });

          await tx.asset.update({
            where: { id: item.assetId! },
            data: {
              lastInventoryDate: nextRecentLog ? nextRecentLog.scannedAt : null,
              lastInventoryStatus: nextRecentLog ? (nextRecentLog.result || 'MATCHED') : null
            }
          });

          await tx.auditLog.create({
            data: {
              entityType: 'ASSET',
              entityId: item.assetId!,
              action: 'UNDO_CHECKED',
              details: `Hoàn tác kiểm kê trong lô ${batchId}`,
              performedBy: username
            }
          });

          await tx.inventoryScanLog.create({
            data: {
              assetId: item.assetId,
              assetCode: item.assetCode,
              barcode: item.assetCode || '',
              inventoryCheckId: item.inventoryCheckId,
              sessionId: null,
              action: 'UNDO_CHECKED',
              result: prevStatus === 'MATCH_PENDING_CONFIRM' ? 'MATCH_PENDING_CONFIRM' : 'NEED_REVIEW',
              reason: `Hoàn tác xác nhận kiểm kê. Quay lại trạng thái chờ rà soát.`,
              scannedBy: username,
              batchId: batchId || item.batchId
            }
          });

          undoneList.push(itemId);
        }
      }
    });

    res.json({ success: true, undoneList });
  } catch (error: any) {
    console.error('Lỗi batch-undo:', error);
    res.status(400).json({ message: error.message || 'Lỗi hoàn tác lô quét' });
  }
});

// ──────────────────────────────────────────────────────────────
// POST BATCH CANCEL (HỦY LÔ QUÉT - CHỈ XÓA PENDING LOGS)
// ──────────────────────────────────────────────────────────────
router.post('/batch-cancel', authenticateToken, async (req: any, res) => {
  const { batchId } = req.body;
  const username = req.user?.username || 'system';
  const role = req.user?.role || 'USER';

  if (!batchId) {
    return res.status(400).json({ message: 'batchId là bắt buộc' });
  }

  try {
    // Check if there are any confirmed items in this batch
    const confirmedDetailsCount = await prisma.inventoryDetail.count({
      where: { batchId, checkStatus: 'CHECKED' }
    });

    const confirmedItemsCount = await prisma.inventoryItem.count({
      where: { batchId, checkStatus: 'CHECKED' }
    });

    const totalConfirmed = confirmedDetailsCount + confirmedItemsCount;

    if (totalConfirmed > 0 && role !== 'ADMIN' && role !== 'SUPERADMIN') {
      return res.status(400).json({
        message: `Lô đã có ${totalConfirmed} tài sản được xác nhận kiểm kê. Vui lòng hoàn tác (Undo) các tài sản này trước khi hủy lô, hoặc yêu cầu quản trị viên (Admin) xử lý.`
      });
    }

    // Process deletion and reset in transaction
    await prisma.$transaction(async (tx) => {
      // 1. Reset InventoryDetail records associated with this batchId
      await tx.inventoryDetail.updateMany({
        where: { batchId },
        data: {
          batchId: null,
          checkStatus: 'PENDING',
          actualLocationName: '',
          actualUserName: '',
          actualDepartmentName: '',
          actualProjectName: '',
          resultStatus: 'MATCH',
          checkedAt: null,
          checkedBy: null,
          note: null
        }
      });

      // 2. Reset InventoryItem records associated with this batchId
      await tx.inventoryItem.updateMany({
        where: { batchId },
        data: {
          batchId: null,
          checkStatus: 'PENDING',
          actualLocation: '',
          actualUserName: '',
          actualStatus: '',
          quality: 'GOOD',
          note: '',
          result: 'MATCHED',
          resultStatus: 'MATCH',
          checkCondition: 'FOUND',
          actualSerialNumber: '',
          checkedAt: null,
          checkedBy: null
        }
      });

      // 3. Delete scan logs for this batch
      await tx.inventoryScanLog.deleteMany({
        where: { batchId }
      });

      // 4. Create audit log if it was an admin bypass override
      if (totalConfirmed > 0) {
        await tx.auditLog.create({
          data: {
            entityType: 'INVENTORY_BATCH',
            entityId: 0,
            action: 'ADMIN_BYPASS_BATCH_CANCEL',
            details: `Admin ${username} hủy cưỡng chế lô ${batchId} có ${totalConfirmed} tài sản đã xác nhận.`,
            performedBy: username
          }
        });
      }
    });

    res.json({ success: true, message: 'Đã hủy lô quét và đặt lại trạng thái tài sản thành công' });
  } catch (error: any) {
    console.error('Lỗi batch-cancel:', error);
    res.status(400).json({ message: error.message || 'Lỗi hủy lô quét' });
  }
});

// ──────────────────────────────────────────────────────────────
// POST BATCH CLASSIFY OUT OF BOOK (PHÂN LOẠI TÀI SẢN NGOÀI SỔ)
// ──────────────────────────────────────────────────────────────
router.post('/batch-classify-out-of-book', authenticateToken, async (req: any, res) => {
  const { batchId, barcode, action } = req.body;
  const username = req.user?.username || 'system';

  if (!batchId || !barcode || !action) {
    return res.status(400).json({ message: 'batchId, barcode và action là bắt buộc' });
  }

  if (action !== 'IGNORE' && action !== 'REGISTER') {
    return res.status(400).json({ message: 'action chỉ nhận giá trị IGNORE hoặc REGISTER' });
  }

  try {
    const newResultStatus = action === 'IGNORE' ? 'OUT_OF_BOOK_IGNORED' : 'OUT_OF_BOOK_REGISTERED';

    await prisma.inventoryScanLog.updateMany({
      where: {
        batchId,
        barcode,
        result: 'OUT_OF_BOOK'
      },
      data: {
        result: newResultStatus,
        reason: `Phân loại tài sản ngoài sổ: ${action === 'IGNORE' ? 'Bỏ qua' : 'Đăng ký mới'} bởi ${username}`
      }
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'INVENTORY_BATCH',
        entityId: 0,
        action: `OUT_OF_BOOK_${action}`,
        details: `Phân loại tài sản ngoài sổ ${barcode} trong lô ${batchId} là ${action}.`,
        performedBy: username
      }
    });

    res.json({
      success: true,
      message: `Đã phân loại tài sản ngoài sổ ${barcode} là ${action === 'IGNORE' ? 'Bỏ qua' : 'Đăng ký mới'}`
    });
  } catch (error: any) {
    console.error('Lỗi batch-classify-out-of-book:', error);
    res.status(400).json({ message: error.message || 'Lỗi phân loại tài sản ngoài sổ' });
  }
});

// ──────────────────────────────────────────────────────────────
// GET RECENT SCAN LOGS (LAST 20 RECORDS)
// ──────────────────────────────────────────────────────────────
router.get('/scan-logs', authenticateToken, async (req, res) => {
  const { inventoryCheckId, sessionId } = req.query;
  try {
    const where: any = {
      // Scan History whitelist: only expose completed check actions
      action: { in: ['CHECKED', 'OVERRIDE_CHECKED', 'MATCH_AUTO_SAVED', 'FAST_SCAN_CHECK'] }
    };
    if (inventoryCheckId) where.inventoryCheckId = Number(inventoryCheckId);
    if (sessionId) where.sessionId = Number(sessionId);

    const logs = await prisma.inventoryScanLog.findMany({
      where,
      orderBy: { scannedAt: 'desc' },
      take: 20
    });
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ──────────────────────────────────────────────────────────────
// UNDO ITEM CHECK (MAIN CHECK SESSION)
// ──────────────────────────────────────────────────────────────
router.post('/item/:id/undo', authenticateToken, async (req: AuthRequest, res) => {
  const itemId = Number(req.params.id);
  const { reason } = req.body;
  const username = req.user?.username || 'system';

  if (!reason || !reason.trim()) {
    return res.status(400).json({ message: 'Lý do hoàn tác là bắt buộc' });
  }

  try {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId }
    });
    if (!item) return res.status(404).json({ message: 'Không tìm thấy mục kiểm kê' });

    const session = await prisma.inventoryCheck.findUnique({
      where: { id: item.inventoryCheckId }
    });
    if (!session) return res.status(404).json({ message: 'Không tìm thấy đợt kiểm kê' });

    const isAdminOrManager = req.user?.roles?.some((r: string) => ['SUPER_ADMIN', 'ADMIN', 'INVENTORY_MANAGER'].includes(r));

    if (session.status === 'APPROVED') {
      return res.status(400).json({ message: 'Biên bản kiểm kê đã được phê duyệt. Không thể hoàn tác trực tiếp. Vui lòng tạo phiếu điều chỉnh.' });
    }

    if (session.status === 'COMPLETED') {
      if (!isAdminOrManager) {
        return res.status(403).json({ message: 'Phiên kiểm kê đã chốt. Chỉ Admin hoặc Quản lý kiểm kê mới có quyền hoàn tác.' });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedItem = await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          checkStatus: 'PENDING',
          checkedAt: null,
          checkedBy: null,
          actualStatus: null,
          actualLocation: null,
          quality: null,
          result: null,
          note: null,
          actualUserName: null,
          actualUserId: null,
          actualSerialNumber: null,
          checkCondition: null,
          physicalDetailsJson: null,
          photos: []
        }
      });

      if (item.assetId) {
        const otherItem = await tx.inventoryItem.findFirst({
          where: {
            assetId: item.assetId,
            checkStatus: 'CHECKED',
            id: { not: item.id }
          },
          orderBy: { checkedAt: 'desc' }
        });

        const otherDetail = await tx.inventoryDetail.findFirst({
          where: {
            assetId: item.assetId,
            checkedAt: { not: null }
          },
          orderBy: { checkedAt: 'desc' }
        });

        let lastStatus = null;
        let lastDate = null;

        if (otherItem && otherDetail) {
          if (otherItem.checkedAt && otherDetail.checkedAt && otherItem.checkedAt > otherDetail.checkedAt) {
            lastStatus = otherItem.result;
            lastDate = otherItem.checkedAt;
          } else {
            lastStatus = otherDetail.resultStatus;
            lastDate = otherDetail.checkedAt;
          }
        } else if (otherItem) {
          lastStatus = otherItem.result;
          lastDate = otherItem.checkedAt;
        } else if (otherDetail) {
          lastStatus = otherDetail.resultStatus;
          lastDate = otherDetail.checkedAt;
        }

        await tx.asset.update({
          where: { id: item.assetId },
          data: {
            lastInventoryDate: lastDate,
            lastInventoryStatus: lastStatus
          }
        });

        await tx.auditLog.create({
          data: {
            entityType: 'ASSET',
            entityId: item.assetId,
            action: 'UNDO_SCAN_CHECK',
            details: `Hoàn tác quét kiểm kê tài sản. Trạng thái trước: Đã kiểm kê (${item.result || 'CHECKED'}). Trạng thái sau: Đang chờ. Lý do hoàn tác: ${reason}`,
            performedBy: username
          }
        });
      }

      return updatedItem;
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// ──────────────────────────────────────────────────────────────
// UNDO SESSION DETAIL CHECK (VISIT SESSION)
// ──────────────────────────────────────────────────────────────
router.post('/session-details/:detailId/undo', authenticateToken, async (req: AuthRequest, res) => {
  const detailId = Number(req.params.detailId);
  const { reason } = req.body;
  const username = req.user?.username || 'system';

  if (!reason || !reason.trim()) {
    return res.status(400).json({ message: 'Lý do hoàn tác là bắt buộc' });
  }

  try {
    const detail = await prisma.inventoryDetail.findUnique({
      where: { id: detailId },
      include: { session: true }
    });
    if (!detail) return res.status(404).json({ message: 'Không tìm thấy dòng kiểm kê' });

    const mainCheck = await prisma.inventoryCheck.findUnique({
      where: { id: detail.session.inventoryCheckId }
    });
    if (!mainCheck) return res.status(404).json({ message: 'Không tìm thấy đợt kiểm kê' });

    const isAdminOrManager = req.user?.roles?.some((r: string) => ['SUPER_ADMIN', 'ADMIN', 'INVENTORY_MANAGER'].includes(r));

    if (mainCheck.status === 'APPROVED') {
      return res.status(400).json({ message: 'Biên bản kiểm kê đã được phê duyệt. Không thể hoàn tác trực tiếp. Vui lòng tạo phiếu điều chỉnh.' });
    }

    if (mainCheck.status === 'COMPLETED' || detail.session.status === 'COMPLETED') {
      if (!isAdminOrManager) {
        return res.status(403).json({ message: 'Phiên kiểm kê đã chốt. Chỉ Admin hoặc Quản lý kiểm kê mới có quyền hoàn tác.' });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedDetail = await tx.inventoryDetail.update({
        where: { id: detailId },
        data: {
          actualUserName: null,
          actualDepartmentName: null,
          actualLocationName: null,
          resultStatus: 'MATCH',
          note: null,
          imageUrl: null,
          checkedAt: null
        }
      });

      if (detail.assetId) {
        const otherItem = await tx.inventoryItem.findFirst({
          where: {
            assetId: detail.assetId,
            checkStatus: 'CHECKED'
          },
          orderBy: { checkedAt: 'desc' }
        });

        const otherDetail = await tx.inventoryDetail.findFirst({
          where: {
            assetId: detail.assetId,
            checkedAt: { not: null },
            id: { not: detail.id }
          },
          orderBy: { checkedAt: 'desc' }
        });

        let lastStatus = null;
        let lastDate = null;

        if (otherItem && otherDetail) {
          if (otherItem.checkedAt && otherDetail.checkedAt && otherItem.checkedAt > otherDetail.checkedAt) {
            lastStatus = otherItem.result;
            lastDate = otherItem.checkedAt;
          } else {
            lastStatus = otherDetail.resultStatus;
            lastDate = otherDetail.checkedAt;
          }
        } else if (otherItem) {
          lastStatus = otherItem.result;
          lastDate = otherItem.checkedAt;
        } else if (otherDetail) {
          lastStatus = otherDetail.resultStatus;
          lastDate = otherDetail.checkedAt;
        }

        await tx.asset.update({
          where: { id: detail.assetId },
          data: {
            lastInventoryDate: lastDate,
            lastInventoryStatus: lastStatus
          }
        });

        await tx.auditLog.create({
          data: {
            entityType: 'ASSET',
            entityId: detail.assetId,
            action: 'UNDO_SCAN_CHECK',
            details: `Hoàn tác quét kiểm kê tài sản. Trạng thái trước: Đã kiểm kê (${detail.resultStatus || 'CHECKED'}). Trạng thái sau: Đang chờ. Lý do hoàn tác: ${reason}`,
            performedBy: username
          }
        });
      }

      return updatedDetail;
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// ──────────────────────────────────────────────────────────────
// CREATE ADCHECK PROPOSAL (ITEM)
// ──────────────────────────────────────────────────────────────
router.post('/item/:id/propose-adjustment', authenticateToken, async (req: AuthRequest, res) => {
  const itemId = Number(req.params.id);
  const { reason } = req.body;
  try {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
      include: { asset: true }
    });
    if (!item) return res.status(404).json({ message: 'Không tìm thấy mục kiểm kê' });
    if (!item.asset) return res.status(404).json({ message: 'Không tìm thấy thông tin tài sản gốc' });
    if (!item.assetId) return res.status(400).json({ message: 'Bản ghi không liên kết với tài sản hệ thống' });

    let job = await prisma.assetNormalizationJob.findFirst({
      where: { createdBy: 'MANUAL_INVENTORY_PROPOSAL' }
    });
    if (!job) {
      job = await prisma.assetNormalizationJob.create({
        data: {
          status: 'COMPLETED',
          progress: 100,
          totalIssues: 0,
          criteria: JSON.stringify({ source: 'MANUAL_INVENTORY_PROPOSAL' }),
          createdBy: 'MANUAL_INVENTORY_PROPOSAL'
        }
      });
    }

    const suggestions: any[] = [];

    if (item.actualLocation && item.expectedLocation && item.actualLocation !== item.expectedLocation) {
      suggestions.push({
        jobId: job.id,
        assetId: item.assetId,
        assetCode: item.assetCode,
        assetName: item.asset.assetName,
        issueType: 'WRONG_LOCATION',
        fieldName: 'locationName',
        currentValue: item.expectedLocation,
        suggestedValue: item.actualLocation,
        confidenceScore: 1.0,
        source: 'INVENTORY_MANUAL_PROPOSAL',
        status: 'PENDING',
        reason: reason || 'Đề xuất điều chỉnh vị trí từ kiểm kê'
      });
    }

    if (item.actualUserName && item.asset.currentUserName && item.actualUserName !== item.asset.currentUserName) {
      suggestions.push({
        jobId: job.id,
        assetId: item.assetId,
        assetCode: item.assetCode,
        assetName: item.asset.assetName,
        issueType: 'WRONG_USER',
        fieldName: 'currentUserName',
        currentValue: item.asset.currentUserName,
        suggestedValue: item.actualUserName,
        confidenceScore: 1.0,
        source: 'INVENTORY_MANUAL_PROPOSAL',
        status: 'PENDING',
        reason: reason || 'Đề xuất điều chỉnh người sử dụng từ kiểm kê'
      });
    }

    if (item.actualSerialNumber && item.asset.serialNumber && item.actualSerialNumber !== item.asset.serialNumber) {
      suggestions.push({
        jobId: job.id,
        assetId: item.assetId,
        assetCode: item.assetCode,
        assetName: item.asset.assetName,
        issueType: 'WRONG_SERIAL',
        fieldName: 'serialNumber',
        currentValue: item.asset.serialNumber,
        suggestedValue: item.actualSerialNumber,
        confidenceScore: 1.0,
        source: 'INVENTORY_MANUAL_PROPOSAL',
        status: 'PENDING',
        reason: reason || 'Đề xuất điều chỉnh số serial từ kiểm kê'
      });
    }

    if (item.actualStatus && item.expectedStatus && item.actualStatus !== item.expectedStatus) {
      suggestions.push({
        jobId: job.id,
        assetId: item.assetId,
        assetCode: item.assetCode,
        assetName: item.asset.assetName,
        issueType: 'WRONG_STATUS',
        fieldName: 'status',
        currentValue: item.expectedStatus,
        suggestedValue: item.actualStatus,
        confidenceScore: 1.0,
        source: 'INVENTORY_MANUAL_PROPOSAL',
        status: 'PENDING',
        reason: reason || 'Đề xuất điều chỉnh trạng thái tài sản từ kiểm kê'
      });
    }

    if (suggestions.length === 0) {
      return res.status(400).json({ message: 'Không phát hiện sai lệch nào để đề xuất cập nhật sổ' });
    }

    const createdSuggestions = await prisma.$transaction(
      suggestions.map((s: any) => prisma.assetNormalizationSuggestion.create({ data: s }))
    );

    res.json({ message: `Đã tạo ${createdSuggestions.length} đề xuất cập nhật sổ sách`, suggestions: createdSuggestions });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// ──────────────────────────────────────────────────────────────
// CREATE ADCHECK PROPOSAL (SESSION DETAIL)
// ──────────────────────────────────────────────────────────────
router.post('/session-details/:detailId/propose-adjustment', authenticateToken, async (req: AuthRequest, res) => {
  const detailId = Number(req.params.detailId);
  const { reason } = req.body;
  try {
    const detail = await prisma.inventoryDetail.findUnique({
      where: { id: detailId },
      include: { asset: true }
    });
    if (!detail) return res.status(404).json({ message: 'Không tìm thấy dòng kiểm kê' });
    if (!detail.asset) return res.status(404).json({ message: 'Không tìm thấy thông tin tài sản gốc' });
    if (!detail.assetId) return res.status(400).json({ message: 'Dòng kiểm kê này không liên kết với tài sản hệ thống' });

    let job = await prisma.assetNormalizationJob.findFirst({
      where: { createdBy: 'MANUAL_INVENTORY_PROPOSAL' }
    });
    if (!job) {
      job = await prisma.assetNormalizationJob.create({
        data: {
          status: 'COMPLETED',
          progress: 100,
          totalIssues: 0,
          criteria: JSON.stringify({ source: 'MANUAL_INVENTORY_PROPOSAL' }),
          createdBy: 'MANUAL_INVENTORY_PROPOSAL'
        }
      });
    }

    const suggestions: any[] = [];

    if (detail.actualLocationName && detail.bookLocationName && detail.actualLocationName !== detail.bookLocationName) {
      suggestions.push({
        jobId: job.id,
        assetId: detail.assetId,
        assetCode: detail.assetCode,
        assetName: detail.asset.assetName,
        issueType: 'WRONG_LOCATION',
        fieldName: 'locationName',
        currentValue: detail.bookLocationName,
        suggestedValue: detail.actualLocationName,
        confidenceScore: 1.0,
        source: 'INVENTORY_MANUAL_PROPOSAL',
        status: 'PENDING',
        reason: reason || 'Đề xuất điều chỉnh vị trí từ kiểm kê'
      });
    }

    if (detail.actualUserName && detail.bookUserName && detail.actualUserName !== detail.bookUserName) {
      suggestions.push({
        jobId: job.id,
        assetId: detail.assetId,
        assetCode: detail.assetCode,
        assetName: detail.asset.assetName,
        issueType: 'WRONG_USER',
        fieldName: 'currentUserName',
        currentValue: detail.bookUserName,
        suggestedValue: detail.actualUserName,
        confidenceScore: 1.0,
        source: 'INVENTORY_MANUAL_PROPOSAL',
        status: 'PENDING',
        reason: reason || 'Đề xuất điều chỉnh người sử dụng từ kiểm kê'
      });
    }

    if (suggestions.length === 0) {
      return res.status(400).json({ message: 'Không phát hiện sai lệch nào để đề xuất cập nhật sổ' });
    }

    const createdSuggestions = await prisma.$transaction(
      suggestions.map((s: any) => prisma.assetNormalizationSuggestion.create({ data: s }))
    );

    res.json({ message: `Đã tạo ${createdSuggestions.length} đề xuất cập nhật sổ sách`, suggestions: createdSuggestions });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// ──────────────────────────────────────────────────────────────
// CREATE RECHECK REQUEST
// ──────────────────────────────────────────────────────────────
router.post('/recheck-request', authenticateToken, async (req: AuthRequest, res) => {
  const { mode, itemId, detailId, reason } = req.body;
  if (!reason || !reason.trim()) {
    return res.status(400).json({ message: 'Lý do yêu cầu kiểm kê lại là bắt buộc' });
  }

  try {
    let inventoryCheckId = null;
    let sessionId = null;

    if (mode === 'CHECK') {
      const item = await prisma.inventoryItem.findUnique({
        where: { id: Number(itemId) }
      });
      if (!item) return res.status(404).json({ message: 'Không tìm thấy mục kiểm kê' });
      inventoryCheckId = item.inventoryCheckId;
    } else {
      const detail = await prisma.inventoryDetail.findUnique({
        where: { id: Number(detailId) }
      });
      if (!detail) return res.status(404).json({ message: 'Không tìm thấy dòng kiểm kê' });
      sessionId = detail.sessionId;
    }

    const recheck = await prisma.recheckRequest.create({
      data: {
        itemId: itemId ? Number(itemId) : null,
        detailId: detailId ? Number(detailId) : null,
        inventoryCheckId,
        sessionId,
        reason,
        status: 'PENDING_APPROVAL',
        requestedBy: req.user?.username || 'system'
      }
    });

    res.json({ message: 'Đã gửi yêu cầu kiểm kê lại chờ duyệt', recheck });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// ──────────────────────────────────────────────────────────────
// APPROVE RECHECK REQUEST
// ──────────────────────────────────────────────────────────────
router.post('/recheck-request/:id/approve', authenticateToken, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const isAdminOrManager = req.user?.roles?.some((r: string) => ['SUPER_ADMIN', 'ADMIN', 'INVENTORY_MANAGER'].includes(r));
  if (!isAdminOrManager) {
    return res.status(403).json({ message: 'Chỉ Admin hoặc Quản lý kiểm kê mới có quyền phê duyệt yêu cầu kiểm kê lại' });
  }

  try {
    const request = await prisma.recheckRequest.findUnique({
      where: { id }
    });
    if (!request) return res.status(404).json({ message: 'Không tìm thấy yêu cầu' });
    if (request.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ message: 'Yêu cầu này đã được xử lý trước đó' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (request.itemId) {
        const item = await tx.inventoryItem.findUnique({ where: { id: request.itemId } });
        if (item) {
          await tx.inventoryItem.update({
            where: { id: request.itemId },
            data: {
              checkStatus: 'PENDING',
              checkedAt: null,
              checkedBy: null,
              actualStatus: null,
              actualLocation: null,
              quality: null,
              result: null,
              note: null,
              actualUserName: null,
              actualUserId: null,
              actualSerialNumber: null,
              checkCondition: null,
              physicalDetailsJson: null,
              photos: []
            }
          });

          if (item.assetId) {
            const otherItem = await tx.inventoryItem.findFirst({
              where: { assetId: item.assetId, checkStatus: 'CHECKED', id: { not: item.id } },
              orderBy: { checkedAt: 'desc' }
            });
            const otherDetail = await tx.inventoryDetail.findFirst({
              where: { assetId: item.assetId, checkedAt: { not: null } },
              orderBy: { checkedAt: 'desc' }
            });
            let lastStatus = null;
            let lastDate = null;
            if (otherItem && otherDetail) {
              if (otherItem.checkedAt && otherDetail.checkedAt && otherItem.checkedAt > otherDetail.checkedAt) {
                lastStatus = otherItem.result;
                lastDate = otherItem.checkedAt;
              } else {
                lastStatus = otherDetail.resultStatus;
                lastDate = otherDetail.checkedAt;
              }
            } else if (otherItem) {
              lastStatus = otherItem.result;
              lastDate = otherItem.checkedAt;
            } else if (otherDetail) {
              lastStatus = otherDetail.resultStatus;
              lastDate = otherDetail.checkedAt;
            }
            await tx.asset.update({
              where: { id: item.assetId },
              data: { lastInventoryDate: lastDate, lastInventoryStatus: lastStatus }
            });

            await tx.auditLog.create({
              data: {
                entityType: 'ASSET',
                entityId: item.assetId,
                action: 'RECHECK_APPROVED_RESET',
                details: `Duyệt yêu cầu kiểm kê lại tài sản. Khởi tạo lại trạng thái Đang chờ. Lý do duyệt: Phê duyệt từ quản lý. Người duyệt: ${req.user?.username}`,
                performedBy: req.user?.username || 'system'
              }
            });
          }
        }
      } else if (request.detailId) {
        const detail = await tx.inventoryDetail.findUnique({ where: { id: request.detailId } });
        if (detail) {
          await tx.inventoryDetail.update({
            where: { id: request.detailId },
            data: {
              actualUserName: null,
              actualDepartmentName: null,
              actualLocationName: null,
              resultStatus: 'MATCH',
              note: null,
              imageUrl: null,
              checkedAt: null
            }
          });

          if (detail.assetId) {
            const otherItem = await tx.inventoryItem.findFirst({
              where: { assetId: detail.assetId, checkStatus: 'CHECKED' },
              orderBy: { checkedAt: 'desc' }
            });
            const otherDetail = await tx.inventoryDetail.findFirst({
              where: { assetId: detail.assetId, checkedAt: { not: null }, id: { not: detail.id } },
              orderBy: { checkedAt: 'desc' }
            });
            let lastStatus = null;
            let lastDate = null;
            if (otherItem && otherDetail) {
              if (otherItem.checkedAt && otherDetail.checkedAt && otherItem.checkedAt > otherDetail.checkedAt) {
                lastStatus = otherItem.result;
                lastDate = otherItem.checkedAt;
              } else {
                lastStatus = otherDetail.resultStatus;
                lastDate = otherDetail.checkedAt;
              }
            } else if (otherItem) {
              lastStatus = otherItem.result;
              lastDate = otherItem.checkedAt;
            } else if (otherDetail) {
              lastStatus = otherDetail.resultStatus;
              lastDate = otherDetail.checkedAt;
            }
            await tx.asset.update({
              where: { id: detail.assetId },
              data: { lastInventoryDate: lastDate, lastInventoryStatus: lastStatus }
            });

            await tx.auditLog.create({
              data: {
                entityType: 'ASSET',
                entityId: detail.assetId,
                action: 'RECHECK_APPROVED_RESET',
                details: `Duyệt yêu cầu kiểm kê lại tài sản. Khởi tạo lại trạng thái Đang chờ. Lý do duyệt: Phê duyệt từ quản lý. Người duyệt: ${req.user?.username}`,
                performedBy: req.user?.username || 'system'
              }
            });
          }
        }
      }

      return await tx.recheckRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedBy: req.user?.username,
          approvedAt: new Date()
        }
      });
    });

    res.json({ message: 'Yêu cầu kiểm kê lại đã được phê duyệt và khởi tạo lại trạng thái bản ghi', request: updated });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// ──────────────────────────────────────────────────────────────
// REJECT RECHECK REQUEST
// ──────────────────────────────────────────────────────────────
router.post('/recheck-request/:id/reject', authenticateToken, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const isAdminOrManager = req.user?.roles?.some((r: string) => ['SUPER_ADMIN', 'ADMIN', 'INVENTORY_MANAGER'].includes(r));
  if (!isAdminOrManager) {
    return res.status(403).json({ message: 'Chỉ Admin hoặc Quản lý kiểm kê mới có quyền từ chối yêu cầu kiểm kê lại' });
  }

  try {
    const request = await prisma.recheckRequest.findUnique({ where: { id } });
    if (!request) return res.status(404).json({ message: 'Không tìm thấy yêu cầu' });
    if (request.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ message: 'Yêu cầu này đã được xử lý trước đó' });
    }

    const updated = await prisma.recheckRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedBy: req.user?.username,
        approvedAt: new Date()
      }
    });

    res.json({ message: 'Đã từ chối yêu cầu kiểm kê lại', request: updated });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// ──────────────────────────────────────────────────────────────
// GET INVENTORY DETAIL BY ID (Move to bottom to prevent route clashing)
// ──────────────────────────────────────────────────────────────
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const detail = await InventoryService.getInventoryDetail(Number(req.params.id));
    if (!detail) return res.status(404).json({ message: 'Session not found' });
    res.json(detail);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// ──────────────────────────────────────────────────────────────
// GET ALL RECHECK REQUESTS
// ──────────────────────────────────────────────────────────────
router.get('/recheck-requests', authenticateToken, async (req, res) => {
  try {
    const list = await prisma.recheckRequest.findMany({
      orderBy: { requestedAt: 'desc' }
    });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

