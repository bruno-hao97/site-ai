import { isLoggedIn } from '../services/authStore';

/** @deprecated Use getNavLinks() from landingI18n.ts — labels are locale-aware. */
export const NAV_LINKS = [
  { href: '/#product', label: 'Tính năng' },
  { to: '/models', label: 'Models' },
  { href: '/#community', label: 'Khám phá' },
  { href: '/#pricing', label: 'Bảng giá' },
] as const;

export function appEntryPath(): string {
  return isLoggedIn() ? '/home' : '/login';
}

export function loginPathWithNext(next: string): string {
  return `/login?next=${encodeURIComponent(next)}`;
}

export function registerPathWithNext(next: string): string {
  return `/register?next=${encodeURIComponent(next)}`;
}
