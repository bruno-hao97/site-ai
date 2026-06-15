import { randomUUID } from 'crypto';
import { db } from '../db.js';

export type CreditTxType = 'signup_bonus' | 'job_charge' | 'job_refund' | 'topup' | 'promotion';

export function getBalance(userId: string): number {
  const row = db.prepare('SELECT balance FROM credit_balances WHERE user_id = ?').get(userId) as { balance: number } | undefined;
  return row?.balance ?? 0;
}

export function addCredits(
  userId: string,
  amount: number,
  type: CreditTxType,
  opts: { jobId?: string; idempotencyKey: string; description?: string } = { idempotencyKey: randomUUID() },
): number {
  if (amount <= 0) throw new Error('amount phải > 0');

  const tx = db.transaction(() => {
    const existing = db
      .prepare('SELECT id FROM credit_transactions WHERE idempotency_key = ?')
      .get(opts.idempotencyKey);
    if (existing) return getBalance(userId);

    db.prepare(
      `INSERT INTO credit_transactions (id, user_id, amount, type, job_id, idempotency_key, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(randomUUID(), userId, amount, type, opts.jobId ?? null, opts.idempotencyKey, opts.description ?? null);

    db.prepare(
      `INSERT INTO credit_balances (user_id, balance) VALUES (?, ?)
       ON CONFLICT(user_id) DO UPDATE SET balance = balance + ?`,
    ).run(userId, amount, amount);

    return getBalance(userId);
  });

  return tx();
}

export function deductCredits(
  userId: string,
  amount: number,
  opts: { jobId: string; idempotencyKey: string; description?: string },
): number {
  if (amount <= 0) throw new Error('amount phải > 0');

  const tx = db.transaction(() => {
    const existing = db
      .prepare('SELECT id FROM credit_transactions WHERE idempotency_key = ?')
      .get(opts.idempotencyKey);
    if (existing) return getBalance(userId);

    const balance = getBalance(userId);
    if (balance < amount) {
      throw new Error(`Không đủ credit (cần ${amount}, có ${balance})`);
    }

    db.prepare(
      `INSERT INTO credit_transactions (id, user_id, amount, type, job_id, idempotency_key, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      randomUUID(),
      userId,
      -amount,
      'job_charge',
      opts.jobId,
      opts.idempotencyKey,
      opts.description ?? `Trừ credit job ${opts.jobId}`,
    );

    db.prepare('UPDATE credit_balances SET balance = balance - ? WHERE user_id = ?').run(amount, userId);
    return getBalance(userId);
  });

  return tx();
}

export function refundJobCredits(userId: string, jobId: string, amount: number): number {
  return addCredits(userId, amount, 'job_refund', {
    jobId,
    idempotencyKey: `job_refund_${jobId}`,
    description: `Hoàn credit job ${jobId}`,
  });
}

export function seedSignupBonus(userId: string, amount: number): void {
  addCredits(userId, amount, 'signup_bonus', {
    idempotencyKey: `signup_bonus_${userId}`,
    description: 'Credit khởi tạo khi đăng ký',
  });
}

export interface CreditTransaction {
  id: string;
  amount: number;
  type: string;
  job_id: string | null;
  description: string | null;
  created_at: string;
}

export function listTransactions(userId: string, limit = 20): CreditTransaction[] {
  return db
    .prepare(
      `SELECT id, amount, type, job_id, description, created_at
       FROM credit_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
    )
    .all(userId, limit) as CreditTransaction[];
}
