import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { config } from '../config.js';
import { getBalance, listTransactions } from '../services/credits.js';
import {
  completeTopupOrder,
  createTopupOrder,
  getPackages,
  listTopupOrders,
  toPublicOrder,
} from '../services/topup.js';

const router = Router();

router.get('/packages', authMiddleware, (_req, res) => {
  res.json({
    success: true,
    data: {
      packages: getPackages(),
      mockEnabled: config.topup.allowMock,
      firstTopupBonusPercent: config.topup.firstTopupBonusPercent,
    },
  });
});

router.get('/transactions', authMiddleware, (req, res) => {
  const txs = listTransactions(req.user!.userId);
  res.json({ success: true, data: { transactions: txs, balance: getBalance(req.user!.userId) } });
});

router.get('/topup/orders', authMiddleware, (req, res) => {
  const orders = listTopupOrders(req.user!.userId).map(toPublicOrder);
  res.json({ success: true, data: { orders, balance: getBalance(req.user!.userId) } });
});

router.post('/topup/create', authMiddleware, (req, res) => {
  const { package_id } = req.body as { package_id?: string };
  if (!package_id?.trim()) {
    res.status(400).json({ success: false, message: 'package_id là bắt buộc' });
    return;
  }

  try {
    const order = createTopupOrder(req.user!.userId, package_id.trim());
    res.status(201).json({
      success: true,
      data: {
        order: toPublicOrder(order),
        balance: getBalance(req.user!.userId),
        mockEnabled: config.topup.allowMock,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ success: false, message });
  }
});

router.post('/topup/confirm/:orderId', authMiddleware, (req, res) => {
  if (!config.topup.allowMock) {
    res.status(403).json({
      success: false,
      message: 'Mock top-up đã tắt. Tích hợp cổng thanh toán thật (VNPay/Momo/Stripe).',
    });
    return;
  }

  try {
    const result = completeTopupOrder(req.user!.userId, String(req.params.orderId));
    res.json({
      success: true,
      data: {
        order: toPublicOrder(result.order),
        balance: result.balance,
        credits_added: result.creditsAdded,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ success: false, message });
  }
});

export default router;
