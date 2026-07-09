import { loadAuth } from './authStore';
import { gommoDeviceFields } from './gommoDevice';
import { GOMMO_AUTH_BASE, GOMMO_AUTH_PATH } from './upstreamMe';

export type SubscriptionPlanType = 'image' | 'video' | 'combo';

export interface SubscriptionPlanMode {
  type?: string;
  name?: string;
  description?: string;
  price?: number;
}

export interface SubscriptionPlanModelOption {
  type?: string;
  name?: string;
}

export interface SubscriptionPlanModel {
  model?: string;
  name?: string;
  type?: string;
  modes?: Array<SubscriptionPlanMode | string>;
  resolutions?: Array<SubscriptionPlanModelOption | string>;
  durations?: Array<SubscriptionPlanModelOption | string>;
  ratios?: Array<SubscriptionPlanModelOption | string>;
  quota_limit?: number;
  quota_used?: number;
  concurrent?: number;
  concurrent_vip?: number;
}

export interface SubscriptionPlan {
  id: string;
  plan_key: string;
  status?: string;
  type: SubscriptionPlanType | string;
  name: string;
  group?: string;
  price: string;
  price_regular?: string;
  save_percent?: string;
  video_day?: string;
  video_month?: string;
  video_vip_day?: string;
  video_vip_month?: string;
  image_day?: string;
  image_month?: string;
  image_vip_day?: string;
  image_vip_month?: string;
  concurrent?: string;
  concurrent_vip?: string;
  queue?: string;
  queue_vip?: string;
  storage?: string;
  models?: SubscriptionPlanModel[];
  tools?: string[];
}

interface PlansPayload {
  data?: SubscriptionPlan[];
  message?: string;
}

interface PaymentPayload {
  error?: number;
  message?: string;
  status?: string;
  url?: string;
  url_embedded?: string;
  runtime?: number;
}

export interface CreateSubscriptionPaymentInput {
  planId: string;
  gateway?: string;
  subscribeType?: string;
  type?: string;
}

export interface SubscriptionPaymentResult {
  status?: string;
  url?: string;
  urlEmbedded?: string;
  runtime?: number;
}

const PLANS_URLS = [
  `${GOMMO_AUTH_BASE}${GOMMO_AUTH_PATH}/subscriptions/plans`,
  'https://api.gommo.net/api/apps/go-mmo/subscriptions/plans',
];

const CREATE_PAYMENT_URLS = [
  `${GOMMO_AUTH_BASE}${GOMMO_AUTH_PATH}/subscriptions/create_payment`,
  'https://api.gommo.net/api/apps/go-mmo/subscriptions/create_payment',
];

function parsePlansPayload(input: unknown): PlansPayload {
  if (!input || typeof input !== 'object') return {};
  const root = input as Record<string, unknown>;
  if (Array.isArray(root.data)) return { data: root.data as SubscriptionPlan[] };
  if (root.data && typeof root.data === 'object') {
    const nested = root.data as Record<string, unknown>;
    if (Array.isArray(nested.data)) return { data: nested.data as SubscriptionPlan[] };
  }
  return { message: typeof root.message === 'string' ? root.message : undefined };
}

export async function fetchSubscriptionPlans(type: SubscriptionPlanType): Promise<SubscriptionPlan[]> {
  const auth = loadAuth();
  if (!auth?.access_token) throw new Error('Chưa đăng nhập — thiếu access token');

  const body = new URLSearchParams({
    action_type: 'plans',
    type,
    domain: auth.domain.trim(),
    access_token: auth.access_token.trim(),
    ...gommoDeviceFields(),
  }).toString();

  let lastError: Error | null = null;

  for (const url of PLANS_URLS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      const text = await res.text();

      let raw: unknown;
      try {
        raw = JSON.parse(text);
      } catch {
        throw new Error(text || `HTTP ${res.status}`);
      }

      const payload = parsePlansPayload(raw);
      if (!res.ok) throw new Error(payload.message || `HTTP ${res.status}`);
      if (!Array.isArray(payload.data)) throw new Error(payload.message || 'Sai định dạng dữ liệu plans');
      return payload.data;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError ?? new Error('Không tải được danh sách plans');
}

function parsePaymentPayload(input: unknown): PaymentPayload {
  if (!input || typeof input !== 'object') return {};
  const root = input as Record<string, unknown>;
  return {
    error: typeof root.error === 'number' ? root.error : undefined,
    message: typeof root.message === 'string' ? root.message : undefined,
    status: typeof root.status === 'string' ? root.status : undefined,
    url: typeof root.url === 'string' ? root.url : undefined,
    url_embedded: typeof root.url_embedded === 'string' ? root.url_embedded : undefined,
    runtime: typeof root.runtime === 'number' ? root.runtime : undefined,
  };
}

function normalizePaymentError(message?: string): string {
  if (!message) return 'Không tạo được link thanh toán';
  if (/domain/i.test(message)) {
    return 'Bạn cần truy cập đúng domain đã đăng ký để mua gói hoặc nạp credit.';
  }
  return message;
}

export async function createSubscriptionPayment(
  input: CreateSubscriptionPaymentInput,
): Promise<SubscriptionPaymentResult> {
  const auth = loadAuth();
  if (!auth?.access_token) throw new Error('Chưa đăng nhập — thiếu access token');
  if (!input.planId?.trim()) throw new Error('Thiếu plan_id');

  const body = new URLSearchParams({
    access_token: auth.access_token.trim(),
    domain: auth.domain.trim(),
    plan_id: input.planId.trim(),
    subscribe_type: input.subscribeType || 'MEMBER_PLAN_AI',
    type: input.type || 'ai_plan',
    gateway: input.gateway || 'payos',
    ...gommoDeviceFields(),
  }).toString();

  let lastError: Error | null = null;
  for (const url of CREATE_PAYMENT_URLS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      const text = await res.text();

      let raw: unknown;
      try {
        raw = JSON.parse(text);
      } catch {
        throw new Error(text || `HTTP ${res.status}`);
      }

      const payload = parsePaymentPayload(raw);
      if (!res.ok) throw new Error(normalizePaymentError(payload.message) || `HTTP ${res.status}`);
      if (payload.error) throw new Error(normalizePaymentError(payload.message));
      if (payload.status && payload.status.toLowerCase() !== 'success') {
        throw new Error(normalizePaymentError(payload.message || 'Tạo thanh toán thất bại'));
      }
      if (!payload.url && !payload.url_embedded) {
        throw new Error(normalizePaymentError(payload.message || 'Không nhận được URL thanh toán'));
      }

      return {
        status: payload.status,
        url: payload.url,
        urlEmbedded: payload.url_embedded,
        runtime: payload.runtime,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError ?? new Error('Không tạo được payment link');
}
