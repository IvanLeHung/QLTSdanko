import { Router } from 'express';
import { HandoverService } from '../services/handover.service';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { PdfUtil } from '../utils/pdf.util';

const router = Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const list = await HandoverService.getHandoverList();
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

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const detail = await HandoverService.getHandoverDetail(Number(req.params.id));
    if (!detail) return res.status(404).json({ message: 'Handover document not found' });
    res.json(detail);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
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

router.get('/:id/pdf', authenticateToken, async (req, res) => {
  try {
    const detail = await HandoverService.getHandoverDetail(Number(req.params.id));
    if (!detail) return res.status(404).json({ message: 'Handover document not found' });

    const pdfBuffer = await PdfUtil.generateHandoverPdf(detail);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=BBBG_${detail.documentNo.replace('/', '_')}.pdf`);
    res.send(pdfBuffer);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
