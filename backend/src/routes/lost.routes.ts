import { Router } from 'express';
import { LostService } from '../services/lost.service';
import prisma from '../utils/prisma';
import { authenticateToken, AuthRequest, requirePermission } from '../middleware/auth.middleware';
import { buildExcelWorkbook, formatDate } from '../utils/excel.util';
import { buildDataScopeWhere } from '../utils/data-scope.util';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const reports = await LostService.getAllReports(req.query);
    res.json(reports);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const report = await LostService.getReportById(parseInt(req.params.id));
    if (!report) return res.status(404).json({ message: 'Report not found' });
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const report = await LostService.reportLost(req.body);
    res.json(report);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/:id/find', async (req, res) => {
  try {
    const report = await LostService.findAsset(parseInt(req.params.id), req.body);
    res.json(report);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/:id/close', async (req, res) => {
  try {
    const report = await LostService.closeReport(parseInt(req.params.id), req.body);
    res.json(report);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// GET /export-by-time - Báo mất tài sản (Lost assets reports by Date Range)
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
      const workbook = buildExcelWorkbook('DANH SÁCH PHIẾU BÁO MẤT TÀI SẢN', 'Không tìm thấy dữ liệu', [], [], 'Báo mất');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=BaoCaoBaoMat.xlsx');
      await workbook.xlsx.write(res);
      return res.end();
    }
    where.asset = scopeWhere;
  }

  try {
    const reports = await prisma.lostReport.findMany({
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
      'Mã vụ mất', 'Mã tài sản', 'Tên tài sản', 'Ngày báo mất', 'Người báo mất',
      'Người chịu trách nhiệm', 'Bộ phận chịu trách nhiệm', 'Vị trí cuối cùng thấy',
      'Mô tả vụ việc',
      ...(hasPricePermission ? ['Nguyên giá tài sản', 'Giá trị còn lại'] : []),
      'Ghi chú đền bù', 'Trạng thái vụ việc', 'Ngày tìm thấy', 'Tình trạng khi tìm thấy', 'Ngày đóng hồ sơ'
    ];

    const rows = reports.map(r => [
      r.lostCode,
      r.asset.assetCode,
      r.asset.assetName,
      formatDate(r.reportedDate),
      r.reportedBy || '',
      r.responsibleUser || '',
      r.responsibleDepartment || '',
      r.lastKnownLocation || '',
      r.incidentDescription || '',
      ...(hasPricePermission ? [r.asset.purchasePriceExVat, r.remainingValue] : []),
      r.compensationNote || '',
      r.status === 'LOST' ? 'Đang thất lạc' :
      r.status === 'FOUND' ? 'Đã tìm thấy' :
      r.status === 'CLOSED' ? 'Đã đóng hồ sơ' : r.status,
      formatDate(r.foundDate),
      r.conditionWhenFound || '',
      formatDate(r.completedAt)
    ]);

    const dateRangeStr = startDate && endDate ? `Từ ${startDate} đến ${endDate}` : 'Tất cả thời gian';
    const userStr = req.user?.fullName || req.user?.username || 'Admin';
    const workbook = buildExcelWorkbook(
      'BÁO CÁO TỔNG HỢP VỤ VIỆC BÁO MẤT TÀI SẢN',
      `Khoảng thời gian: ${dateRangeStr} | Người xuất: ${userStr}`,
      headers,
      rows,
      'Báo mất tài sản'
    );

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=BaoCaoBaoMatTaiSan.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi xuất Excel: ' + error.message });
  }
});

export default router;
