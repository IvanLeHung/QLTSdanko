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

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/repairs', repairRoutes);
app.use('/api/handover', handoverRoutes);
app.use('/api/asset-transfers', handoverRoutes);
app.use('/api/lost', lostRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/import', importRoutes);
app.use('/api/operational', operationalRoutes);
app.use('/api/creation', creationRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    message: err.message || 'Internal Server Error',
  });
});

export default app;
