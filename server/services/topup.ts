import { randomUUID } from 'crypto';
import { config } from '../config.js';
import { db, type TopupOrderRow } from '../db.js';
import { addCredits, getBalance } from './credits.js';

export function getPackages() {
  return config.topup.packages.map((p) => ({
    ...p,
    bonusHint:
      config.topup.firstTopupBonusPercent > 0
        ? `+${config.topup.firstTopupBonusPercent}% lần nạp đầu`
        : undefined,
  }));
}

function getPackage(packageId: string) {
  return config.topup.packages.find((p) => p.id === packageId);
}

function hasCompletedTopup(userId: string): boolean {
  const row = db
    .prepare(`SELECT id FROM topup_orders WHERE user_id = ? AND status = 'completed' LIMIT 1`)
    .get(userId);
  return Boolean(row);
}

function calcBonusCredits(baseCredits: number, userId: string): number {
  if (hasCompletedTopup(userId)) return 0;
  const pct = config.topup.firstTopupBonusPercent;
  if (pct <= 0) return 0;
  return Math.floor((baseCredits * pct) / 100);
}

export function createTopupOrder(userId: string, packageId: string): TopupOrderRow {
  const pkg = getPackage(packageId);
  if (!pkg) throw new Error('Gói nạp không tồn tại');

  const bonusCredits = calcBonusCredits(pkg.credits, userId);
  const id = randomUUID();

  db.prepare(
    `INSERT INTO topup_orders (id, user_id, package_id, credits, bonus_credits, amount_vnd, status, provider)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', 'mock')`,
  ).run(id, userId, packageId, pkg.credits, bonusCredits, pkg.priceVnd);

  return db.prepare('SELECT * FROM topup_orders WHERE id = ?').get(id) as TopupOrderRow;
}

export function completeTopupOrder(userId: string, orderId: string): {
  order: TopupOrderRow;
  balance: number;
  creditsAdded: number;
} {
  const order = db
    .prepare('SELECT * FROM topup_orders WHERE id = ? AND user_id = ?')
    .get(orderId, userId) as TopupOrderRow | undefined;

  if (!order) throw new Error('Đơn nạp không tồn tại');
  if (order.status === 'completed') {
    return {
      order,
      balance: getBalance(userId),
      creditsAdded: order.credits + order.bonus_credits,
    };
  }
  if (order.status !== 'pending') throw new Error(`Đơn nạp ở trạng thái ${order.status}`);

  const totalCredits = order.credits + order.bonus_credits;

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE topup_orders SET status = 'completed', completed_at = datetime('now') WHERE id = ?`,
    ).run(orderId);

    addCredits(userId, order.credits, 'topup', {
      idempotencyKey: `topup_${orderId}`,
      description: `Nạp credit — gói ${order.package_id}`,
    });

    if (order.bonus_credits > 0) {
      addCredits(userId, order.bonus_credits, 'promotion', {
        idempotencyKey: `topup_promo_${orderId}`,
        description: `Khuyến mãi lần nạp đầu (+${config.topup.firstTopupBonusPercent}%)`,
      });
    }
  });

  tx();

  const updated = db.prepare('SELECT * FROM topup_orders WHERE id = ?').get(orderId) as TopupOrderRow;
  return { order: updated, balance: getBalance(userId), creditsAdded: totalCredits };
}

export function listTopupOrders(userId: string, limit = 20) {
  return db
    .prepare(
      `SELECT id, package_id, credits, bonus_credits, amount_vnd, status, provider, created_at, completed_at
       FROM topup_orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
    )
    .all(userId, limit) as TopupOrderRow[];
}

export function toPublicOrder(row: TopupOrderRow) {
  return {
    id: row.id,
    package_id: row.package_id,
    credits: row.credits,
    bonus_credits: row.bonus_credits,
    total_credits: row.credits + row.bonus_credits,
    amount_vnd: row.amount_vnd,
    status: row.status,
    provider: row.provider,
    created_at: row.created_at,
    completed_at: row.completed_at,
  };
}
