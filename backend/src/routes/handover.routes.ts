import { Router } from 'express';
import { HandoverService } from '../services/handover.service';
import { authenticateToken, AuthRequest, requirePermission } from '../middleware/auth.middleware';
import { PdfUtil } from '../utils/pdf.util';
import { buildDataScopeWhere } from '../utils/data-scope.util';

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

router.get('/:id/pdf', authenticateToken, requirePermission('TRANSFER_PRINT_PDF'), async (req, res) => {
  try {
    const detail = await HandoverService.getHandoverDetail(Number(req.params.id));
    if (!detail) return res.status(404).json({ message: 'Không tìm thấy hồ sơ bàn giao.' });

    const pdfBuffer = await PdfUtil.generateHandoverPdf(detail);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=BBBG_${detail.documentNo.replace('/', '_')}.pdf`);
    res.send(pdfBuffer);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
