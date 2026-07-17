import { config, vndToCredits } from '../config.js';
import {
  assertMerchantCanCover,
  fetchMerchantCreditsAi,
  MerchantBalanceError,
} from './gommoMerchantBalance.js';
import { merchantSendBalances } from './gommoSendBalances.js';
import { notifyTelegramAdmins } from './telegram.js';
import { getTopupOrder, sumReservedTopupCredits, updateTopupOrder } from './topupOrders.js';

function notifyTopupAsync(text: string): void {
  void notifyTelegramAdmins(text).then((r) => {
    if (r.errors.length) console.warn('[telegram] notify errors', r.errors);
  });
}

export interface PayOsWebhookPayload {
  code?: string;
  desc?: string;
  data?: Record<string, unknown>;
  signature?: string;
}

function extractWebhookData(body: Record<string, unknown>): Record<string, unknown> | null {
  const nested = body.data;
  if (nested && typeof nested === 'object') return nested as Record<string, unknown>;
  return body;
}

export async function fulfillTopupFromWebhook(body: Record<string, unknown>): Promise<{
  ok: boolean;
  message: string;
  orderCode?: number;
}> {
  const code = String(body.code ?? '');
  const data = extractWebhookData(body);
  if (!data) return { ok: true, message: 'Webhook không có data — bỏ qua' };

  const status = String(data.status ?? '').toUpperCase();
  const orderCode = Number(data.orderCode);
  const amount = Number(data.amount);

  if (code !== '00' && status !== 'PAID') {
    return { ok: true, message: `Webhook chưa PAID (code=${code}, status=${status})` };
  }
  if (!Number.isFinite(orderCode) || orderCode <= 0) {
    return { ok: true, message: 'Webhook ping — bỏ qua (không có orderCode)' };
  }

  const order = await getTopupOrder(orderCode);
  if (!order) {
    const msg = `Webhook đã nhận — chưa có đơn pending #${orderCode}`;
    notifyTopupAsync(
      `⚠️ Topup PayOS #${orderCode}\nKhông tìm thấy đơn pending trên server.\nTiền có thể đã vào nhưng chưa cộng credit.`,
    );
    return { ok: true, message: msg };
  }

  if (order.status === 'credited') {
    return { ok: true, message: `Đơn #${orderCode} đã cộng credit trước đó`, orderCode };
  }

  if (Number.isFinite(amount) && amount > 0 && amount !== order.amountVnd) {
    const err = `Số tiền PayOS (${amount}) không khớp đơn (${order.amountVnd})`;
    await updateTopupOrder(orderCode, {
      status: 'failed',
      error: err,
    });
    console.error('[payos/webhook] amount mismatch', orderCode, amount, order.amountVnd);
    notifyTopupAsync(`❌ Topup #${orderCode} FAILED\n@${order.username}\n${err}`);
    return { ok: true, message: 'Số tiền thanh toán không khớp đơn pending — đã ghi log' };
  }

  await updateTopupOrder(orderCode, {
    status: 'paid',
    paidAt: new Date().toISOString(),
    payosReference: String(data.reference || data.paymentLinkId || ''),
  });

  const credits = order.credits || vndToCredits(order.amountVnd);
  const message = `PayOS topup #${orderCode}`;

  try {
    // Re-check ngay trước sendBalances (tránh race 2 đơn cùng lúc).
    const [merchantBalance, reservedCredits] = await Promise.all([
      fetchMerchantCreditsAi(),
      sumReservedTopupCredits(orderCode),
    ]);
    assertMerchantCanCover({
      merchantBalance,
      reservedCredits,
      creditsToSend: credits,
      bufferCredits: 0,
    });

    await merchantSendBalances({
      username: order.username,
      value: credits,
      message,
    });
    await updateTopupOrder(orderCode, {
      status: 'credited',
      creditedAt: new Date().toISOString(),
      error: undefined,
    });
    const okMsg = `Đã cộng ${credits} credit cho @${order.username}`;
    notifyTopupAsync(
      `✅ Topup #${orderCode} CREDITED\n@${order.username}\n${credits.toLocaleString('vi-VN')} credits\n${order.amountVnd.toLocaleString('vi-VN')} VND`,
    );
    return {
      ok: true,
      message: okMsg,
      orderCode,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const detail = err instanceof MerchantBalanceError ? err.detail : undefined;
    await updateTopupOrder(orderCode, { status: 'failed', error: errMsg });
    console.error('[payos/webhook] sendBalances failed', orderCode, errMsg, detail || '');
    notifyTopupAsync(
      `❌ Topup #${orderCode} FAILED (sendBalances)\n@${order.username}\n${credits.toLocaleString('vi-VN')} credits\n${errMsg}${detail ? `\n${detail}` : ''}`,
    );
    return { ok: true, message: `Đã nhận webhook — lỗi cộng credit: ${errMsg}`, orderCode };
  }
}
