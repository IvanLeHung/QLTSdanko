import { Router } from 'express';
import { LostService } from '../services/lost.service';

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

export default router;
