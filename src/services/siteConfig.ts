/** Nhãn brand hiển thị trên site. */
export const SITE_BRAND_LABEL = 'trungtamai.vn';
export const SITE_PUBLIC_URL = 'https://trungtamai.vn';
/** Tên hiển thị — thay mọi “AGI Center” / AGI trên UI & văn bản pháp lý. */
export const SITE_DISPLAY_NAME = 'Trung tâm AI';

/** Hotline / Zalo hỗ trợ chính thức — dùng thống nhất trên toàn site. */
export const SITE_SUPPORT_PHONE = '0996358358';
export const SITE_SUPPORT_PHONE_LABEL = '0996.358.358';
export const SITE_SUPPORT_EMAIL = 'support@trungtamai.vn';

/** Liên hệ chính thức — footer, FAQ, pricing. */
export const HOME_NOTIF_CONTACT = {
  zaloGroup: 'https://zalo.me/g/6q2aihayik9rfw5gz2kd',
  zaloSupport: `https://zalo.me/${SITE_SUPPORT_PHONE}`,
  zaloSupportLabel: SITE_SUPPORT_PHONE_LABEL,
  facebook: 'https://www.facebook.com/share/1HZ4SswRBc/?mibextid=wwXIfr',
} as const;

/** Thay branding VMedia / upstream / AGI bằng Trung tâm AI & trungtamai.vn. */
export function rebrandSiteText(text: string): string {
  return text
    .replace(/VMedia\.AI/gi, SITE_BRAND_LABEL)
    .replace(/VMedia/gi, SITE_BRAND_LABEL)
    .replace(/https?:\/\/vmedia\.ai/gi, SITE_PUBLIC_URL)
    .replace(/vmedia\.ai/gi, SITE_BRAND_LABEL)
    .replace(/\bAGI Center\b/gi, SITE_DISPLAY_NAME)
    .replace(/\bApp\.agi\.vn@gmail\.com\b/gi, SITE_SUPPORT_EMAIL)
    .replace(/\bagi\.center\b/gi, SITE_BRAND_LABEL)
    .replace(/\bMoonix\b/gi, 'trợ lý AI')
    .replace(/\bMoon Agent\b/gi, 'trợ lý AI')
    .replace(/\b79AI\b/gi, SITE_BRAND_LABEL);
}
