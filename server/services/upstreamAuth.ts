import { createHash, randomUUID } from 'crypto';
import { config } from '../config.js';
import { db } from '../db.js';
import { getBalance, seedSignupBonus } from './credits.js';
import { signToken } from '../middleware/auth.js';
import { OAUTH_PASSWORD_SENTINEL } from './passwordReset.js';
import {
  type GommoContext,
  type UpstreamMeResponse,
  defaultGommoContext,
  fetchUpstreamMe,
} from './gommo.js';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  auth_provider: string;
};

export function saveUpstreamCredentials(
  userId: string,
  accessToken: string,
  domain: string,
  projectId: string,
  upstreamIdBase?: string | null,
): void {
  const tokenHash = hashToken(accessToken);
  db.prepare(
    `INSERT INTO user_upstream_credentials (user_id, access_token, domain, project_id, token_hash, upstream_id_base, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       access_token = excluded.access_token,
       domain = excluded.domain,
       project_id = excluded.project_id,
       token_hash = excluded.token_hash,
       upstream_id_base = excluded.upstream_id_base,
       updated_at = datetime('now')`,
  ).run(userId, accessToken, domain, projectId, tokenHash, upstreamIdBase ?? null);
}

export function getUpstreamContext(userId: string): GommoContext {
  const row = db
    .prepare(
      `SELECT access_token, domain, project_id FROM user_upstream_credentials WHERE user_id = ?`,
    )
    .get(userId) as { access_token: string; domain: string; project_id: string } | undefined;

  if (row?.access_token) {
    return {
      accessToken: row.access_token,
      domain: row.domain,
      projectId: row.project_id,
    };
  }

  const fallback = defaultGommoContext();
  if (!fallback.accessToken) {
    throw new Error('Chưa cấu hình upstream token — đăng nhập bằng Access Token hoặc set GOMMO_ACCESS_TOKEN');
  }
  return fallback;
}

export function hasUserUpstreamToken(userId: string): boolean {
  const row = db
    .prepare('SELECT user_id FROM user_upstream_credentials WHERE user_id = ?')
    .get(userId);
  return Boolean(row);
}

export function getUpstreamPublicInfo(userId: string): {
  has_upstream_token: boolean;
  upstream_domain?: string;
  upstream_project_id?: string;
  upstream_credits_ai?: number;
} {
  const row = db
    .prepare('SELECT domain, project_id FROM user_upstream_credentials WHERE user_id = ?')
    .get(userId) as { domain: string; project_id: string } | undefined;

  if (!row) return { has_upstream_token: false };
  return {
    has_upstream_token: true,
    upstream_domain: row.domain,
    upstream_project_id: row.project_id,
  };
}

const DOMAIN_CANDIDATES = ['vmedia.ai', 'umm.ai.vn'];

export async function resolveValidContext(
  accessToken: string,
  domainHint?: string,
  projectId?: string,
): Promise<{ ctx: GommoContext; me: UpstreamMeResponse }> {
  const domains = [
    ...(domainHint?.trim() ? [domainHint.trim()] : []),
    config.gommo.domain,
    ...DOMAIN_CANDIDATES,
  ];
  const uniqueDomains = [...new Set(domains)];

  let lastError: Error | null = null;
  for (const domain of uniqueDomains) {
    try {
      const me = await fetchUpstreamMe(accessToken, domain);
      return {
        ctx: {
          accessToken: accessToken.trim(),
          domain,
          projectId: projectId?.trim() || config.gommo.projectId,
        },
        me,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError ?? new Error('Access token không hợp lệ hoặc domain chưa whitelist');
}

function findUserForUpstream(
  tokenHash: string,
  upstreamIdBase: string | undefined,
  domain: string,
  email: string | undefined,
): UserRow | undefined {
  if (upstreamIdBase) {
    const byUpstream = db
      .prepare(
        `SELECT u.id, u.email, u.name, u.auth_provider
         FROM users u
         JOIN user_upstream_credentials c ON c.user_id = u.id
         WHERE c.upstream_id_base = ? AND c.domain = ?`,
      )
      .get(upstreamIdBase, domain) as UserRow | undefined;
    if (byUpstream) return byUpstream;
  }

  const byToken = db
    .prepare(
      `SELECT u.id, u.email, u.name, u.auth_provider
       FROM users u
       JOIN user_upstream_credentials c ON c.user_id = u.id
       WHERE c.token_hash = ?`,
    )
    .get(tokenHash) as UserRow | undefined;
  if (byToken) return byToken;

  if (email) {
    return db
      .prepare('SELECT id, email, name, auth_provider FROM users WHERE email = ?')
      .get(email) as UserRow | undefined;
  }

  return undefined;
}

function upsertTokenUser(
  user: UserRow | undefined,
  profile: { email: string; name: string | null },
  ctx: GommoContext,
  upstreamIdBase: string | null,
): UserRow {
  if (user) {
    db.prepare(`UPDATE users SET name = COALESCE(?, name), email = ?, auth_provider = 'token' WHERE id = ?`).run(
      profile.name,
      profile.email,
      user.id,
    );
    saveUpstreamCredentials(user.id, ctx.accessToken, ctx.domain, ctx.projectId, upstreamIdBase);
    return {
      ...user,
      email: profile.email,
      name: profile.name ?? user.name,
      auth_provider: 'token',
    };
  }

  const userId = randomUUID();
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, auth_provider) VALUES (?, ?, ?, ?, 'token')`,
    ).run(userId, profile.email, OAUTH_PASSWORD_SENTINEL, profile.name);
    db.prepare('INSERT INTO credit_balances (user_id, balance) VALUES (?, 0)').run(userId);
    seedSignupBonus(userId, config.credits.signupBonus);
    saveUpstreamCredentials(userId, ctx.accessToken, ctx.domain, ctx.projectId, upstreamIdBase);
  });
  tx();

  return db
    .prepare('SELECT id, email, name, auth_provider FROM users WHERE id = ?')
    .get(userId) as UserRow;
}

export async function loginWithAccessToken(
  accessToken: string,
  opts: { domain?: string; project_id?: string } = {},
) {
  const { ctx, me } = await resolveValidContext(accessToken, opts.domain, opts.project_id);
  const info = me.userInfo!;
  const email = (info.email || `${info.id_base}@upstream.local`).trim().toLowerCase();
  const name = info.name?.trim() || info.username?.trim() || null;
  const upstreamIdBase = info.id_base || null;
  const tokenHash = hashToken(ctx.accessToken);

  const existing = findUserForUpstream(tokenHash, upstreamIdBase ?? undefined, ctx.domain, email);
  const user = upsertTokenUser(existing, { email, name }, ctx, upstreamIdBase);

  const jwt = signToken({ userId: user.id, email: user.email });
  return {
    token: jwt,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      auth_provider: 'token' as const,
      avatar: info.avatar ?? null,
      upstream_username: info.username ?? null,
    },
    balance: getBalance(user.id),
    upstream: {
      domain: ctx.domain,
      project_id: ctx.projectId,
      credits_ai: me.balancesInfo?.credits_ai ?? null,
    },
  };
}

export async function updateUserUpstreamToken(
  userId: string,
  accessToken: string,
  opts: { domain?: string; project_id?: string } = {},
): Promise<{ domain: string; project_id: string; credits_ai: number | null }> {
  const { ctx, me } = await resolveValidContext(accessToken, opts.domain, opts.project_id);
  saveUpstreamCredentials(
    userId,
    ctx.accessToken,
    ctx.domain,
    ctx.projectId,
    me.userInfo?.id_base ?? null,
  );
  return {
    domain: ctx.domain,
    project_id: ctx.projectId,
    credits_ai: me.balancesInfo?.credits_ai ?? null,
  };
}
