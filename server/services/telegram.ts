import { config, isTelegramConfigured } from '../config.js';

const TG_API = 'https://api.telegram.org';

export interface TelegramUpdate {
  update_id?: number;
  message?: {
    message_id?: number;
    text?: string;
    chat?: { id?: number; type?: string; username?: string; first_name?: string };
    from?: { id?: number; username?: string; first_name?: string };
  };
}

async function tg(method: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!isTelegramConfigured()) {
    throw new Error('Chưa cấu hình TELEGRAM_BOT_TOKEN');
  }
  const res = await fetch(`${TG_API}/bot${config.telegram.botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok || data.ok === false) {
    throw new Error(String(data.description || `Telegram ${method} HTTP ${res.status}`));
  }
  return data;
}

export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  opts?: { parseMode?: 'HTML' | 'Markdown' },
): Promise<void> {
  await tg('sendMessage', {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...(opts?.parseMode ? { parse_mode: opts.parseMode } : {}),
  });
}

/** Gửi tới mọi chat admin trong TELEGRAM_NOTIFY_CHAT_IDS. */
export async function notifyTelegramAdmins(text: string): Promise<{ sent: number; errors: string[] }> {
  const ids = config.telegram.notifyChatIds;
  if (!isTelegramConfigured() || ids.length === 0) {
    return { sent: 0, errors: [] };
  }
  let sent = 0;
  const errors: string[] = [];
  for (const id of ids) {
    try {
      await sendTelegramMessage(id, text);
      sent += 1;
    } catch (err) {
      errors.push(`${id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { sent, errors };
}

export async function setTelegramWebhook(): Promise<Record<string, unknown>> {
  const url = config.telegram.webhookUrl;
  if (!url) throw new Error('Thiếu TELEGRAM_WEBHOOK_URL');
  const body: Record<string, unknown> = {
    url,
    allowed_updates: ['message'],
    drop_pending_updates: false,
  };
  if (config.telegram.webhookSecret) {
    body.secret_token = config.telegram.webhookSecret;
  }
  return tg('setWebhook', body);
}

export async function getTelegramWebhookInfo(): Promise<Record<string, unknown>> {
  return tg('getWebhookInfo', {});
}

function helpText(): string {
  return [
    '🤖 Bot AI Center (site-ai)',
    '',
    'Lệnh:',
    '/start — đăng ký nhận thông báo (lưu chat id)',
    '/help — trợ giúp',
    '/ping — kiểm tra bot sống',
    '/chatid — xem chat id của bạn (dán vào TELEGRAM_NOTIFY_CHAT_IDS)',
    '',
    'Admin: cấu hình TELEGRAM_NOTIFY_CHAT_IDS trên server để nhận cảnh báo topup PayOS.',
  ].join('\n');
}

/** Xử lý tin nhắn webhook từ Telegram. */
export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  const msg = update.message;
  const chatId = msg?.chat?.id;
  const text = (msg?.text || '').trim();
  if (!chatId || !text) return;

  const cmd = text.split(/\s+/)[0].split('@')[0].toLowerCase();

  if (cmd === '/start' || cmd === '/help') {
    await sendTelegramMessage(chatId, helpText());
    return;
  }
  if (cmd === '/ping') {
    await sendTelegramMessage(chatId, 'pong ✅ — bot site-ai đang chạy.');
    return;
  }
  if (cmd === '/chatid') {
    await sendTelegramMessage(
      chatId,
      `Chat ID của bạn: ${chatId}\nThêm vào Railway env:\nTELEGRAM_NOTIFY_CHAT_IDS=${chatId}`,
    );
    return;
  }

  await sendTelegramMessage(chatId, 'Gõ /help để xem lệnh hỗ trợ.');
}
