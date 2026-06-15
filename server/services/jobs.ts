import { randomUUID } from 'crypto';
import { config } from '../config.js';
import { db, type JobRow } from '../db.js';
import {
  createGommoJob,
  extractPollSnapshot,
  classifyStatus,
  pollUntilDone,
} from './gommo.js';
import { deductCredits, refundJobCredits } from './credits.js';
import { getUpstreamContext } from './upstreamAuth.js';

export type StudioJobType = 'image' | 'video';

const JOB_CONFIG: Record<StudioJobType, { pollMedia: 'image' | 'video'; cost: () => number; label: string }> = {
  image: { pollMedia: 'image', cost: () => config.credits.imageJobCost, label: 'ảnh' },
  video: { pollMedia: 'video', cost: () => config.credits.videoJobCost, label: 'video' },
};

export function getJobCost(type: StudioJobType): number {
  return JOB_CONFIG[type].cost();
}

export function createJobRecord(
  userId: string,
  type: string,
  modelId: string,
  payload: Record<string, unknown>,
  cost: number,
): JobRow {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO jobs (id, user_id, type, model_id, status, cost, payload)
     VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
  ).run(id, userId, type, modelId, cost, JSON.stringify(payload));

  return db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as JobRow;
}

export function updateJob(
  id: string,
  patch: Partial<Pick<JobRow, 'status' | 'gommo_job_id' | 'result_url' | 'error'>>,
): void {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (patch.status != null) { fields.push('status = ?'); values.push(patch.status); }
  if (patch.gommo_job_id != null) { fields.push('gommo_job_id = ?'); values.push(patch.gommo_job_id); }
  if (patch.result_url != null) { fields.push('result_url = ?'); values.push(patch.result_url); }
  if (patch.error != null) { fields.push('error = ?'); values.push(patch.error); }

  fields.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE jobs SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function getJob(id: string, userId?: string): JobRow | null {
  if (userId) {
    return (db.prepare('SELECT * FROM jobs WHERE id = ? AND user_id = ?').get(id, userId) as JobRow) || null;
  }
  return (db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as JobRow) || null;
}

export function listJobs(userId: string, limit = 20): JobRow[] {
  return db
    .prepare('SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?')
    .all(userId, limit) as JobRow[];
}

export function toPublicJob(row: JobRow) {
  return {
    id: row.id,
    type: row.type,
    model_id: row.model_id,
    status: row.status,
    result_url: row.result_url,
    cost: row.cost,
    error: row.error,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function startJob(
  userId: string,
  type: StudioJobType,
  modelId: string,
  payload: Record<string, unknown>,
): JobRow {
  const cfg = JOB_CONFIG[type];
  const cost = cfg.cost();
  const job = createJobRecord(userId, type, modelId, payload, cost);

  deductCredits(userId, cost, {
    jobId: job.id,
    idempotencyKey: `job_charge_${job.id}`,
    description: `Tạo ${cfg.label} — ${modelId}`,
  });

  void runGommoJob(job.id, type, modelId, payload, userId, cost);
  return job;
}

export function startImageJob(
  userId: string,
  modelId: string,
  payload: Record<string, unknown>,
): JobRow {
  return startJob(userId, 'image', modelId, payload);
}

export function startVideoJob(
  userId: string,
  modelId: string,
  payload: Record<string, unknown>,
): JobRow {
  return startJob(userId, 'video', modelId, payload);
}

async function runGommoJob(
  jobId: string,
  type: StudioJobType,
  modelId: string,
  payload: Record<string, unknown>,
  userId: string,
  cost: number,
): Promise<void> {
  const { pollMedia } = JOB_CONFIG[type];

  try {
    updateJob(jobId, { status: 'processing' });

    const ctx = getUpstreamContext(userId);
    const createEnvelope = await createGommoJob(ctx, type, modelId, payload);
    const snap = extractPollSnapshot(createEnvelope);

    if (snap.idBase) updateJob(jobId, { gommo_job_id: snap.idBase });

    if (snap.resultUrl && classifyStatus(snap.status, snap.resultUrl) === 'success') {
      updateJob(jobId, { status: 'success', result_url: snap.resultUrl });
      return;
    }

    if (!snap.idBase) {
      throw new Error('Gommo không trả id_base');
    }

    const pollResult = await pollUntilDone(ctx, snap.idBase, pollMedia);

    if (pollResult.success && pollResult.resultUrl) {
      updateJob(jobId, { status: 'success', result_url: pollResult.resultUrl });
      return;
    }

    const errMsg = pollResult.error || (pollResult.timeout ? 'Poll timeout' : 'Job thất bại');
    updateJob(jobId, { status: 'failed', error: errMsg });
    refundJobCredits(userId, jobId, cost);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    updateJob(jobId, { status: 'failed', error: msg });
    refundJobCredits(userId, jobId, cost);
  }
}
