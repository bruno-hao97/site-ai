import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { db } from '../db.js';
import { config } from '../config.js';
import { authMiddleware, signToken } from '../middleware/auth.js';
import { getBalance, seedSignupBonus } from '../services/credits.js';
import { changePassword, requestPasswordReset, resetPassword } from '../services/passwordReset.js';
import { getPublicUser, loginWithGoogleCredential, updateProfile } from '../services/users.js';
import { loginWithAccessToken, updateUserUpstreamToken } from '../services/upstreamAuth.js';

const router = Router();

router.post('/register', (req, res) => {
  const { email, password, name } = req.body as { email?: string; password?: string; name?: string };

  if (!email?.trim() || !password || password.length < 6) {
    res.status(400).json({ success: false, message: 'Email và mật khẩu (≥6 ký tự) là bắt buộc' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) {
    res.status(409).json({ success: false, message: 'Email đã được sử dụng' });
    return;
  }

  const userId = randomUUID();
  const passwordHash = bcrypt.hashSync(password, 10);

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, auth_provider) VALUES (?, ?, ?, ?, 'local')`,
    ).run(userId, normalizedEmail, passwordHash, name?.trim() || null);
    db.prepare('INSERT INTO credit_balances (user_id, balance) VALUES (?, 0)').run(userId);
    seedSignupBonus(userId, config.credits.signupBonus);
  });
  tx();

  const token = signToken({ userId, email: normalizedEmail });
  res.status(201).json({
    success: true,
    data: {
      token,
      user: { id: userId, email: normalizedEmail, name: name?.trim() || null, auth_provider: 'local' },
      balance: getBalance(userId),
    },
  });
});

router.post('/login-token', async (req, res) => {
  const { access_token, domain, project_id } = req.body as {
    access_token?: string;
    domain?: string;
    project_id?: string;
  };

  if (!access_token?.trim()) {
    res.status(400).json({ success: false, message: 'access_token là bắt buộc' });
    return;
  }

  try {
    const data = await loginWithAccessToken(access_token.trim(), { domain, project_id });
    res.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(401).json({ success: false, message });
  }
});

router.post('/upstream-token', authMiddleware, async (req, res) => {
  const { access_token, domain, project_id } = req.body as {
    access_token?: string;
    domain?: string;
    project_id?: string;
  };

  if (!access_token?.trim()) {
    res.status(400).json({ success: false, message: 'access_token là bắt buộc' });
    return;
  }

  try {
    const upstream = await updateUserUpstreamToken(req.user!.userId, access_token.trim(), {
      domain,
      project_id,
    });
    const user = getPublicUser(req.user!.userId);
    res.json({
      success: true,
      data: { user, balance: getBalance(req.user!.userId), upstream },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ success: false, message });
  }
});

router.post('/login', (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email?.trim() || !password) {
    res.status(400).json({ success: false, message: 'Email và mật khẩu là bắt buộc' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = db
    .prepare('SELECT id, email, password_hash, name, auth_provider FROM users WHERE email = ?')
    .get(normalizedEmail) as {
    id: string;
    email: string;
    password_hash: string;
    name: string | null;
    auth_provider?: string;
  } | undefined;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
    return;
  }

  const token = signToken({ userId: user.id, email: user.email });
  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        auth_provider: user.auth_provider || 'local',
      },
      balance: getBalance(user.id),
    },
  });
});

router.post('/google', async (req, res) => {
  const { credential } = req.body as { credential?: string };
  if (!credential?.trim()) {
    res.status(400).json({ success: false, message: 'credential (id_token) là bắt buộc' });
    return;
  }

  try {
    const data = await loginWithGoogleCredential(credential.trim());
    res.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(401).json({ success: false, message });
  }
});

router.get('/google/config', (_req, res) => {
  res.json({
    success: true,
    data: {
      clientId: config.google.clientId || null,
      enabled: Boolean(config.google.clientId),
    },
  });
});

router.post('/forgot-password', (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email?.trim()) {
    res.status(400).json({ success: false, message: 'Email là bắt buộc' });
    return;
  }

  const result = requestPasswordReset(email);
  res.json({
    success: true,
    data: {
      message: result.message,
      ...(result.resetUrl ? { reset_url: result.resetUrl } : {}),
    },
  });
});

router.post('/reset-password', (req, res) => {
  const { token, password } = req.body as { token?: string; password?: string };
  if (!token?.trim() || !password) {
    res.status(400).json({ success: false, message: 'token và password là bắt buộc' });
    return;
  }

  try {
    resetPassword(token.trim(), password);
    res.json({ success: true, data: { message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập.' } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ success: false, message });
  }
});

router.get('/me', authMiddleware, (req, res) => {
  const user = getPublicUser(req.user!.userId);
  if (!user) {
    res.status(404).json({ success: false, message: 'User không tồn tại' });
    return;
  }

  res.json({
    success: true,
    data: { user, balance: getBalance(user.id) },
  });
});

router.patch('/me', authMiddleware, (req, res) => {
  const { name } = req.body as { name?: string };
  try {
    const user = updateProfile(req.user!.userId, name ?? null);
    res.json({
      success: true,
      data: { user: getPublicUser(user.id), balance: getBalance(user.id) },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ success: false, message });
  }
});

router.post('/change-password', authMiddleware, (req, res) => {
  const { current_password, new_password } = req.body as {
    current_password?: string;
    new_password?: string;
  };

  if (!new_password) {
    res.status(400).json({ success: false, message: 'new_password là bắt buộc' });
    return;
  }

  try {
    changePassword(req.user!.userId, current_password || '', new_password);
    res.json({ success: true, data: { message: 'Đổi mật khẩu thành công' } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ success: false, message });
  }
});

export default router;
