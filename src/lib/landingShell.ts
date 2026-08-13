import { isLoggedIn } from '../services/authStore';

/** Class names for marketing shell: guest = Magnific light, auth = dark studio. */
export function landingPageClassName(extra?: string): string {
  const mode = isLoggedIn() ? 'landing-page--auth' : 'landing-page--guest';
  return ['landing-page', mode, extra].filter(Boolean).join(' ');
}
