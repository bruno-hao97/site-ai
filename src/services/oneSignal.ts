import { loadAuth } from './authStore';
import { DEFAULT_DOMAIN, normalizeDomain } from './settingsStore';
import { GOMMO_AUTH_PATH } from './upstreamMe';

/**
 * Web push qua OneSignal — appId lấy từ `POST /app/site-config` → domainInfo.push_app_id
 * (không nằm trong /ai/me). external_id = userInfo.id_private để gommo_notify_send đẩy đúng user.
 */

const SDK_URL = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';

/** App ID công khai OneSignal của domain vmedia.ai (từ /app/site-config). Fallback khi fetch lỗi. */
const VMEDIA_PUSH_APP_ID = '17d3f12f-1d5a-4026-9369-83569fc7fc2f';

interface OneSignalUser {
  addTags?(tags: Record<string, string>): Promise<void>;
}

interface OneSignalNotifications {
  permission?: boolean;
  requestPermission?(): Promise<void>;
  isPushSupported?(): boolean;
}

interface OneSignalApi {
  init(options: Record<string, unknown>): Promise<void>;
  login(externalId: string): Promise<void>;
  User?: OneSignalUser;
  Notifications?: OneSignalNotifications;
}

type OneSignalCallback = (os: OneSignalApi) => void | Promise<void>;

declare global {
  interface Window {
    OneSignalDeferred?: OneSignalCallback[];
    OneSignal?: OneSignalApi;
  }
}

export type PushStatus = 'unsupported' | 'default' | 'granted' | 'denied';

let sdkPromise: Promise<void> | null = null;
let initPromise: Promise<void> | null = null;
let initializedAppId: string | null = null;
let cachedPushAppId: string | null = null;
let pushAppIdPromise: Promise<string | null> | null = null;

function ensureSdk(): Promise<void> {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<void>((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('OneSignal chỉ chạy trên trình duyệt'));
      return;
    }
    if (document.querySelector('script[src*="OneSignalSDK"]')) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Không tải được OneSignal SDK'));
    document.head.appendChild(script);
  });
  return sdkPromise;
}

function withOneSignal<T>(fn: (os: OneSignalApi) => Promise<T> | T): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (os) => {
      try {
        resolve(await fn(os));
      } catch (err) {
        reject(err);
      }
    });
  });
}

/** Cache sync (null nếu chưa fetch hoặc domain chưa có push). */
export function getPushAppId(): string | null {
  return cachedPushAppId;
}

function fallbackPushAppId(domain: string): string | null {
  return normalizeDomain(domain) === DEFAULT_DOMAIN ? VMEDIA_PUSH_APP_ID : null;
}

/** Lấy OneSignal appId từ Gommo site-config theo domain. */
export async function resolvePushAppId(): Promise<string | null> {
  if (cachedPushAppId) return cachedPushAppId;
  if (pushAppIdPromise) return pushAppIdPromise;

  pushAppIdPromise = (async () => {
    const domain = normalizeDomain(loadAuth()?.domain || DEFAULT_DOMAIN);
    const fallback = fallbackPushAppId(domain);
    try {
      const body = new URLSearchParams({ domain }).toString();
      const res = await fetch(`${GOMMO_AUTH_PATH}/app/site-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      const text = await res.text();
      const start = text.indexOf('{');
      const parsed = JSON.parse(start >= 0 ? text.slice(start) : text) as {
        domainInfo?: { push_app_id?: string };
      };
      const id = parsed.domainInfo?.push_app_id?.trim() || fallback;
      cachedPushAppId = id;
      return id;
    } catch {
      cachedPushAppId = fallback;
      return fallback;
    }
  })().finally(() => {
    pushAppIdPromise = null;
  });

  return pushAppIdPromise;
}

function getExternalId(): string | null {
  return loadAuth()?.upstream_me?.userInfo?.id_private?.trim() || null;
}

async function initOneSignal(appId: string): Promise<void> {
  if (initializedAppId === appId && initPromise) return initPromise;
  initializedAppId = appId;
  initPromise = (async () => {
    await ensureSdk();
    await withOneSignal((os) =>
      os.init({
        appId,
        allowLocalhostAsSecureOrigin: true,
        notifyButton: { enable: false },
      }),
    );
  })();
  return initPromise;
}

async function loginOneSignal(externalId: string): Promise<void> {
  await withOneSignal(async (os) => {
    await os.login(externalId);
    try {
      await os.User?.addTags?.({
        user_id: externalId,
        platform: 'web',
        registered_at: new Date().toISOString(),
      });
    } catch {
      // addTags không bắt buộc
    }
  });
}

/**
 * Khởi tạo OneSignal + gắn player vào tài khoản. Idempotent.
 * Không làm gì nếu domain chưa cấu hình push hoặc chưa đăng nhập.
 */
export async function setupOneSignalFromAuth(): Promise<void> {
  const appId = await resolvePushAppId();
  const externalId = getExternalId();
  if (!appId || !externalId) return;
  await initOneSignal(appId);
  await loginOneSignal(externalId);
}

export function getBrowserPushStatus(): PushStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  const permission = Notification.permission;
  if (permission === 'granted') return 'granted';
  if (permission === 'denied') return 'denied';
  return 'default';
}

export async function requestPushPermission(): Promise<PushStatus> {
  await setupOneSignalFromAuth();
  await withOneSignal(async (os) => {
    await os.Notifications?.requestPermission?.();
  });
  return getBrowserPushStatus();
}
