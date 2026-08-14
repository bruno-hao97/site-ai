import { isLoggedIn } from '../services/authStore';

/** Class names for marketing shell: guest = Magnific light, auth = mesh canvas. */
export function landingPageClassName(extra?: string): string {
  const loggedIn = isLoggedIn();
  const mode = loggedIn ? 'landing-page--auth' : 'landing-page--guest';
  const embedded = extra?.includes('landing-page--embedded');
  return [
    'landing-page',
    mode,
    loggedIn && 'landing-page--magnific-canvas',
    loggedIn && !embedded && 'app-magnific',
    extra,
  ]
    .filter(Boolean)
    .join(' ');
}
