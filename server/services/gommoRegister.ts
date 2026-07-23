import { config, isGommoRegisterConfigured } from '../config.js';

export interface GommoRegisterInput {
  name?: string;
  email: string;
  password: string;
  phone: string;
  note?: string;
}

export interface GommoRegisterResult {
  accessToken: string;
  message?: string;
}

export class GommoRegisterError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'GommoRegisterError';
    this.status = status;
  }
}

/** Đăng ký user Gommo dưới admin site (manager_id + merchant access_token). */
export async function registerGommoUser(input: GommoRegisterInput): Promise<GommoRegisterResult> {
  if (!isGommoRegisterConfigured()) {
    throw new GommoRegisterError(
      'Chưa cấu hình GOMMO_ACCESS_TOKEN / GOMMO_MANAGER_ID trên server',
      503,
    );
  }

  const email = input.email.trim();
  const password = input.password;
  const phone = input.phone.trim();
  const name = (input.name || '').trim();
  const note = (input.note || '').trim();

  if (!email) throw new GommoRegisterError('Email là bắt buộc');
  if (!password || password.length < 6) {
    throw new GommoRegisterError('Mật khẩu cần ít nhất 6 ký tự');
  }
  if (!phone) throw new GommoRegisterError('Số điện thoại là bắt buộc');

  const managerId = config.gommo.managerId;
  const body = new URLSearchParams({
    name,
    email,
    password,
    phone,
    note,
    ref: managerId,
    domain: config.gommo.apiDomain,
    manager_id: managerId,
    expired_time: config.gommo.registerExpiredTime,
    access_token: config.gommo.accessToken,
  }).toString();

  const url = `${config.gommo.authBaseUrl}${config.gommo.authPath}/auth/register`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const text = await res.text();
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new GommoRegisterError(text || `HTTP ${res.status}`, res.status || 502);
  }

  const message = typeof raw.message === 'string' ? raw.message : '';
  const accessToken = typeof raw.access_token === 'string' ? raw.access_token.trim() : '';
  const hasError = Boolean(raw.error) || raw.success === false;

  if (!res.ok || hasError || !accessToken) {
    const status = /tồn tại|exist/i.test(message) ? 409 : res.status || 400;
    throw new GommoRegisterError(message || 'Đăng ký thất bại', status);
  }

  return { accessToken, message: message || undefined };
}
