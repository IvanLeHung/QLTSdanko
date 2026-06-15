import { Router } from 'express';
import prisma from '../utils/prisma';
import { SmartAIService } from '../services/smart-ai.service';

const aiRouter = Router();
const searchRouter = Router();
const assistantRouter = Router();
const automationRouter = Router();

const actor = (req: any) => req.user?.fullName || req.user?.username || 'system';

aiRouter.post('/normalize/start', async (req: any, res) => {
  try {
    const job = await SmartAIService.startNormalization(actor(req), req.body?.type || 'ASSET');
    res.status(201).json(job);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

aiRouter.get('/normalize/jobs', async (_req, res) => {
  res.json(await SmartAIService.listNormalizationJobs());
});

aiRouter.get('/normalize/:jobId/results', async (req, res) => {
  res.json(await SmartAIService.normalizationResults(parseInt(req.params.jobId, 10)));
});

aiRouter.post('/normalize/:suggestionId/approve', async (req: any, res) => {
  try {
    res.json(await SmartAIService.approveSuggestion(parseInt(req.params.suggestionId, 10), actor(req)));
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

aiRouter.post('/normalize/:suggestionId/reject', async (req: any, res) => {
  try {
    res.json(await SmartAIService.rejectSuggestion(parseInt(req.params.suggestionId, 10), req.body?.reason || 'Rejected', actor(req)));
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

aiRouter.post('/find-duplicates', async (_req, res) => {
  res.json(await SmartAIService.findDuplicates());
});

aiRouter.get('/anomalies', async (_req, res) => {
  res.json(await SmartAIService.listAnomalies());
});

searchRouter.post('/smart', async (req, res) => {
  res.json(await SmartAIService.smartSearch(String(req.body?.query || '')));
});

assistantRouter.post('/query', async (req, res) => {
  res.json(await SmartAIService.assistantQuery(String(req.body?.query || '')));
});

automationRouter.post('/rules', async (req: any, res) => {
  try {
    const rule = await prisma.automationRule.create({
      data: {
        trigger: String(req.body.trigger || ''),
        condition: req.body.condition ? JSON.stringify(req.body.condition) : null,
        action: String(req.body.action || ''),
        enabled: req.body.enabled !== false,
        createdBy: actor(req)
      }
    });
    res.status(201).json(rule);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

automationRouter.get('/tasks', async (_req, res) => {
  const rules = await prisma.automationRule.findMany({ where: { enabled: true } });
  const damagedChildren = await prisma.cCDCChildItem.findMany({ where: { childStatus: 'DAMAGED', deletedAt: null }, take: 100 });
  for (const child of damagedChildren) {
    const existing = await prisma.automationTask.findFirst({ where: { entityType: 'CCDC_CHILD', entityId: child.id, status: 'OPEN' } });
    const rule = rules.find(r => r.trigger === 'ASSET_DAMAGED' || r.trigger === 'REPAIR_OVERDUE');
    if (!existing && rule) {
      await prisma.automationTask.create({
        data: {
          ruleId: rule.id,
          title: `Xử lý CCDC hỏng ${child.childCode}`,
          description: child.note || 'Tự động sinh từ trạng thái DAMAGED',
          priority: 'HIGH',
          entityType: 'CCDC_CHILD',
          entityId: child.id
        }
      });
    }
  }
  res.json(await prisma.automationTask.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }));
});

export { aiRouter, searchRouter, assistantRouter, automationRouter };
