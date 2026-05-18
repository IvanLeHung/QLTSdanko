import { Router, Request, Response } from 'express';
import { AuditService } from '../services/audit.service';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// Get paginated audit logs
router.get('/', requirePermission('AUDIT_LOG_VIEW'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, action, entityType, keyword, performedBy, page, limit } = req.query;

    const result = await AuditService.getLogs({
      startDate: startDate as string,
      endDate: endDate as string,
      action: action as string,
      entityType: entityType as string,
      keyword: keyword as string,
      performedBy: performedBy as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50,
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Export audit logs to Excel
router.get('/export', requirePermission('AUDIT_LOG_EXPORT'), async (req: any, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, action, entityType, keyword, performedBy } = req.query;
    const requestUser = req.user?.fullName || req.user?.username || 'System';

    const workbook = await AuditService.exportExcel({
      startDate: startDate as string,
      endDate: endDate as string,
      action: action as string,
      entityType: entityType as string,
      keyword: keyword as string,
      performedBy: performedBy as string,
    }, requestUser);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=' + `audit_logs_${new Date().getTime()}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

export default router;
