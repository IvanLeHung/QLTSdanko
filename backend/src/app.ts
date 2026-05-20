import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Routes (to be implemented)
import authRoutes from './routes/auth.routes';
import assetRoutes from './routes/asset.routes';
import settingsRoutes from './routes/settings.routes';
import dashboardRoutes from './routes/dashboard.routes';
import inventoryRoutes from './routes/inventory.routes';
import repairRoutes from './routes/repair.routes';
import handoverRoutes from './routes/handover.routes';
import lostRoutes from './routes/lost.routes';
import documentRoutes from './routes/document.routes';
import importRoutes from './routes/import.routes';
import operationalRoutes from './routes/operational.routes';
import creationRoutes from './routes/creation.routes';
import auditRoutes from './routes/audit.routes';
import adminRoutes from './routes/admin.routes';
import historyImportRoutes from './routes/history-import.routes';
import templateRoutes from './routes/template.routes';
import { auditMiddleware } from './middleware/audit.middleware';
import { authenticateToken, loadPermissions } from './middleware/auth.middleware';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Apply audit middleware globally
app.use(auditMiddleware);

// Public or semi-public routes
app.use('/api/auth', authRoutes);

// Protected routes that need permissions loaded
const protectedApi = express.Router();
protectedApi.use(authenticateToken);
protectedApi.use(loadPermissions);

protectedApi.use('/admin', adminRoutes);
protectedApi.use('/assets/history-import', historyImportRoutes);
protectedApi.use('/assets', assetRoutes);
protectedApi.use('/settings', settingsRoutes);
protectedApi.use('/dashboard', dashboardRoutes);
protectedApi.use('/inventory', inventoryRoutes);
protectedApi.use('/repairs', repairRoutes);
protectedApi.use('/handover', handoverRoutes);
protectedApi.use('/asset-transfers', handoverRoutes);
protectedApi.use('/lost', lostRoutes);
protectedApi.use('/documents', documentRoutes);
protectedApi.use('/import', importRoutes);
protectedApi.use('/operational', operationalRoutes);
protectedApi.use('/creation', creationRoutes);
protectedApi.use('/audit', auditRoutes);
protectedApi.use('/templates', templateRoutes);

app.use('/api', protectedApi);

// Serve React frontend static files in production
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(process.cwd(), 'frontend', 'dist');
  app.use(express.static(frontendDist));
  // SPA fallback: serve index.html for all non-API routes
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    message: err.message || 'Internal Server Error',
  });
});

export default app;

