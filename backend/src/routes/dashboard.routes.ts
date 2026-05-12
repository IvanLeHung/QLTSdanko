import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { AssetService } from '../services/asset.service';

const router = Router();

router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const summary = await AssetService.getDashboardSummary();
    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
