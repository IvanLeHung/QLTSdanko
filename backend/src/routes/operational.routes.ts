import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { OperationalService } from '../services/operational.service';

const router = Router();

// --- DAMAGE REPORTS ---
router.post('/damage', authenticateToken, async (req: any, res) => {
  try {
    const report = await OperationalService.createDamageReport(req.body, req.user.username);
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// --- LOST REPORTS ---
router.post('/lost', authenticateToken, async (req: any, res) => {
  try {
    const report = await OperationalService.createLostReport(req.body, req.user.username);
    res.json(report);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// --- LIQUIDATION ---
router.post('/liquidation', authenticateToken, async (req: any, res) => {
  try {
    const record = await OperationalService.createLiquidation(req.body, req.user.username);
    res.json(record);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});


// --- PRINT LOG ---
router.post('/print-log', authenticateToken, async (req: any, res) => {
  try {
    const result = await OperationalService.logPrintAction(req.body, req.user.username);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
