import { Router } from 'express';
import { RepairService } from '../services/repair.service';
import prisma from '../utils/prisma';
import { authenticateToken, AuthRequest, requirePermission } from '../middleware/auth.middleware';
import { buildExcelWorkbook, formatDate } from '../utils/excel.util';
import { buildDataScopeWhere } from '../utils/data-scope.util';

const router = Router();

// Get all repair tickets
router.get('/', async (req, res) => {
  try {
    const tickets = await RepairService.getAllTickets(req.query);
    res.json(tickets);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get ticket by ID
router.get('/:id', async (req, res) => {
  try {
    const ticket = await RepairService.getTicketById(parseInt(req.params.id));
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    res.json(ticket);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Create new repair ticket
router.post('/', async (req, res) => {
  try {
    const ticket = await RepairService.createTicket(req.body);
    res.json(ticket);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Update ticket progress
router.put('/:id/progress', async (req, res) => {
  try {
    const ticket = await RepairService.updateProgress(parseInt(req.params.id), req.body);
    res.json(ticket);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Complete repair
router.post('/:id/complete', async (req, res) => {
  try {
    const ticket = await RepairService.completeRepair(parseInt(req.params.id), req.body);
    res.json(ticket);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Get repairs for an asset
router.get('/asset/:assetId', async (req, res) => {
  try {
    const repairs = await RepairService.getAssetRepairs(parseInt(req.params.assetId));
    res.json(repairs);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// GET /export-by-time - Báo hỏng / Sửa chữa (Repair tickets by Date Range)
router.get('/export-by-time', authenticateToken, requirePermission('REPAIR_VIEW'), async (req: AuthRequest, res) => {
  const { startDate, endDate } = req.query;
  const where: any = {};

  if (startDate || endDate) {
    where.reportedDate = {};
    if (startDate) where.reportedDate.gte = new Date(String(startDate));
    if (endDate) {
      const end = new Date(String(endDate));
      end.setHours(23, 59, 59, 999);
      where.reportedDate.lte = end;
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
      const workbook = buildExcelWorkbook('DANH SÁCH BÀN GIAO - ĐIỀU CHUYỂN', 'Không tìm thấy dữ liệu', [], [], 'Sửa chữa');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=BaoCaoSuaChua.xlsx');
      await workbook.xlsx.write(res);
      return res.end();
    }
    where.asset = scopeWhere;
  }

  try {
    const tickets = await prisma.assetRepairTicket.findMany({
      where,
      include: {
        asset: true
      },
      orderBy: {
        reportedDate: 'desc'
      }
    });

    const hasPricePermission = req.user?.roles?.includes('SUPER_ADMIN') || req.user?.permissions?.includes('ASSET_VIEW_PRICE');

    const headers = [
      'Mã phiếu sửa chữa', 'Mã tài sản hỏng', 'Tên tài sản hỏng', 'Người báo hỏng',
      'Ngày báo hỏng', 'Mức độ hỏng', 'Trạng thái xử lý', 'Mô tả sự cố',
      'Nguyên nhân', 'Biện pháp xử lý', 'Đơn vị sửa chữa',
      ...(hasPricePermission ? ['Chi phí dự kiến', 'Chi phí thực tế'] : []),
      'Ngày đem đi sửa', 'Ngày hoàn thành', 'Kết quả sửa chữa', 'Ghi chú'
    ];

    const rows = tickets.map(t => [
      t.repairCode,
      t.asset.assetCode,
      t.asset.assetName,
      t.reportedBy,
      formatDate(t.reportedDate),
      t.damageLevel || '',
      t.status === 'OPEN' ? 'Mới tiếp nhận' :
      t.status === 'IN_PROGRESS' ? 'Đang sửa chữa' :
      t.status === 'COMPLETED' ? 'Đã hoàn thành' :
      t.status === 'CANCELLED' ? 'Đã hủy' : t.status,
      t.damageDescription,
      t.cause || '',
      t.repairAction || '',
      t.repairVendor || '',
      ...(hasPricePermission ? [t.estimatedCost, t.actualCost] : []),
      formatDate(t.sentToRepairDate),
      formatDate(t.actualFinishDate),
      t.result || '',
      t.note || ''
    ]);

    const dateRangeStr = startDate && endDate ? `Từ ${startDate} đến ${endDate}` : 'Tất cả thời gian';
    const userStr = req.user?.fullName || req.user?.username || 'Admin';
    const workbook = buildExcelWorkbook(
      'BÁO CÁO TỔNG HỢP SỰ CỐ BÁO HỎNG VÀ SỬA CHỮA TÀI SẢN',
      `Khoảng thời gian: ${dateRangeStr} | Người xuất: ${userStr}`,
      headers,
      rows,
      'Sửa chữa'
    );

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=BaoCaoBaoHongSuaChua.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi xuất Excel: ' + error.message });
  }
});

export default router;
