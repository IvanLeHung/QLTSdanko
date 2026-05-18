import { Router } from 'express';
import { HandoverService } from '../services/handover.service';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { PdfUtil } from '../utils/pdf.util';

const router = Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { type, status, search, fromDate, toDate, page, limit, sortBy, sortOrder } = req.query;
    const list = await HandoverService.getHandoverList({
      type: type as string,
      status: status as string,
      search: search as string,
      fromDate: fromDate as string,
      toDate: toDate as string,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc'
    });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  const performedBy = req.user?.username || 'system';
  try {
    const document = await HandoverService.createHandover(req.body, performedBy);
    res.status(201).json(document);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/complete', authenticateToken, async (req: AuthRequest, res) => {
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

router.post('/:id/print', authenticateToken, async (req, res) => {
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

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const detail = await HandoverService.getHandoverDetail(Number(req.params.id));
    if (!detail) return res.status(404).json({ message: 'Không tìm thấy hồ sơ bàn giao.' });
    res.json(detail);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/:id', authenticateToken, async (req: AuthRequest, res) => {
  const performedBy = req.user?.username || 'system';
  try {
    const document = await HandoverService.updateHandover(Number(req.params.id), req.body, performedBy);
    res.json(document);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/:id/complete', authenticateToken, async (req: AuthRequest, res) => {
  const performedBy = req.user?.username || 'system';
  try {
    const document = await HandoverService.completeHandover(Number(req.params.id), performedBy);
    res.json(document);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/:id/confirm', authenticateToken, async (req: AuthRequest, res) => {
  const performedBy = req.user?.username || 'system';
  try {
    const document = await HandoverService.completeHandover(Number(req.params.id), performedBy);
    res.json(document);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/:id/cancel', authenticateToken, async (req: AuthRequest, res) => {
  const performedBy = req.user?.username || 'system';
  try {
    const document = await HandoverService.cancelHandover(Number(req.params.id), performedBy);
    res.json(document);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/bulk-cancel', authenticateToken, async (req: AuthRequest, res) => {
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

router.post('/export', authenticateToken, async (req, res) => {
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

router.post('/:id/pdf', authenticateToken, async (req, res) => {
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

router.get('/:id/pdf', authenticateToken, async (req, res) => {
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
