import { Router, Response } from 'express';
import { AuthRequest, requirePermission } from '../middleware/auth.middleware';
import { InventoryClosingError, InventoryClosingService } from '../services/inventory-closing.service';

const router = Router();

function ok(res: Response, data: any, status = 200, message = 'OK') {
  return res.status(status).json({ success: true, data, message });
}

function fail(res: Response, error: any) {
  if (error instanceof InventoryClosingError) {
    return res.status(error.httpStatus).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details || null,
      },
    });
  }

  console.error('Inventory closing error:', error);
  return res.status(500).json({
    success: false,
    error: {
      code: 'INVENTORY_CLOSING_INTERNAL_ERROR',
      message: error?.message || 'Internal Server Error',
      details: null,
    },
  });
}

router.get('/closing/health', requirePermission('INVENTORY_VIEW'), async (_req: AuthRequest, res) => {
  try {
    const data = await InventoryClosingService.getHealth();
    return ok(res, data);
  } catch (error) {
    return fail(res, error);
  }
});

router.get('/:id/closing/statistics', requirePermission('INVENTORY_VIEW'), async (req: AuthRequest, res) => {
  try {
    const data = await InventoryClosingService.getStatistics(Number(req.params.id));
    return ok(res, data);
  } catch (error) {
    return fail(res, error);
  }
});

router.post('/:id/closing/validate-scope', requirePermission('INVENTORY_VIEW'), async (req: AuthRequest, res) => {
  try {
    const data = await InventoryClosingService.validateScope(Number(req.params.id), req.body?.scopes || []);
    return ok(res, data);
  } catch (error) {
    return fail(res, error);
  }
});

router.post('/:id/closing/validate', requirePermission('INVENTORY_VIEW'), async (req: AuthRequest, res) => {
  try {
    const data = await InventoryClosingService.validateScope(Number(req.params.id), req.body?.scopes || []);
    return ok(res, data);
  } catch (error) {
    return fail(res, error);
  }
});

router.get('/:id/closing-records', requirePermission('INVENTORY_VIEW'), async (req: AuthRequest, res) => {
  try {
    const data = await InventoryClosingService.listClosingRecords(Number(req.params.id));
    return ok(res, data);
  } catch (error) {
    return fail(res, error);
  }
});

router.post('/:id/closing', requirePermission('INVENTORY_MANAGE'), async (req: AuthRequest, res) => {
  try {
    const data = await InventoryClosingService.createClosingRecord(Number(req.params.id), req.body || {}, req.user);
    return ok(res, data, 201, 'Created');
  } catch (error) {
    return fail(res, error);
  }
});

router.get('/closing-records/:closingId', requirePermission('INVENTORY_VIEW'), async (req: AuthRequest, res) => {
  try {
    const data = await InventoryClosingService.getClosingRecord(Number(req.params.closingId));
    return ok(res, data);
  } catch (error) {
    return fail(res, error);
  }
});

router.post('/closing-records/:closingId/sign', requirePermission('INVENTORY_MANAGE'), async (req: AuthRequest, res) => {
  try {
    const data = await InventoryClosingService.signClosing(Number(req.params.closingId), req.body || {}, req.user);
    return ok(res, data);
  } catch (error) {
    return fail(res, error);
  }
});

router.post('/closing-records/:closingId/finalize', requirePermission('INVENTORY_MANAGE'), async (req: AuthRequest, res) => {
  try {
    const data = await InventoryClosingService.finalizeClosing(Number(req.params.closingId), req.body || {}, req.user);
    return ok(res, data, (data as any)?.processing ? 202 : 200);
  } catch (error) {
    return fail(res, error);
  }
});

router.post('/closing-records/:closingId/reopen', requirePermission('INVENTORY_MANAGE'), async (req: AuthRequest, res) => {
  try {
    const data = await InventoryClosingService.reopenClosing(Number(req.params.closingId), req.body || {}, req.user);
    return ok(res, data);
  } catch (error) {
    return fail(res, error);
  }
});

router.post('/closing-records/:closingId/cancel-scope', requirePermission('INVENTORY_MANAGE'), async (req: AuthRequest, res) => {
  try {
    const data = await InventoryClosingService.cancelScope(Number(req.params.closingId), Number(req.body?.scopeId), req.user);
    return ok(res, data);
  } catch (error) {
    return fail(res, error);
  }
});

export default router;
