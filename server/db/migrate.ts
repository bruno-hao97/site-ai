import type Database from 'better-sqlite3';

function ensureUserColumns(db: Database.Database): void {
  const cols = db.prepare('PRAGMA table_info(users)').all() as { name: string }[];
  const names = new Set(cols.map((c) => c.name));

  if (!names.has('google_id')) {
    db.exec('ALTER TABLE users ADD COLUMN google_id TEXT');
  }
  if (!names.has('auth_provider')) {
    db.exec("ALTER TABLE users ADD COLUMN auth_provider TEXT NOT NULL DEFAULT 'local'");
  }
}

function ensureUserTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      key_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_used_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
  `);
}

function ensureUpstreamTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_upstream_credentials (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      access_token TEXT NOT NULL,
      domain TEXT NOT NULL,
      project_id TEXT NOT NULL DEFAULT 'default',
      token_hash TEXT NOT NULL UNIQUE,
      upstream_id_base TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const cols = db.prepare('PRAGMA table_info(user_upstream_credentials)').all() as { name: string }[];
  if (!cols.some((c) => c.name === 'upstream_id_base')) {
    db.exec('ALTER TABLE user_upstream_credentials ADD COLUMN upstream_id_base TEXT');
  }
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_upstream_id_domain
      ON user_upstream_credentials(upstream_id_base, domain)
      WHERE upstream_id_base IS NOT NULL;
  `);
}

export function runMigrations(db: Database.Database): void {
  ensureUserColumns(db);
  ensureUserTables(db);
  ensureUpstreamTable(db);
}
