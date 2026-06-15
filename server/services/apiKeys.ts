import { createHash, randomBytes, randomUUID } from 'crypto';
import { db } from '../db.js';

function hashKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function generateRawKey(): string {
  return `sk_${randomBytes(24).toString('hex')}`;
}

export interface ApiKeyRow {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  created_at: string;
  last_used_at: string | null;
}

export function listApiKeys(userId: string) {
  return db
    .prepare(
      `SELECT id, name, key_prefix, created_at, last_used_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC`,
    )
    .all(userId) as Pick<ApiKeyRow, 'id' | 'name' | 'key_prefix' | 'created_at' | 'last_used_at'>[];
}

export function createApiKey(userId: string, name: string): { key: ApiKeyRow; rawKey: string } {
  const trimmed = name?.trim();
  if (!trimmed) throw new Error('Tên API key là bắt buộc');

  const rawKey = generateRawKey();
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.slice(0, 12) + '…';
  const id = randomUUID();

  db.prepare(
    `INSERT INTO api_keys (id, user_id, name, key_prefix, key_hash) VALUES (?, ?, ?, ?, ?)`,
  ).run(id, userId, trimmed, keyPrefix, keyHash);

  const key = db.prepare('SELECT * FROM api_keys WHERE id = ?').get(id) as ApiKeyRow;
  return { key, rawKey };
}

export function deleteApiKey(userId: string, keyId: string): boolean {
  const result = db.prepare('DELETE FROM api_keys WHERE id = ? AND user_id = ?').run(keyId, userId);
  return result.changes > 0;
}

export function verifyApiKey(rawKey: string): { userId: string; keyId: string } | null {
  if (!rawKey?.startsWith('sk_')) return null;
  const keyHash = hashKey(rawKey);
  const row = db
    .prepare('SELECT id, user_id FROM api_keys WHERE key_hash = ?')
    .get(keyHash) as { id: string; user_id: string } | undefined;

  if (!row) return null;

  db.prepare(`UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?`).run(row.id);
  return { userId: row.user_id, keyId: row.id };
}
