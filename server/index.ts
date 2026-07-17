import express from 'express';
import cors from 'cors';
import gommoProxyRoutes from './routes/gommoProxy.js';
import payosRoutes from './routes/payos.js';
import telegramRoutes from './routes/telegram.js';
import opsRoutes from './routes/ops.js';
import { config, isTelegramConfigured } from './config.js';

const app = express();

app.use(cors({ origin: true, credentials: true }));

// Gommo pass-through proxy (che URL upstream) — mount TRƯỚC express.json vì cần raw body.
app.use(gommoProxyRoutes);

app.use(express.json({ limit: '25mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      ok: true,
      mode: 'payos-topup-api',
      telegram: isTelegramConfigured(),
    },
  });
});

app.use('/api/payos', payosRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/ops', opsRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ success: false, message: err.message || 'Internal error' });
});

app.listen(config.port, () => {
  console.log(
    `API server http://localhost:${config.port} (Gommo proxy + PayOS${isTelegramConfigured() ? ' + Telegram' : ''})`,
  );
});
