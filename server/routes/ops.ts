import { Router } from 'express';
import {
  config,
  isGommoMerchantConfigured,
  isPayOsConfigured,
  isTelegramConfigured,
} from '../config.js';
import {
  fetchMerchantCreditsAi,
  GOMMO_MIN_REMAINING_AFTER_SEND,
  requiredMerchantCredits,
} from '../services/gommoMerchantBalance.js';
import { sumReservedTopupCredits } from '../services/topupOrders.js';
import { CREDIT_PACKAGES } from '../services/creditPackages.js';
import { getTelegramWebhookInfo, notifyTelegramAdmins } from '../services/telegram.js';
import { verifyPayOsKeys } from '../services/payos.js';

const router = Router();

function opsKeyOk(req: { headers: Record<string, unknown>; body?: unknown }): boolean {
  const expected = (config.telegram.webhookSecret || process.env.OPS_STATUS_KEY || '').trim();
  if (!expected) return false;
  const header = String(req.headers['x-ops-key'] || '');
  const bodyKey =
    req.body && typeof req.body === 'object' && 'setupKey' in (req.body as object)
      ? String((req.body as { setupKey?: string }).setupKey || '')
      : '';
  return header === expected || bodyKey === expected;
}

router.get('/status', async (req, res) => {
  const detail = opsKeyOk(req);
  const payosConfigured = isPayOsConfigured();
  const merchantConfigured = isGommoMerchantConfigured();
  const telegramConfigured = isTelegramConfigured();

  let payosValid: boolean | null = null;
  let payosMessage: string | null = null;
  if (payosConfigured) {
    try {
      const v = await verifyPayOsKeys();
      payosValid = v.ok;
      payosMessage = v.message;
    } catch (err) {
      payosValid = false;
      payosMessage = err instanceof Error ? err.message : String(err);
    }
  }

  const base = {
    ok: true,
    mcp: {
      cursorServer: 'user-79ai',
      note: 'MCP chỉ dùng trong Cursor. Site dùng REST Gommo + PayOS + Telegram bot.',
      toolsHint: [
        'gommo_account_info',
        'gommo_credit_balance',
        'gommo_models_list',
        'gommo_image_create',
        'gommo_video_create',
        'gommo_notify_send',
      ],
    },
    payos: {
      configured: payosConfigured,
      valid: payosValid,
      message: payosMessage,
      webhookUrl: config.payos.webhookUrl || null,
    },
    merchant: {
      configured: merchantConfigured,
      domain: config.gommo.apiDomain,
      minRemainingAfterSend: GOMMO_MIN_REMAINING_AFTER_SEND,
      bufferCredits: config.topup.merchantBufferCredits,
    },
    telegram: {
      configured: telegramConfigured,
      notifyChatIdsConfigured: config.telegram.notifyChatIds.length,
      webhookUrl: config.telegram.webhookUrl || null,
    },
    packages: CREDIT_PACKAGES.map((p) => ({
      id: p.id,
      credits: p.credits,
      amountVnd: p.amountVnd,
      requiredMerchant: requiredMerchantCredits(p.credits, config.topup.merchantBufferCredits),
    })),
  };

  if (!detail) {
    res.json({
      success: true,
      data: {
        ...base,
        detail: false,
        hint: 'Gửi header x-ops-key (= TELEGRAM_WEBHOOK_SECRET hoặc OPS_STATUS_KEY) để xem số dư merchant / webhook Telegram.',
      },
    });
    return;
  }

  let merchantBalance: number | null = null;
  let reservedCredits = 0;
  let merchantError: string | null = null;
  let telegramWebhook: unknown = null;
  let telegramWebhookError: string | null = null;

  if (merchantConfigured) {
    try {
      [merchantBalance, reservedCredits] = await Promise.all([
        fetchMerchantCreditsAi(),
        sumReservedTopupCredits(),
      ]);
    } catch (err) {
      merchantError = err instanceof Error ? err.message : String(err);
    }
  }

  if (telegramConfigured) {
    try {
      telegramWebhook = await getTelegramWebhookInfo();
    } catch (err) {
      telegramWebhookError = err instanceof Error ? err.message : String(err);
    }
  }

  const available =
    merchantBalance == null ? null : Math.max(0, merchantBalance - reservedCredits);

  res.json({
    success: true,
    data: {
      ...base,
      detail: true,
      merchant: {
        ...base.merchant,
        balance: merchantBalance,
        reservedPendingCredits: reservedCredits,
        available,
        error: merchantError,
      },
      telegram: {
        ...base.telegram,
        webhook: telegramWebhook,
        webhookError: telegramWebhookError,
      },
    },
  });
});

/** Ping admin Telegram — cần x-ops-key. */
router.post('/notify-test', async (req, res) => {
  if (!opsKeyOk(req)) {
    res.status(401).json({ success: false, message: 'Thiếu hoặc sai x-ops-key' });
    return;
  }
  if (!isTelegramConfigured() || config.telegram.notifyChatIds.length === 0) {
    res.status(503).json({
      success: false,
      message: 'Chưa TELEGRAM_BOT_TOKEN hoặc TELEGRAM_NOTIFY_CHAT_IDS',
    });
    return;
  }
  const message = String(req.body?.message || '✅ Ops notify-test từ site-ai');
  try {
    const result = await notifyTelegramAdmins(message);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }
});

export default router;
