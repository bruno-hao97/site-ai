import { db } from '../db.js';
import { getBalance, listTransactions } from './credits.js';
import { listJobs, toPublicJob } from './jobs.js';

export type DashboardPeriod = '7d' | '30d' | 'all';

function periodFilter(period: DashboardPeriod): { sql: string; params: unknown[] } {
  if (period === '7d') return { sql: "AND date(created_at) >= date('now', '-7 days')", params: [] };
  if (period === '30d') return { sql: "AND date(created_at) >= date('now', '-30 days')", params: [] };
  return { sql: '', params: [] };
}

function countJobs(userId: string, type: string | string[], status: string, period: DashboardPeriod): number {
  const { sql, params } = periodFilter(period);
  const types = Array.isArray(type) ? type : [type];
  const placeholders = types.map(() => '?').join(', ');
  const row = db
    .prepare(
      `SELECT COUNT(*) AS c FROM jobs
       WHERE user_id = ? AND type IN (${placeholders}) AND status = ? ${sql}`,
    )
    .get(userId, ...types, status, ...params) as { c: number };
  return row.c;
}

function creditStats(userId: string, period: DashboardPeriod) {
  const { sql, params } = periodFilter(period);
  const rows = db
    .prepare(
      `SELECT type, SUM(amount) AS total FROM credit_transactions
       WHERE user_id = ? ${sql} GROUP BY type`,
    )
    .all(userId, ...params) as { type: string; total: number }[];

  let charged = 0;
  let refunded = 0;
  let signupBonus = 0;
  let topup = 0;
  let promotion = 0;

  for (const r of rows) {
    if (r.type === 'job_charge') charged += Math.abs(r.total);
    if (r.type === 'job_refund') refunded += r.total;
    if (r.type === 'signup_bonus') signupBonus += r.total;
    if (r.type === 'topup') topup += r.total;
    if (r.type === 'promotion') promotion += r.total;
  }

  return {
    charged,
    refunded,
    consumed_net: charged - refunded,
    signup_bonus: signupBonus,
    topup,
    promotion,
    topped_up_total: topup + promotion,
  };
}

function jobsByDay(userId: string, period: DashboardPeriod) {
  const { sql, params } = periodFilter(period);
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;

  const rows = db
    .prepare(
      `SELECT date(created_at) AS day, status, COUNT(*) AS count
       FROM jobs WHERE user_id = ? ${sql}
       GROUP BY date(created_at), status
       ORDER BY day ASC`,
    )
    .all(userId, ...params) as { day: string; status: string; count: number }[];

  const map = new Map<string, { jobs: number; success: number; failed: number }>();

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const span = period === 'all' ? 90 : days;
  for (let i = span - 1; i >= 0; i--) {
    const d = new Date(start);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    map.set(key, { jobs: 0, success: 0, failed: 0 });
  }

  for (const r of rows) {
    const entry = map.get(r.day) ?? { jobs: 0, success: 0, failed: 0 };
    entry.jobs += r.count;
    if (r.status === 'success') entry.success += r.count;
    if (r.status === 'failed') entry.failed += r.count;
    map.set(r.day, entry);
  }

  return [...map.entries()].map(([date, v]) => ({ date, ...v }));
}

function creditsByDay(userId: string, period: DashboardPeriod) {
  const { sql, params } = periodFilter(period);
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;

  const rows = db
    .prepare(
      `SELECT date(created_at) AS day, type, SUM(amount) AS total
       FROM credit_transactions WHERE user_id = ? ${sql}
       GROUP BY date(created_at), type
       ORDER BY day ASC`,
    )
    .all(userId, ...params) as { day: string; type: string; total: number }[];

  const map = new Map<string, { charged: number; refunded: number; net: number }>();

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const span = period === 'all' ? 90 : days;
  for (let i = span - 1; i >= 0; i--) {
    const d = new Date(start);
    d.setDate(d.getDate() - i);
    map.set(d.toISOString().slice(0, 10), { charged: 0, refunded: 0, net: 0 });
  }

  for (const r of rows) {
    const entry = map.get(r.day) ?? { charged: 0, refunded: 0, net: 0 };
    if (r.type === 'job_charge') {
      entry.charged += Math.abs(r.total);
      entry.net += r.total;
    }
    if (r.type === 'job_refund') {
      entry.refunded += r.total;
      entry.net += r.total;
    }
    map.set(r.day, entry);
  }

  return [...map.entries()].map(([date, v]) => ({ date, ...v }));
}

export function getDashboardStats(userId: string, period: DashboardPeriod = '7d') {
  const { sql, params } = periodFilter(period);

  const totalsRow = db
    .prepare(
      `SELECT
         COUNT(*) AS jobs_total,
         SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS jobs_success,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS jobs_failed
       FROM jobs WHERE user_id = ? ${sql}`,
    )
    .get(userId, ...params) as { jobs_total: number; jobs_success: number; jobs_failed: number };

  const credits = creditStats(userId, period);

  return {
    balance: getBalance(userId),
    period,
    kpis: {
      balance: getBalance(userId),
      images_success: countJobs(userId, 'image', 'success', period),
      videos_success: countJobs(userId, ['video', 'avatar-lipsync'], 'success', period),
      credits_consumed_net: credits.consumed_net,
    },
    totals: {
      jobs_total: totalsRow.jobs_total ?? 0,
      jobs_success: totalsRow.jobs_success ?? 0,
      jobs_failed: totalsRow.jobs_failed ?? 0,
      success_rate:
        totalsRow.jobs_total > 0
          ? Math.round(((totalsRow.jobs_success ?? 0) / totalsRow.jobs_total) * 100)
          : 0,
    },
    credits,
    charts: {
      jobs_by_day: jobsByDay(userId, period),
      credits_by_day: creditsByDay(userId, period),
    },
    recent_jobs: listJobs(userId, 10).map(toPublicJob),
    recent_transactions: listTransactions(userId, 10),
  };
}
