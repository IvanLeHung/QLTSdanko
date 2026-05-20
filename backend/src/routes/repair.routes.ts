import { Router } from 'express';
import { RepairService } from '../services/repair.service';

const router = Router();

// Get all repair tickets
router.get('/', async (req, res) => {
  try {
    const tickets = await RepairService.getAllTickets(req.query);
    res.json(tickets);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get ticket by ID
router.get('/:id', async (req, res) => {
  try {
    const ticket = await RepairService.getTicketById(parseInt(req.params.id));
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    res.json(ticket);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Create new repair ticket
router.post('/', async (req, res) => {
  try {
    const ticket = await RepairService.createTicket(req.body);
    res.json(ticket);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Update ticket progress
router.put('/:id/progress', async (req, res) => {
  try {
    const ticket = await RepairService.updateProgress(parseInt(req.params.id), req.body);
    res.json(ticket);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Complete repair
router.post('/:id/complete', async (req, res) => {
  try {
    const ticket = await RepairService.completeRepair(parseInt(req.params.id), req.body);
    res.json(ticket);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Get repairs for an asset
router.get('/asset/:assetId', async (req, res) => {
  try {
    const repairs = await RepairService.getAssetRepairs(parseInt(req.params.assetId));
    res.json(repairs);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
