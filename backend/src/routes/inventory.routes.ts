import { Router } from 'express';
import { InventoryService } from '../services/inventory.service';
import { authenticateToken, AuthRequest, requirePermission } from '../middleware/auth.middleware';
import prisma from '../utils/prisma';
import { buildExcelWorkbook, formatDate } from '../utils/excel.util';
import { buildDataScopeWhere } from '../utils/data-scope.util';

const router = Router();

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

router.post('/check-multiple-assets', authenticateToken, async (req: AuthRequest, res) => {
  const checkedBy = req.user?.username || 'system';
  const { sessionId, assetIds, actualStatus, quality, note } = req.body;
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

        if (item) {
          item = await tx.inventoryItem.update({
            where: { id: item.id },
            data: {
              actualStatus,
              quality,
              note: note || '',
              checkStatus: 'CHECKED',
              checkedAt: new Date(),
              checkedBy
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
              quality,
              note: note || '',
              checkStatus: 'CHECKED',
              checkedAt: new Date(),
              checkedBy
            }
          });
        }
        output.push(item);
      }
      return output;
    });

    res.json({ message: `Đã kiểm kê thành công ${results.length} tài sản`, items: results });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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
      item.inventoryCheck.status === 'OPEN' ? 'Đang mở' :
      item.inventoryCheck.status === 'CLOSED' ? 'Đã đóng' : item.inventoryCheck.status,
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
      item.checkStatus === 'CHECKED' ? 'Đã kiểm' : item.checkStatus,
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

export default router;
