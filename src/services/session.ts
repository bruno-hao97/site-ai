import type { BackendUser } from './backendApi';

const SESSION_KEY = 'ln_session';

export interface BackendSession {
  token: string;
  user: BackendUser;
  balance: number;
}

export function loadSession(): BackendSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BackendSession;
  } catch {
    return null;
  }
}

export function saveSession(session: BackendSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function getSessionToken(): string | null {
  return loadSession()?.token ?? null;
}

export function isBackendLoggedIn(): boolean {
  return Boolean(loadSession()?.token?.trim());
}

export function setSessionBalance(balance: number): void {
  const current = loadSession();
  if (!current) return;
  saveSession({ ...current, balance });
}

export function setSessionUser(user: BackendUser, balance?: number): void {
  const current = loadSession();
  if (!current) return;
  saveSession({ ...current, user, balance: balance ?? current.balance });
}
