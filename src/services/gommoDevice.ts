import { buildDeviceInfo } from './audioVoices';
import { GOMMO_CHAT_CONFIG } from './gommoChatConfig';

const DEVICE_ID_STORAGE_KEY = 'gommo_device_id';

function parseBrowserName(userAgent: string): string {
  if (/Edg\//.test(userAgent)) return 'Edge';
  if (/Chrome\//.test(userAgent)) return 'Chrome';
  if (/Firefox\//.test(userAgent)) return 'Firefox';
  if (/Safari\//.test(userAgent) && !/Chrome\//.test(userAgent)) return 'Safari';
  return 'Browser';
}

/** Device id ổn định theo browser — khớp vmedia.ai (UUID lưu localStorage). */
export function resolveBrowserDeviceId(): string {
  if (typeof window === 'undefined') return GOMMO_CHAT_CONFIG.deviceId;
  try {
    let id = localStorage.getItem(DEVICE_ID_STORAGE_KEY)?.trim();
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : GOMMO_CHAT_CONFIG.deviceId;
      localStorage.setItem(DEVICE_ID_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return GOMMO_CHAT_CONFIG.deviceId;
  }
}

function resolveBrowserDeviceName(): string {
  if (typeof window === 'undefined') return GOMMO_CHAT_CONFIG.deviceName;
  return `${parseBrowserName(navigator.userAgent)} 1`;
}

/** device_info JSON kiểu vmedia / agi.center cho mini-apps marketplace. */
export function buildMarketplaceDeviceInfo(deviceId: string, locale = 'vi'): string {
  if (typeof window === 'undefined') {
    return JSON.stringify({
      device_id: deviceId,
      device_type: 'desktop',
      language: locale,
    });
  }

  const nav = navigator;
  const ua = nav.userAgent;
  const browserName = parseBrowserName(ua);
  const deviceName = `${browserName} 1`;
  const screen = window.screen;
  const chromeVersion = ua.match(/Chrome\/([\d.]+)/)?.[1] || '';
  const osMatch = /Windows NT ([\d.]+)/.exec(ua);

  return JSON.stringify({
    device_id: deviceId,
    device_name: deviceName,
    device_type: 'desktop',
    platform: nav.platform || 'web',
    browser_name: browserName,
    browser_version: chromeVersion,
    os_name: /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'macOS' : 'Other',
    os_version: osMatch?.[1] || '',
    app_mode: 'browser',
    is_pwa: 'false',
    user_agent: ua,
    language: locale,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen: {
      width: screen.width,
      height: screen.height,
      pixel_ratio: window.devicePixelRatio || 1,
      color_depth: screen.colorDepth,
    },
  });
}

export function gommoDeviceFields(): Record<string, string> {
  return {
    device_id: GOMMO_CHAT_CONFIG.deviceId,
    device_name: GOMMO_CHAT_CONFIG.deviceName,
    device_info: buildDeviceInfo('vi'),
  };
}

/** Form fields device cho POST /api/v2/* (platform API). */
export function platformDeviceFields(): Record<string, string> {
  const deviceId = resolveBrowserDeviceId();
  const deviceName = resolveBrowserDeviceName();
  return {
    device_id: deviceId,
    device_name: deviceName,
    device_info: buildMarketplaceDeviceInfo(deviceId, 'vi'),
  };
}

/** @deprecated Dùng platformDeviceFields cho /api/v2/mini-apps */
export function marketplaceDeviceFields(): Record<string, string> {
  return { ...platformDeviceFields(), device_type: 'pc' };
}
