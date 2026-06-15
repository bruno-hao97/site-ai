import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import creditsRoutes from './routes/credits.js';
import jobsRoutes from './routes/jobs.js';
import dashboardRoutes from './routes/dashboard.js';
import apiKeysRoutes from './routes/apiKeys.js';
import { config } from './config.js';
import './db.js';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      ok: true,
      gommoConfigured: Boolean(config.gommo.accessToken),
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/api-keys', apiKeysRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ success: false, message: err.message || 'Internal error' });
});

app.listen(config.port, () => {
  console.log(`API server http://localhost:${config.port}`);
  if (!config.gommo.accessToken) {
    console.warn('⚠ GOMMO_ACCESS_TOKEN chưa set — tạo job sẽ lỗi');
  }
});
