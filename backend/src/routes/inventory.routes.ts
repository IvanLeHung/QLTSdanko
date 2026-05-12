import { Router } from 'express';
import { InventoryService } from '../services/inventory.service';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const list = await InventoryService.getInventoryList();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const detail = await InventoryService.getInventoryDetail(Number(req.params.id));
    if (!detail) return res.status(404).json({ message: 'Session not found' });
    res.json(detail);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  const performedBy = req.user?.username || 'system';
  try {
    const session = await InventoryService.createInventorySession(req.body, performedBy);
    res.status(201).json(session);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/item/:id/check', authenticateToken, async (req: AuthRequest, res) => {
  const checkedBy = req.user?.username || 'system';
  try {
    const item = await InventoryService.submitItemCheck(Number(req.params.id), {
      ...req.body,
      checkedBy
    });
    res.json(item);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.patch('/:id/close', authenticateToken, async (req: AuthRequest, res) => {
  const performedBy = req.user?.username || 'system';
  try {
    const session = await InventoryService.closeInventorySession(Number(req.params.id), performedBy);
    res.json(session);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
