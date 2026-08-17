import { Router } from 'express';
import { authenticateToken, AuthRequest, requirePermission } from '../middleware/auth.middleware';
import { NormalizationService } from '../services/normalization.service';
import { AssigneeNormalizationService } from '../services/assignee-normalization.service';
import { buildDataScopeWhere } from '../utils/data-scope.util';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const getAssetScopeWhere = (req: AuthRequest) => {
  const where = buildDataScopeWhere(
    req.user?.dataScope,
    req.user?.id || 0,
    {
      company: 'companyCode',
      department: 'departmentName',
      warehouse: 'locationName',
      user: 'currentUserName'
    },
    req.user?.departmentName
  );

  const currentUserName = req.user?.fullName || req.user?.username || '';
  return JSON.parse(JSON.stringify(where).replace(/\{\{CURRENT_USER\}\}/g, currentUserName));
};

router.get('/assignees/suggestions', authenticateToken, requirePermission('PERMISSION_MANAGE'), async (req: AuthRequest, res) => {
  try {
    const result = await AssigneeNormalizationService.getSuggestions({
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      assetWhere: getAssetScopeWhere(req)
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/assignees/profiles', authenticateToken, requirePermission('PERMISSION_MANAGE'), async (req: AuthRequest, res) => {
  try {
    const result = await AssigneeNormalizationService.getProfiles({
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      assetWhere: getAssetScopeWhere(req)
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/assignees/merge', authenticateToken, requirePermission('PERMISSION_MANAGE'), async (req: AuthRequest, res) => {
  try {
    const { groupKey, canonicalName, primaryPhone, canonicalPosition, departmentName } = req.body || {};
    if (!groupKey || !canonicalName) {
      return res.status(400).json({ message: 'Thiếu nhóm gợi ý hoặc họ tên chuẩn.' });
    }
    const result = await AssigneeNormalizationService.mergeSuggestion({
      groupKey,
      canonicalName,
      primaryPhone,
      canonicalPosition,
      departmentName,
      reviewedBy: req.user?.username || 'system',
      assetWhere: getAssetScopeWhere(req)
    });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/assignees/not-duplicate', authenticateToken, requirePermission('PERMISSION_MANAGE'), async (req: AuthRequest, res) => {
  try {
    const { groupKey } = req.body || {};
    if (!groupKey) return res.status(400).json({ message: 'Thiếu nhóm gợi ý.' });
    const result = await AssigneeNormalizationService.markNotDuplicate({
      groupKey,
      reviewedBy: req.user?.username || 'system',
      assetWhere: getAssetScopeWhere(req)
    });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/assignees/decisions/:id/rollback', authenticateToken, requirePermission('PERMISSION_MANAGE'), async (req: AuthRequest, res) => {
  try {
    const result = await AssigneeNormalizationService.rollbackDecision(
      Number(req.params.id),
      req.user?.username || 'system'
    );
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

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

// Fetch grouped job suggestions
router.get('/jobs/:id/grouped-suggestions', authenticateToken, async (req, res) => {
  try {
    const { issueType, status, search } = req.query;
    const result = await NormalizationService.getGroupedSuggestions(Number(req.params.id), {
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
router.put('/suggestions/:id', authenticateToken, async (req: any, res) => {
  try {
    const { suggestedValue, reason, applyToAllSimilar } = req.body;
    const result = await NormalizationService.updateSuggestionValue(
      Number(req.params.id),
      suggestedValue,
      reason,
      applyToAllSimilar,
      req.user?.username
    );
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Approve a list of suggestions
router.post('/suggestions/approve-bulk', authenticateToken, async (req: any, res) => {
  try {
    const { ids, batchId } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ message: 'Invalid suggestions ids' });
    }
    const result = await NormalizationService.approveSuggestions(ids, req.user?.username || 'system', batchId);
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

// Fetch latest batch history for rollback
router.get('/history/batches', authenticateToken, async (req, res) => {
  try {
    const result = await NormalizationService.getLatestBatches();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Rollback a normalization batch
router.post('/rollback', authenticateToken, async (req, res) => {
  try {
    const { batchId } = req.body;
    if (!batchId) {
      return res.status(400).json({ message: 'Missing batchId' });
    }
    const result = await NormalizationService.rollbackBatch(batchId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get all user-defined rules
router.get('/rules', authenticateToken, async (req, res) => {
  try {
    const rules = await NormalizationService.getRules();
    res.json(rules);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a normalization rule
router.delete('/rules/:id', authenticateToken, async (req, res) => {
  try {
    const result = await NormalizationService.deleteRule(Number(req.params.id));
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Import rules mapping from Excel
router.post('/rules/import', authenticateToken, upload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const result = await NormalizationService.importRulesFromExcel(req.file.buffer, req.user?.username || 'system');
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
