import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getDashboardStats, type DashboardPeriod } from '../services/dashboard.js';

const router = Router();

const VALID_PERIODS = new Set<DashboardPeriod>(['7d', '30d', 'all']);

router.get('/stats', authMiddleware, (req, res) => {
  const raw = String(req.query.period || '7d');
  const period: DashboardPeriod = VALID_PERIODS.has(raw as DashboardPeriod)
    ? (raw as DashboardPeriod)
    : '7d';

  const stats = getDashboardStats(req.user!.userId, period);
  res.json({ success: true, data: stats });
});

export default router;
