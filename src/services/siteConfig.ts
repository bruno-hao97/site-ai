import { DEFAULT_DOMAIN, normalizeDomain } from './settingsStore';
import { GOMMO_AUTH_PATH } from './upstreamMe';

/** Nhãn brand hiển thị trong popup (giống VMedia.AI). */
export const SITE_BRAND_LABEL = 'trungtamai.vn';
export const SITE_PUBLIC_URL = 'https://trungtamai.vn';

interface SiteConfigResponse {
  success?: boolean;
  domainInfo?: {
    home_notif?: string;
    push_app_id?: string;
    [key: string]: unknown;
  };
}

let cachedHomeNotif: string | null | undefined;

function parseSiteConfig(text: string): SiteConfigResponse {
  const start = text.indexOf('{');
  return JSON.parse(start >= 0 ? text.slice(start) : text) as SiteConfigResponse;
}

/** Thay branding VMedia bằng trungtamai.vn. */
export function rebrandHomeNotif(html: string): string {
  return html
    .replace(/VMedia\.AI/gi, SITE_BRAND_LABEL)
    .replace(/VMedia/gi, SITE_BRAND_LABEL)
    .replace(/https?:\/\/vmedia\.ai/gi, SITE_PUBLIC_URL)
    .replace(/vmedia\.ai/gi, SITE_BRAND_LABEL);
}

export async function fetchHomeNotif(domain = DEFAULT_DOMAIN): Promise<string | null> {
  if (cachedHomeNotif) return cachedHomeNotif;

  const normalized = normalizeDomain(domain);
  try {
    const body = new URLSearchParams({ domain: normalized }).toString();
    const res = await fetch(`${GOMMO_AUTH_PATH}/app/site-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const text = await res.text();
    if (!res.ok) return null;

    const parsed = parseSiteConfig(text);
    if (parsed.success === false) return null;

    const raw = parsed.domainInfo?.home_notif?.trim() || '';
    if (!raw) return null;

    cachedHomeNotif = rebrandHomeNotif(raw);
    return cachedHomeNotif;
  } catch {
    return null;
  }
}

/** Cho phép prefetch lại sau lỗi mạng tạm thời hoặc đổi rebrand. */
export function clearHomeNotifCache(): void {
  cachedHomeNotif = undefined;
}
