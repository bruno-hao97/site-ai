import { GOMMO_AUTH_PATH } from './upstreamMe';

export class GommoAuthError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'GommoAuthError';
    this.status = status;
  }
}

async function parseAuthResponse(res: Response): Promise<{ access_token?: string; message?: string; error?: number }> {
  const text = await res.text();
  try {
    return JSON.parse(text) as { access_token?: string; message?: string; error?: number; success?: boolean };
  } catch {
    throw new GommoAuthError(text || `HTTP ${res.status}`, res.status);
  }
}

/** Đăng nhập Gommo qua proxy — POST /api/apps/go-mmo/auth/login */
export async function gommoLoginWithPassword(
  email: string,
  password: string,
  domain: string,
): Promise<string> {
  const body = new URLSearchParams({
    email: email.trim(),
    password,
    domain: domain.trim(),
  }).toString();

  const res = await fetch(`${GOMMO_AUTH_PATH}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const parsed = await parseAuthResponse(res);
  if (!res.ok || parsed.error || !parsed.access_token) {
    throw new GommoAuthError(parsed.message || 'Đăng nhập thất bại', res.status);
  }
  return parsed.access_token;
}

export interface GommoRegisterInput {
  email: string;
  password: string;
  phone: string;
  domain: string;
  name?: string;
}

/** Đăng ký Gommo qua proxy — POST /api/apps/go-mmo/auth/register */
export async function gommoRegisterWithPassword(input: GommoRegisterInput): Promise<string> {
  const body = new URLSearchParams({
    name: input.name?.trim() || '',
    email: input.email.trim(),
    password: input.password,
    phone: input.phone.trim(),
    domain: input.domain.trim(),
  }).toString();

  const res = await fetch(`${GOMMO_AUTH_PATH}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const parsed = await parseAuthResponse(res);
  if (!res.ok || parsed.error || !parsed.access_token) {
    const status = /tồn tại|exist/i.test(parsed.message || '') ? 409 : res.status;
    throw new GommoAuthError(parsed.message || 'Đăng ký thất bại', status);
  }
  return parsed.access_token;
}
