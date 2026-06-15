import { randomUUID } from 'crypto';
import { config } from '../config.js';
import { db } from '../db.js';
import { getBalance, seedSignupBonus } from './credits.js';
import { OAUTH_PASSWORD_SENTINEL } from './passwordReset.js';
import { signToken } from '../middleware/auth.js';
import { getUpstreamPublicInfo } from './upstreamAuth.js';

interface GoogleTokenInfo {
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  exp?: string;
}

export async function loginWithGoogleCredential(credential: string) {
  if (!config.google.clientId) {
    throw new Error('GOOGLE_CLIENT_ID chưa cấu hình trên server');
  }

  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
  );
  if (!res.ok) throw new Error('Google token không hợp lệ');

  const info = (await res.json()) as GoogleTokenInfo;

  if (info.aud !== config.google.clientId) {
    throw new Error('Google client ID không khớp');
  }
  if (!info.sub || !info.email) {
    throw new Error('Thiếu thông tin từ Google');
  }
  if (info.email_verified === false || info.email_verified === 'false') {
    throw new Error('Email Google chưa xác minh');
  }

  const email = info.email.toLowerCase();
  let user = db
    .prepare('SELECT id, email, name, google_id, auth_provider FROM users WHERE google_id = ? OR email = ?')
    .get(info.sub, email) as {
    id: string;
    email: string;
    name: string | null;
    google_id: string | null;
    auth_provider?: string;
  } | undefined;

  if (!user) {
    const userId = randomUUID();
    const tx = db.transaction(() => {
      db.prepare(
        `INSERT INTO users (id, email, password_hash, name, google_id, auth_provider)
         VALUES (?, ?, ?, ?, ?, 'google')`,
      ).run(userId, email, OAUTH_PASSWORD_SENTINEL, info.name || null, info.sub);
      db.prepare('INSERT INTO credit_balances (user_id, balance) VALUES (?, 0)').run(userId);
      seedSignupBonus(userId, config.credits.signupBonus);
    });
    tx();
    user = db
      .prepare('SELECT id, email, name, google_id, auth_provider FROM users WHERE id = ?')
      .get(userId) as typeof user;
  } else if (!user.google_id) {
    db.prepare('UPDATE users SET google_id = ?, auth_provider = ? WHERE id = ?').run(
      info.sub,
      user.auth_provider === 'local' ? 'local' : 'google',
      user.id,
    );
    if (!user.name && info.name) {
      db.prepare('UPDATE users SET name = ? WHERE id = ?').run(info.name, user.id);
      user.name = info.name;
    }
  }

  const token = signToken({ userId: user!.id, email: user!.email });
  return {
    token,
    user: {
      id: user!.id,
      email: user!.email,
      name: user!.name,
      auth_provider: user!.auth_provider || 'google',
    },
    balance: getBalance(user!.id),
  };
}

export function updateProfile(userId: string, name: string | null): {
  id: string;
  email: string;
  name: string | null;
  auth_provider: string;
  created_at: string;
} {
  db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name?.trim() || null, userId);
  return db
    .prepare('SELECT id, email, name, auth_provider, created_at FROM users WHERE id = ?')
    .get(userId) as {
    id: string;
    email: string;
    name: string | null;
    auth_provider: string;
    created_at: string;
  };
}

export function getPublicUser(userId: string) {
  const user = db
    .prepare('SELECT id, email, name, auth_provider, created_at, password_hash FROM users WHERE id = ?')
    .get(userId) as {
    id: string;
    email: string;
    name: string | null;
    auth_provider: string;
    created_at: string;
    password_hash: string;
  } | undefined;

  if (!user) return null;

  const { password_hash, ...publicUser } = user;
  return {
    ...publicUser,
    has_password: password_hash !== OAUTH_PASSWORD_SENTINEL,
    ...getUpstreamPublicInfo(userId),
  };
}
