import { Router } from 'express';
import { createPayOsPayment, verifyPayOsKeys, verifyPayOsWebhookSignature } from '../services/payos.js';
import { config, isPayOsConfigured } from '../config.js';

const router = Router();

router.get('/status', async (_req, res) => {
  const configured = isPayOsConfigured();
  const verify = configured ? await verifyPayOsKeys() : { ok: false, message: 'Thiếu PayOS key trong .env' };
  res.json({
    success: true,
    data: {
      configured,
      valid: verify.ok,
      message: verify.message,
      returnUrl: config.payos.returnUrl,
      webhookUrl: config.payos.webhookUrl || null,
    },
  });
});

router.post('/payment-requests', async (req, res) => {
  try {
    const planId = String(req.body?.planId || '').trim();
    const planName = String(req.body?.planName || 'Gói đăng ký').trim();
    const amount = Number(req.body?.amount);

    if (!planId) {
      res.status(400).json({ success: false, message: 'Thiếu planId' });
      return;
    }

    const payment = await createPayOsPayment({ planId, planName, amount });
    res.json({ success: true, data: payment });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message });
  }
});

router.post('/webhook', (req, res) => {
  try {
    const body = (req.body || {}) as Record<string, unknown>;
    const signature = String(body.signature || req.headers['x-payos-signature'] || '');

    if (!verifyPayOsWebhookSignature(body, signature)) {
      res.status(400).json({ success: false, message: 'Invalid PayOS signature' });
      return;
    }

    // TODO: kích hoạt gói / ghi log giao dịch khi code === '00' && data.status === 'PAID'
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message });
  }
});

export default router;
