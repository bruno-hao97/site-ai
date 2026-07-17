import { Router } from 'express';
import { config, isTelegramConfigured } from '../config.js';
import {
  getTelegramWebhookInfo,
  handleTelegramUpdate,
  notifyTelegramAdmins,
  setTelegramWebhook,
  type TelegramUpdate,
} from '../services/telegram.js';

const router = Router();

router.get('/status', async (_req, res) => {
  const configured = isTelegramConfigured();
  let webhook: unknown = null;
  let webhookError: string | null = null;
  if (configured) {
    try {
      webhook = await getTelegramWebhookInfo();
    } catch (err) {
      webhookError = err instanceof Error ? err.message : String(err);
    }
  }
  res.json({
    success: true,
    data: {
      configured,
      webhookUrl: config.telegram.webhookUrl || null,
      notifyChatIds: config.telegram.notifyChatIds.length,
      webhook,
      webhookError,
      gommoMcpNote:
        'Ping Telegram qua Gommo MCP = gommo_notify_send (cần link Telegram trên tài khoản Gommo). Bot này là kênh riêng của site-ai.',
    },
  });
});

/** Đăng ký webhook với Telegram (gọi 1 lần sau khi deploy). */
router.post('/setup-webhook', async (req, res) => {
  try {
    const setupKey = String(req.headers['x-telegram-setup-key'] || req.body?.setupKey || '');
    if (config.telegram.webhookSecret && setupKey !== config.telegram.webhookSecret) {
      res.status(401).json({ success: false, message: 'Sai setup key (dùng TELEGRAM_WEBHOOK_SECRET)' });
      return;
    }
    if (!isTelegramConfigured()) {
      res.status(503).json({ success: false, message: 'Chưa có TELEGRAM_BOT_TOKEN' });
      return;
    }
    if (!config.telegram.webhookUrl) {
      res.status(400).json({ success: false, message: 'Thiếu TELEGRAM_WEBHOOK_URL' });
      return;
    }
    const result = await setTelegramWebhook();
    res.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message });
  }
});

/** Webhook Telegram gọi vào đây. */
router.post('/webhook', async (req, res) => {
  try {
    if (!isTelegramConfigured()) {
      res.status(503).json({ ok: false });
      return;
    }
    const secret = config.telegram.webhookSecret;
    if (secret) {
      const header = String(req.headers['x-telegram-bot-api-secret-token'] || '');
      if (header !== secret) {
        res.status(401).json({ ok: false, message: 'Invalid secret token' });
        return;
      }
    }
    await handleTelegramUpdate((req.body || {}) as TelegramUpdate);
    res.json({ ok: true });
  } catch (err) {
    console.error('[telegram/webhook]', err instanceof Error ? err.message : err);
    // Telegram retry nếu không 200 — vẫn trả 200 để tránh spam khi lỗi xử lý.
    res.json({ ok: true });
  }
});

/** Gửi thử tin tới admin chats (bảo vệ bằng secret). */
router.post('/test', async (req, res) => {
  try {
    const setupKey = String(req.headers['x-telegram-setup-key'] || req.body?.setupKey || '');
    if (config.telegram.webhookSecret && setupKey !== config.telegram.webhookSecret) {
      res.status(401).json({ success: false, message: 'Sai setup key' });
      return;
    }
    const message = String(req.body?.message || 'Test notify từ site-ai bot ✅');
    const result = await notifyTelegramAdmins(message);
    res.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message });
  }
});

export default router;
