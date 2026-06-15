import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { config } from './config.js';
import { runMigrations } from './db/migrate.js';

const dir = path.dirname(config.dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

export const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS credit_balances (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0)
  );

  CREATE TABLE IF NOT EXISTS credit_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL,
    job_id TEXT,
    idempotency_key TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    model_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    gommo_job_id TEXT,
    result_url TEXT,
    cost INTEGER NOT NULL DEFAULT 0,
    payload TEXT,
    error TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
  CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
  CREATE INDEX IF NOT EXISTS idx_credit_tx_user ON credit_transactions(user_id);

  CREATE TABLE IF NOT EXISTS topup_orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    package_id TEXT NOT NULL,
    credits INTEGER NOT NULL,
    bonus_credits INTEGER NOT NULL DEFAULT 0,
    amount_vnd INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    provider TEXT NOT NULL DEFAULT 'mock',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_topup_user ON topup_orders(user_id);
`);

runMigrations(db);

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  created_at: string;
}

export interface JobRow {
  id: string;
  user_id: string;
  type: string;
  model_id: string;
  status: string;
  gommo_job_id: string | null;
  result_url: string | null;
  cost: number;
  payload: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface TopupOrderRow {
  id: string;
  user_id: string;
  package_id: string;
  credits: number;
  bonus_credits: number;
  amount_vnd: number;
  status: string;
  provider: string;
  created_at: string;
  completed_at: string | null;
}
