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

/** Thay branding VMedia / upstream bằng trungtamai.vn (popup, chat bubble, …). */
export function rebrandSiteText(text: string): string {
  return rebrandHomeNotif(text)
    .replace(/\bMoonix\b/gi, 'trợ lý AI')
    .replace(/\bMoon Agent\b/gi, 'trợ lý AI')
    .replace(/\b79AI\b/gi, SITE_BRAND_LABEL);
}

const HOME_NOTIF_PRICING_HREF = '/pricing';

function isHomeNotifPricingLink(a: HTMLAnchorElement): boolean {
  if (a.classList.contains('vm-price')) return true;
  if (/\bNạp tiền\b/i.test(a.textContent || '')) return true;
  const href = a.getAttribute('href') || '';
  return a.classList.contains('vm-action') && /\/prices?\b/i.test(href);
}

/** Ô "Nạp tiền & bảng giá" upstream → /pricing, bỏ target _blank. */
function rewriteHomeNotifPricingHref(html: string): string {
  return html.replace(/<a\b([^>]*\bclass="[^"]*\bvm-price\b[^"]*"[^>]*)>/gi, (_match, attrs: string) => {
    let next = attrs
      .replace(/\bhref="[^"]*"/gi, `href="${HOME_NOTIF_PRICING_HREF}"`)
      .replace(/\bhref='[^']*'/gi, `href='${HOME_NOTIF_PRICING_HREF}'`)
      .replace(/\btarget="[^"]*"/gi, '')
      .replace(/\btarget='[^']*'/gi, '')
      .replace(/\brel="[^"]*"/gi, '')
      .replace(/\brel='[^']*'/gi, '');
    if (!/\bhref=/i.test(next)) next = ` href="${HOME_NOTIF_PRICING_HREF}"${next}`;
    return `<a${next}>`;
  });
}

/** Gắn /pricing cùng tab; onPricingClick dùng React Router navigate. */
export function bindHomeNotifPricingLinks(
  root: ParentNode,
  onPricingClick: () => void,
): () => void {
  const cleanups: Array<() => void> = [];

  root.querySelectorAll<HTMLAnchorElement>('a').forEach((a) => {
    if (!isHomeNotifPricingLink(a)) return;

    a.setAttribute('href', HOME_NOTIF_PRICING_HREF);
    a.removeAttribute('target');
    a.removeAttribute('rel');

    const onClick = (e: Event) => {
      e.preventDefault();
      onPricingClick();
    };
    a.addEventListener('click', onClick);
    cleanups.push(() => a.removeEventListener('click', onClick));
  });

  return () => cleanups.forEach((fn) => fn());
}

/** @deprecated Dùng rebrandSiteText */
export function rebrandHomeNotif(html: string): string {
  return rewriteHomeNotifPricingHref(
    html
      .replace(/VMedia\.AI/gi, SITE_BRAND_LABEL)
      .replace(/VMedia/gi, SITE_BRAND_LABEL)
      .replace(/https?:\/\/vmedia\.ai/gi, SITE_PUBLIC_URL)
      .replace(/vmedia\.ai/gi, SITE_BRAND_LABEL),
  );
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

    cachedHomeNotif = rebrandSiteText(raw);
    return cachedHomeNotif;
  } catch {
    return null;
  }
}

/** Cho phép prefetch lại sau lỗi mạng tạm thời hoặc đổi rebrand. */
export function clearHomeNotifCache(): void {
  cachedHomeNotif = undefined;
}
