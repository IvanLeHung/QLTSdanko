import { Router } from 'express';
import { HandoverService } from '../services/handover.service';
import { authenticateToken, AuthRequest, requirePermission } from '../middleware/auth.middleware';
import { PdfUtil } from '../utils/pdf.util';
import { buildDataScopeWhere } from '../utils/data-scope.util';
import prisma from '../utils/prisma';
import { buildExcelWorkbook, formatDate } from '../utils/excel.util';

const router = Router();

router.get('/', authenticateToken, requirePermission('TRANSFER_VIEW'), async (req: AuthRequest, res) => {
  try {
    const { type, status, search, fromDate, toDate, page, limit, sortBy, sortOrder } = req.query;
    
    // Build scope where
    const scopeWhere = buildDataScopeWhere(req.user?.dataScope, req.user?.id || 0, {
      company: 'dummy', // Handover doesn't have companyCode directly, we'd need to filter by recipient/sender/newLocation etc.
      department: 'dummy',
      warehouse: 'newLocation',
      user: 'recipientName'
    });
    
    // For Handover, data scope filtering is tricky. Usually we filter by senderName, recipientName, or newLocation.
    // To simplify for this RBAC demo, we'll pass scopeWhere down to the service to handle if needed.
    
    const list = await HandoverService.getHandoverList({
      type: type as string,
      status: status as string,
      search: search as string,
      fromDate: fromDate as string,
      toDate: toDate as string,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
      scopeWhere: scopeWhere // Pass to service
    });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', authenticateToken, requirePermission('TRANSFER_CREATE'), async (req: AuthRequest, res) => {
  const performedBy = req.user?.username || 'system';
  try {
    const document = await HandoverService.createHandover(req.body, performedBy);
    res.status(201).json(document);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/complete', authenticateToken, requirePermission('TRANSFER_COMPLETE'), async (req: AuthRequest, res) => {
  const performedBy = req.user?.username || 'system';
  try {
    const document = await HandoverService.createHandover({
      ...req.body,
      autoComplete: true
    }, performedBy);
    res.status(201).json({
      id: document.id,
      documentNo: document.documentNo,
      status: document.status,
      pdfUrl: `/api/handover/${document.id}/pdf`,
      updatedAssetsCount: document.items?.length || 0
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/:id/print', authenticateToken, requirePermission('TRANSFER_PRINT_PDF'), async (req, res) => {
  try {
    const detail = await HandoverService.getHandoverDetail(Number(req.params.id));
    if (!detail) return res.status(404).json({ message: 'Không tìm thấy hồ sơ bàn giao.' });
    res.json({
      id: detail.id,
      pdfUrl: `/api/handover/${detail.id}/pdf`
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', authenticateToken, requirePermission('TRANSFER_VIEW'), async (req, res) => {
  try {
    const detail = await HandoverService.getHandoverDetail(Number(req.params.id));
    if (!detail) return res.status(404).json({ message: 'Không tìm thấy hồ sơ bàn giao.' });
    res.json(detail);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/:id', authenticateToken, requirePermission('TRANSFER_CREATE'), async (req: AuthRequest, res) => {
  const performedBy = req.user?.username || 'system';
  try {
    const document = await HandoverService.updateHandover(Number(req.params.id), req.body, performedBy);
    res.json(document);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/:id/complete', authenticateToken, requirePermission('TRANSFER_COMPLETE'), async (req: AuthRequest, res) => {
  const performedBy = req.user?.username || 'system';
  try {
    const document = await HandoverService.completeHandover(Number(req.params.id), performedBy);
    res.json(document);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/:id/confirm', authenticateToken, requirePermission('TRANSFER_COMPLETE'), async (req: AuthRequest, res) => {
  const performedBy = req.user?.username || 'system';
  try {
    const document = await HandoverService.completeHandover(Number(req.params.id), performedBy);
    res.json(document);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/:id/cancel', authenticateToken, requirePermission('TRANSFER_CANCEL'), async (req: AuthRequest, res) => {
  const performedBy = req.user?.username || 'system';
  try {
    const document = await HandoverService.cancelHandover(Number(req.params.id), performedBy);
    res.json(document);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/:id/reverse', authenticateToken, requirePermission('TRANSFER_CANCEL'), async (req: AuthRequest, res) => {
  const performedBy = req.user?.username || 'system';
  try {
    const document = await HandoverService.reverseHandover(
      Number(req.params.id),
      req.body?.reason,
      performedBy
    );
    res.json(document);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/bulk-cancel', authenticateToken, requirePermission('TRANSFER_CANCEL'), async (req: AuthRequest, res) => {
  const performedBy = req.user?.username || 'system';
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ message: 'Vui lòng cung cấp danh sách ID hồ sơ cần hủy.' });
  }
  try {
    const documents = await HandoverService.bulkCancelHandovers(ids, performedBy);
    res.json({ message: `Đã hủy thành công ${documents.length} hồ sơ.`, items: documents });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/export', authenticateToken, requirePermission('TRANSFER_EXPORT'), async (req, res) => {
  const { ids } = req.body;
  try {
    const csvContent = await HandoverService.exportHandovers(ids);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=danh_sach_ban_giao_dieu_chuyen.csv');
    res.send(csvContent);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/pdf', authenticateToken, requirePermission('TRANSFER_PRINT_PDF'), async (req, res) => {
  try {
    const detail = await HandoverService.getHandoverDetail(Number(req.params.id));
    if (!detail) return res.status(404).json({ message: 'Không tìm thấy hồ sơ bàn giao.' });
    
    res.json({
      success: true,
      pdfUrl: `/api/handover/${req.params.id}/pdf`
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id/pdf', authenticateToken, requirePermission('TRANSFER_PRINT_PDF'), async (req: AuthRequest, res) => {
  try {
    const detail = await HandoverService.getHandoverDetail(Number(req.params.id));
    if (!detail) return res.status(404).json({ message: 'Không tìm thấy hồ sơ bàn giao.' });

    // Fetch dynamic template if any
    let moduleKey = 'HANDOVER';
    if (detail.type === 'TRANSFER' || detail.type === 'LOCATION_TRANSFER') moduleKey = 'TRANSFER';
    if (detail.type === 'REVOKE' || detail.type === 'RECALL') moduleKey = 'RECALL';

    const prismaInstance = require('../utils/prisma').default;
    const defaultTemplate = await prismaInstance.template.findFirst({
      where: { module: moduleKey, isDefault: true, status: 'ACTIVE' }
    });

    let pdfBuffer;
    if (defaultTemplate) {
      try {
        const config = JSON.parse(defaultTemplate.configJson);
        pdfBuffer = await PdfUtil.generateHandoverPdf(detail, { 
          configJson: config,
          templateName: defaultTemplate.name,
          templateCode: defaultTemplate.code
        });
        
        // Log template usage in background
        const { TemplateService } = require('../services/template.service');
        TemplateService.logUsage(defaultTemplate.id, String(detail.id), detail.documentNo, req.user?.id);
      } catch (err) {
        console.error('Failed to generate PDF with custom template config, falling back to default:', err);
        pdfBuffer = await PdfUtil.generateHandoverPdf(detail);
      }
    } else {
      pdfBuffer = await PdfUtil.generateHandoverPdf(detail);
    }
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=BBBG_${detail.documentNo.replace('/', '_')}.pdf`);
    res.send(pdfBuffer);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// GET /export-by-time - Bàn giao / Điều chuyển / Thu hồi (Handover & Transfer Documents by Date Range)
router.get('/export-by-time', authenticateToken, requirePermission('TRANSFER_VIEW'), async (req: AuthRequest, res) => {
  const { startDate, endDate } = req.query;
  const where: any = {};

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(String(startDate));
    if (endDate) {
      const end = new Date(String(endDate));
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  // Data Scope
  const scopeWhere = buildDataScopeWhere(req.user?.dataScope, req.user?.id || 0, {
    company: 'dummy',
    department: 'dummy',
    warehouse: 'newLocation',
    user: 'recipientName'
  });
  if (Object.keys(scopeWhere).length > 0) {
    if (scopeWhere.id === -1) {
      const workbook = buildExcelWorkbook('DANH SÁCH BÀN GIAO - ĐIỀU CHUYỂN', 'Không tìm thấy dữ liệu', [], [], 'Bàn giao');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=BaoCaoBanGiao.xlsx');
      await workbook.xlsx.write(res);
      return res.end();
    }
    const orConds = [];
    if (scopeWhere.recipientName) orConds.push({ recipientName: scopeWhere.recipientName });
    if (scopeWhere.newLocation) orConds.push({ newLocation: scopeWhere.newLocation });
    if (orConds.length > 0) {
      where.OR = orConds;
    }
  }

  try {
    const documents = await prisma.handoverDocument.findMany({
      where,
      include: {
        items: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const headers = [
      'Số biên bản', 'Loại hồ sơ', 'Trạng thái', 'Người giao', 'Phòng ban giao',
      'Người nhận', 'Phòng ban nhận', 'Nơi nhận mới', 'Lý do', 'Ghi chú',
      'Ngày tạo', 'Ngày xác nhận', 'Mã tài sản bàn giao', 'Tên tài sản bàn giao',
      'Đơn vị tính', 'Trạng thái trước', 'Trạng thái sau'
    ];

    const rows: any[][] = [];
    documents.forEach(doc => {
      const docType = doc.type === 'HANDOVER' ? 'Bàn giao' :
                      doc.type === 'TRANSFER' ? 'Điều chuyển' :
                      doc.type === 'LOCATION_TRANSFER' ? 'Điều chuyển vị trí' :
                      doc.type === 'REVOKE' || doc.type === 'RECALL' ? 'Thu hồi' : doc.type;

      const docStatus = doc.status === 'DRAFT' ? 'Nháp' :
                        doc.status === 'PENDING_CONFIRMATION' ? 'Chờ xác nhận' :
                        doc.status === 'COMPLETED' ? 'Hoàn thành' :
                        doc.status === 'REVERSED' ? 'Đã hoàn tác' :
                        doc.status === 'CANCELLED' ? 'Đã hủy' : doc.status;

      if (doc.items && doc.items.length > 0) {
        doc.items.forEach(item => {
          rows.push([
            doc.documentNo,
            docType,
            docStatus,
            doc.senderName || '',
            doc.senderDepartment || '',
            doc.recipientType === 'AREA' ? (doc.recipientArea || doc.newLocation || '') : doc.recipientName,
            doc.recipientDepartment || '',
            doc.newLocation || '',
            doc.reason || '',
            doc.note || '',
            formatDate(doc.createdAt),
            formatDate(doc.confirmedAt),
            item.assetCode,
            item.assetName,
            item.unit || 'Cái',
            item.oldStatus === 'IN_STOCK' ? 'Trong kho' : item.oldStatus || '',
            item.newStatus === 'ASSIGNED' ? 'Đã cấp phát' : item.newStatus || ''
          ]);
        });
      } else {
        rows.push([
          doc.documentNo,
          docType,
          docStatus,
          doc.senderName || '',
          doc.senderDepartment || '',
          doc.recipientType === 'AREA' ? (doc.recipientArea || doc.newLocation || '') : doc.recipientName,
          doc.recipientDepartment || '',
          doc.newLocation || '',
          doc.reason || '',
          doc.note || '',
          formatDate(doc.createdAt),
          formatDate(doc.confirmedAt),
          '',
          '',
          '',
          '',
          ''
        ]);
      }
    });

    const dateRangeStr = startDate && endDate ? `Từ ${startDate} đến ${endDate}` : 'Tất cả thời gian';
    const userStr = req.user?.fullName || req.user?.username || 'Admin';
    const workbook = buildExcelWorkbook(
      'BÁO CÁO TỔNG HỢP BÀN GIAO / ĐIỀU CHUYỂN TÀI SẢN',
      `Khoảng thời gian: ${dateRangeStr} | Người xuất: ${userStr}`,
      headers,
      rows,
      'Bàn giao Điều chuyển'
    );

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=BaoCaoBanGiaoDieuChuyen.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    res.status(500).json({ message: 'Lỗi xuất Excel: ' + error.message });
  }
});

export default router;
