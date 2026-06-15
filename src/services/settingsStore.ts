/** localStorage — chỉ dùng demo / nội bộ (rủi ro XSS). */
const KEYS = {
  token: 'gommo_access_token',
  domain: 'gommo_domain',
  projectId: 'gommo_project_id',
} as const;

export const DEFAULT_DOMAIN = '79ai.net';
export const DEFAULT_PROJECT_ID = 'default';

export interface GommoSettings {
  accessToken: string;
  domain: string;
  projectId: string;
}

export function loadSettings(): GommoSettings {
  return {
    accessToken: localStorage.getItem(KEYS.token) || '',
    domain: localStorage.getItem(KEYS.domain) || DEFAULT_DOMAIN,
    projectId: localStorage.getItem(KEYS.projectId) || DEFAULT_PROJECT_ID,
  };
}

export function saveSettings(partial: Partial<GommoSettings>): void {
  if (partial.accessToken != null) {
    if (partial.accessToken) localStorage.setItem(KEYS.token, partial.accessToken);
    else localStorage.removeItem(KEYS.token);
  }
  if (partial.domain != null) {
    localStorage.setItem(KEYS.domain, partial.domain || DEFAULT_DOMAIN);
  }
  if (partial.projectId != null) {
    localStorage.setItem(KEYS.projectId, partial.projectId || DEFAULT_PROJECT_ID);
  }
}

export function hasToken(): boolean {
  return Boolean(loadSettings().accessToken?.trim());
}
