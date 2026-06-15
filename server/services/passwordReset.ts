import { createHash, randomBytes, randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { db } from '../db.js';

const OAUTH_PASSWORD_SENTINEL = '!oauth:google!';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function requestPasswordReset(email: string): { resetUrl?: string; message: string } {
  const normalized = email.trim().toLowerCase();
  const user = db
    .prepare('SELECT id, email, auth_provider FROM users WHERE email = ?')
    .get(normalized) as { id: string; email: string; auth_provider?: string } | undefined;

  const genericMessage =
    'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi (dev: xem link bên dưới hoặc log server).';

  if (!user) {
    return { message: genericMessage };
  }

  if (user.auth_provider === 'google') {
    return { message: 'Tài khoản đăng nhập bằng Google — dùng Google để vào, hoặc đặt mật khẩu trong Hồ sơ.' };
  }

  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + config.passwordReset.expiresHours * 3600_000).toISOString();

  db.prepare(
    `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`,
  ).run(randomUUID(), user.id, tokenHash, expiresAt);

  const resetUrl = `${config.appUrl}/reset-password?token=${rawToken}`;

  if (config.passwordReset.devReturnLink) {
    console.log(`[password-reset] ${user.email} → ${resetUrl}`);
    return { resetUrl, message: genericMessage };
  }

  return { message: genericMessage };
}

export function resetPassword(token: string, newPassword: string): void {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự');
  }

  const tokenHash = hashToken(token);
  const row = db
    .prepare(
      `SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ?`,
    )
    .get(tokenHash) as {
    id: string;
    user_id: string;
    expires_at: string;
    used_at: string | null;
  } | undefined;

  if (!row || row.used_at) throw new Error('Token không hợp lệ hoặc đã dùng');
  if (new Date(row.expires_at) < new Date()) throw new Error('Token đã hết hạn');

  const passwordHash = bcrypt.hashSync(newPassword, 10);

  const tx = db.transaction(() => {
    db.prepare('UPDATE users SET password_hash = ?, auth_provider = ? WHERE id = ?').run(
      passwordHash,
      'local',
      row.user_id,
    );
    db.prepare(`UPDATE password_reset_tokens SET used_at = datetime('now') WHERE id = ?`).run(row.id);
  });
  tx();
}

export function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): void {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự');
  }

  const user = db
    .prepare('SELECT password_hash, auth_provider FROM users WHERE id = ?')
    .get(userId) as { password_hash: string; auth_provider?: string } | undefined;

  if (!user) throw new Error('User không tồn tại');

  if (user.auth_provider === 'google' && user.password_hash === OAUTH_PASSWORD_SENTINEL) {
    db.prepare('UPDATE users SET password_hash = ?, auth_provider = ? WHERE id = ?').run(
      bcrypt.hashSync(newPassword, 10),
      'local',
      userId,
    );
    return;
  }

  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    throw new Error('Mật khẩu hiện tại không đúng');
  }

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(
    bcrypt.hashSync(newPassword, 10),
    userId,
  );
}

export { OAUTH_PASSWORD_SENTINEL };
