import { isLoggedIn } from '../services/authStore';

/** Nav landing scroll tại `/` + link trang marketing. */
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
