import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { NormalizationService } from '../services/normalization.service';

const router = Router();

// Create and start a new scan job
router.post('/jobs', authenticateToken, async (req: any, res) => {
  try {
    const job = await NormalizationService.createNormalizationJob(req.body, req.user?.username || 'system');
    res.status(201).json(job);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Fetch job status and progress
router.get('/jobs/:id', authenticateToken, async (req, res) => {
  try {
    const job = await NormalizationService.getJobStatus(Number(req.params.id));
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.json(job);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Fetch job suggestions
router.get('/jobs/:id/suggestions', authenticateToken, async (req, res) => {
  try {
    const { page, limit, issueType, status, search } = req.query;
    const result = await NormalizationService.getJobSuggestions(Number(req.params.id), {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      issueType: issueType as string,
      status: status as string,
      search: search as string
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Update a suggestion proposed value/fields
router.put('/suggestions/:id', authenticateToken, async (req, res) => {
  try {
    const { suggestedValue, reason } = req.body;
    const result = await NormalizationService.updateSuggestionValue(Number(req.params.id), suggestedValue, reason);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Approve a list of suggestions
router.post('/suggestions/approve-bulk', authenticateToken, async (req: any, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ message: 'Invalid suggestions ids' });
    }
    const result = await NormalizationService.approveSuggestions(ids, req.user?.username || 'system');
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Reject a list of suggestions
router.post('/suggestions/reject-bulk', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ message: 'Invalid suggestions ids' });
    }
    const result = await NormalizationService.rejectSuggestions(ids);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Fetch historical audit log of normalizations
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { page, limit } = req.query;
    const result = await NormalizationService.getHistoryLogs({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
