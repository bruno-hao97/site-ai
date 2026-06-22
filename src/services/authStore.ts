import { GommoClient } from './api';
import { fetchUpstreamMe, type UpstreamMeResponse } from './upstreamMe';
import { saveSettings } from './settingsStore';
import { clearSession, isBackendLoggedIn, loadSession } from './session';

const SESSION_KEY = 'gommo_session';
export const DEFAULT_PROJECT_ID = 'default';

export interface AuthState {
  access_token: string;
  domain: string;
  projectId: string;
  upstream_me: UpstreamMeResponse;
}

export interface DisplayUser {
  name: string | null;
  email: string;
  avatar: string | null;
  username: string | null;
}

export function loadAuth(): AuthState | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthState;
  } catch {
    return null;
  }
}

export function saveAuth(state: AuthState): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(state));
  saveSettings({
    accessToken: state.access_token,
    domain: state.domain,
    projectId: state.projectId,
  });
}

export function clearAuth(): void {
  localStorage.removeItem(SESSION_KEY);
  clearSession();
  saveSettings({ accessToken: '' });
}

export function isLoggedIn(): boolean {
  return Boolean(loadAuth()?.access_token?.trim()) || isBackendLoggedIn();
}

export function getGommoClient(): GommoClient {
  const auth = loadAuth();
  if (!auth?.access_token) throw new Error('Chưa đăng nhập — cần Access Token');
  return new GommoClient({
    accessToken: auth.access_token,
    domain: auth.domain,
    projectId: auth.projectId,
  });
}

export function getDisplayUser(): DisplayUser {
  const u = loadAuth()?.upstream_me?.userInfo;
  if (u) {
    return {
      name: u.name?.trim() || u.username?.trim() || null,
      email: u.email?.trim() || '',
      avatar: u.avatar || null,
      username: u.username || null,
    };
  }
  const session = loadSession();
  if (session) {
    return {
      name: session.user.name?.trim() || null,
      email: session.user.email || '',
      avatar: null,
      username: null,
    };
  }
  return { name: null, email: '', avatar: null, username: null };
}

export function getCreditsAi(): number {
  const auth = loadAuth();
  if (auth?.upstream_me) return auth.upstream_me.balancesInfo?.credits_ai ?? 0;
  return loadSession()?.balance ?? 0;
}

/** Thông báo số dư credit vừa thay đổi (vd sau khi tạo job) để header tự refresh. */
export function notifyCreditsUpdated(): void {
  document.dispatchEvent(new CustomEvent('credits:updated'));
}

export function getUpstreamMe(): UpstreamMeResponse | null {
  return loadAuth()?.upstream_me ?? null;
}

export async function loginWithGommoToken(
  accessToken: string,
  domain: string,
): Promise<AuthState> {
  const upstream_me = await fetchUpstreamMe(accessToken, domain);
  const state: AuthState = {
    access_token: accessToken.trim(),
    domain: domain.trim(),
    projectId: DEFAULT_PROJECT_ID,
    upstream_me,
  };
  saveAuth(state);
  return state;
}

export async function refreshSession(): Promise<AuthState> {
  const auth = loadAuth();
  if (!auth) throw new Error('Chưa đăng nhập');
  const upstream_me = await fetchUpstreamMe(auth.access_token, auth.domain);
  const next = { ...auth, upstream_me };
  saveAuth(next);
  return next;
}

/** @deprecated dùng getCreditsAi — giữ cho code cũ tạm thời */
export function getToken(): string | null {
  return loadAuth()?.access_token ?? null;
}

export function updateBalance(_balance: number): void {
  /* credit upstream — refreshSession() để cập nhật */
}
