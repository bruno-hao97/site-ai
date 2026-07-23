import { config } from '../config.js';
import { gommoServerDeviceFields } from './gommoDevice.js';

export const PAYMENT_DOMAIN_ERROR_MESSAGE =
  'Vui lòng truy cập đúng Domain mà bạn đăng ký để có thể mua gói hoặc nạp credit.';

/** plan_id giả — chỉ để kích hoạt check domain của Gommo, không tạo đơn hợp lệ. */
const DOMAIN_PROBE_PLAN_ID = '__site_ai_domain_probe__';

interface GommoProbeResponse {
  success?: boolean;
  error?: unknown;
  message?: string;
  url?: string;
  url_embedded?: string;
  userInfo?: {
    id_base?: string;
    email?: string;
    username?: string;
  };
}

export class PaymentIdentityError extends Error {
  status: number;
  code: 'AUTH_REQUIRED' | 'DOMAIN_MISMATCH' | 'ACCOUNT_MISMATCH';

  constructor(
    message: string,
    status: number,
    code: 'AUTH_REQUIRED' | 'DOMAIN_MISMATCH' | 'ACCOUNT_MISMATCH',
  ) {
    super(message);
    this.name = 'PaymentIdentityError';
    this.status = status;
    this.code = code;
  }
}

export function bearerAccessToken(authorization?: string): string {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || '';
}

function isDomainMismatchMessage(message: string): boolean {
  return (
    /domain/i.test(message) ||
    /đúng\s*domain/i.test(message) ||
    /dung\s*domain/i.test(message) ||
    /đối\s*tác/i.test(message) ||
    /doi\s*tac/i.test(message) ||
    /không cùng hệ thống/i.test(message) ||
    /khong cung he thong/i.test(message)
  );
}

function isAuthMessage(message: string): boolean {
  return /token|đăng nhập|dang nhap|login|unauthori[sz]ed|expired|hết hạn|het han/i.test(message);
}

async function fetchGommoMe(accessToken: string): Promise<GommoProbeResponse> {
  const body = new URLSearchParams({
    access_token: accessToken,
    domain: config.gommo.apiDomain,
    ...gommoServerDeviceFields(),
  }).toString();
  const url = `${config.gommo.authBaseUrl}${config.gommo.authPath}/ai/me`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const text = await response.text();
  try {
    return JSON.parse(text) as GommoProbeResponse;
  } catch {
    throw new Error(text || `Không thể xác minh tài khoản (HTTP ${response.status})`);
  }
}

/**
 * Gọi create_payment giống vmedia để Gommo tự bắt sai domain.
 * Dùng plan_id giả để user hợp lệ nhận lỗi "plan không hợp lệ" thay vì tạo QR thật.
 */
async function probeGommoPaymentDomain(accessToken: string, amountVnd?: number): Promise<void> {
  const body = new URLSearchParams({
    access_token: accessToken,
    domain: config.gommo.apiDomain,
    plan_id: DOMAIN_PROBE_PLAN_ID,
    subscribe_type: 'MEMBER_PLAN_AI',
    type: 'ai_plan',
    gateway: 'payos',
    amount: String(Math.max(1, Math.floor(Number(amountVnd) || 50_000))),
    order_code: `PROBE-${Date.now().toString().slice(-8)}`,
    ...gommoServerDeviceFields(),
  }).toString();

  const url = `${config.gommo.authBaseUrl}${config.gommo.authPath}/subscriptions/create_payment`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  } catch {
    throw new Error('Không thể xác minh domain tài khoản lúc này. Vui lòng thử lại.');
  }

  const text = await response.text();
  let raw: GommoProbeResponse;
  try {
    raw = JSON.parse(text) as GommoProbeResponse;
  } catch {
    throw new Error(text || `Không thể xác minh domain tài khoản (HTTP ${response.status})`);
  }

  const message = String(raw.message || '');
  const hasCheckout = Boolean(raw.url || raw.url_embedded);

  // Không mong đợi tạo được checkout với plan giả — nếu có, chỉ log và coi domain đã pass.
  if (hasCheckout && !raw.error && raw.success !== false) {
    console.warn('[payos] domain probe unexpectedly created Gommo checkout — ignored');
    return;
  }

  if (isDomainMismatchMessage(message)) {
    throw new PaymentIdentityError(PAYMENT_DOMAIN_ERROR_MESSAGE, 403, 'DOMAIN_MISMATCH');
  }
  if (isAuthMessage(message)) {
    throw new PaymentIdentityError(
      'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại trước khi thanh toán.',
      401,
      'AUTH_REQUIRED',
    );
  }

  // Lỗi plan/amount/khác = token đã qua check domain của Gommo → cho phép tạo PayOS local.
  if (raw.error || raw.success === false || !response.ok) {
    return;
  }
}

/**
 * Xác thực token với rule domain của Gommo trước khi tạo PayOS local.
 * Giữ webhook PayOS + sendBalances hiện tại.
 */
export async function verifyPaymentIdentity(input: {
  accessToken: string;
  expectedUsername?: string;
  amountVnd?: number;
}): Promise<{ username: string }> {
  if (!input.accessToken) {
    throw new PaymentIdentityError('Vui lòng đăng nhập lại trước khi thanh toán.', 401, 'AUTH_REQUIRED');
  }

  await probeGommoPaymentDomain(input.accessToken, input.amountVnd);

  // Username chỉ cần khi nạp credit — lấy từ /ai/me sau khi domain đã pass.
  if (!input.expectedUsername) {
    return { username: '' };
  }

  let me: GommoProbeResponse;
  try {
    me = await fetchGommoMe(input.accessToken);
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Không thể xác minh tài khoản.');
  }

  const user = me.userInfo;
  if (me.error || me.success === false || (!user?.id_base && !user?.email)) {
    const upstreamMessage = String(me.message || '');
    if (isAuthMessage(upstreamMessage)) {
      throw new PaymentIdentityError(
        'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại trước khi thanh toán.',
        401,
        'AUTH_REQUIRED',
      );
    }
    throw new PaymentIdentityError(PAYMENT_DOMAIN_ERROR_MESSAGE, 403, 'DOMAIN_MISMATCH');
  }

  const username = String(user.username || '').trim();
  const expectedUsername = String(input.expectedUsername || '').trim();
  if (!username || username.toLocaleLowerCase() !== expectedUsername.toLocaleLowerCase()) {
    throw new PaymentIdentityError(
      'Tài khoản thanh toán không khớp với tài khoản đang đăng nhập.',
      403,
      'ACCOUNT_MISMATCH',
    );
  }

  return { username };
}
