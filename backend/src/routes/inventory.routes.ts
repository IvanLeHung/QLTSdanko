import { Router } from 'express';
import { InventoryService } from '../services/inventory.service';
import { authenticateToken, AuthRequest, requirePermission } from '../middleware/auth.middleware';
import prisma from '../utils/prisma';
import { buildExcelWorkbook, formatDate } from '../utils/excel.util';
import { buildDataScopeWhere } from '../utils/data-scope.util';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

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

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const detail = await InventoryService.getInventoryDetail(Number(req.params.id));
    if (!detail) return res.status(404).json({ message: 'Session not found' });
    res.json(detail);
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

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  const performedBy = req.user?.username || 'system';
  try {
    const session = await InventoryService.createInventorySession(req.body, performedBy);
    res.status(201).json(session);
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
  const checkedBy = req.user?.username || 'system';
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
      const output = [];
      for (const assetId of assetIds) {
        const asset = await tx.asset.findUnique({ where: { id: Number(assetId) } });
        if (!asset) continue;

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
              checkedAt: new Date(),
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
              checkedAt: new Date(),
              checkedBy,
              actualUserName: actualUserName || null,
              actualUserId: actualUserId || null,
              actualSerialNumber: actualSerialNumber || null,
              checkCondition: checkCondition || 'FOUND',
              physicalDetailsJson: physicalDetailsJson || null
            }
          });
        }
        output.push(item);
      }

      // Transition parent session status if OPEN
      const session = await tx.inventoryCheck.findUnique({
        where: { id: Number(sessionId) }
      });
      if (session && session.status === 'OPEN') {
        await tx.inventoryCheck.update({
          where: { id: session.id },
          data: { status: 'IN_PROGRESS' }
        });
      }

      return output;
    });

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

export default router;

