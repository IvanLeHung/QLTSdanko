import { Router } from 'express';
import prisma from '../utils/prisma';
import { EnterpriseService } from '../services/enterprise.service';

const financeRouter = Router();
const procurementRouter = Router();
const offlineRouter = Router();
const signatureRouter = Router();
const analyticsRouter = Router();
const integrationRouter = Router();
const notificationRouter = Router();

const actor = (req: any) => req.user?.fullName || req.user?.username || 'system';

financeRouter.get('/assets', async (_req, res) => {
  res.json(await EnterpriseService.listFinanceAssets());
});

financeRouter.post('/sync', async (req: any, res) => {
  res.json(await EnterpriseService.syncFinance(actor(req)));
});

procurementRouter.post('/requests', async (req: any, res) => {
  try {
    res.status(201).json(await EnterpriseService.createPurchaseRequest(req.body, actor(req)));
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

procurementRouter.get('/requests', async (_req, res) => {
  res.json(await prisma.purchaseRequest.findMany({ orderBy: { requestedAt: 'desc' }, include: { orders: true } }));
});

procurementRouter.post('/orders', async (req: any, res) => {
  try {
    res.status(201).json(await EnterpriseService.createPurchaseOrder(req.body, actor(req)));
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

procurementRouter.post('/receipts', async (req: any, res) => {
  try {
    res.status(201).json(await EnterpriseService.createGoodsReceipt(req.body, actor(req)));
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

offlineRouter.post('/queue', async (req: any, res) => {
  try {
    res.status(201).json(await EnterpriseService.queueOffline(req.body, req.user?.id));
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

offlineRouter.post('/sync', async (req, res) => {
  res.json(await EnterpriseService.syncOffline(String(req.body.deviceId || 'unknown')));
});

signatureRouter.post('/', async (req: any, res) => {
  try {
    res.status(201).json(await EnterpriseService.signDocument(req.body, actor(req)));
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

analyticsRouter.post('/aggregate', async (_req, res) => {
  res.json(await EnterpriseService.aggregateSnapshot());
});

analyticsRouter.get('/snapshots', async (_req, res) => {
  res.json(await EnterpriseService.dashboardSnapshots());
});

integrationRouter.post('/configs', async (req, res) => {
  try {
    const config = await prisma.integrationConfig.create({
      data: { type: req.body.type, endpoint: req.body.endpoint, authType: req.body.authType, status: req.body.status || 'ACTIVE' }
    });
    res.status(201).json(config);
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

integrationRouter.get('/configs', async (_req, res) => {
  res.json(await prisma.integrationConfig.findMany({ include: { logs: { take: 5, orderBy: { createdAt: 'desc' } } } }));
});

notificationRouter.get('/', async (req: any, res) => {
  res.json(await prisma.notification.findMany({ where: { OR: [{ userId: req.user?.id }, { userId: null }] }, orderBy: { createdAt: 'desc' }, take: 100 }));
});

notificationRouter.post('/', async (req, res) => {
  res.status(201).json(await prisma.notification.create({ data: req.body }));
});

export { financeRouter, procurementRouter, offlineRouter, signatureRouter, analyticsRouter, integrationRouter, notificationRouter };
