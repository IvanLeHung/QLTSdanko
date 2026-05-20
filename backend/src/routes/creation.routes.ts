import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { CreationService } from '../services/creation.service';

const router = Router();

router.post('/batch', authenticateToken, async (req: any, res) => {
  try {
    const batch = await CreationService.createBatch(req.body, req.user.username);
    res.json(batch);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/batches', authenticateToken, async (req, res) => {
  try {
    const batches = await CreationService.getBatchList();
    res.json(batches);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
