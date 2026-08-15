import type { JobType } from './api';

export interface LibraryPendingJob {
  id: string;
  type: JobType;
  prompt: string;
  status: 'processing' | 'failed';
  progress: number;
  createdAt: number;
  providerJobId?: string;
}

const KEY = 'library_pending_jobs';
const MAX_AGE_MS = 45 * 60 * 1000;

function loadRaw(): LibraryPendingJob[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LibraryPendingJob[];
    if (!Array.isArray(parsed)) return [];
    const cutoff = Date.now() - MAX_AGE_MS;
    return parsed.filter((j) => j.createdAt >= cutoff);
  } catch {
    return [];
  }
}

function save(jobs: LibraryPendingJob[]): void {
  sessionStorage.setItem(KEY, JSON.stringify(jobs));
  document.dispatchEvent(new CustomEvent('pending:updated'));
}

export function listPendingJobs(): LibraryPendingJob[] {
  return loadRaw();
}

export function listPendingJobsForType(type: JobType): LibraryPendingJob[] {
  return loadRaw().filter((j) => j.type === type && j.status === 'processing');
}

export function addPendingJob(
  job: Pick<LibraryPendingJob, 'id' | 'type' | 'prompt'> &
    Partial<Pick<LibraryPendingJob, 'status' | 'progress' | 'providerJobId'>>,
): LibraryPendingJob {
  const entry: LibraryPendingJob = {
    id: job.id,
    type: job.type,
    prompt: job.prompt,
    status: job.status ?? 'processing',
    progress: job.progress ?? 5,
    createdAt: Date.now(),
    providerJobId: job.providerJobId,
  };
  save([entry, ...loadRaw().filter((j) => j.id !== entry.id)]);
  return entry;
}

export function patchPendingJob(
  id: string,
  patch: Partial<Pick<LibraryPendingJob, 'providerJobId' | 'progress' | 'status'>>,
): void {
  const jobs = loadRaw();
  const next = jobs.map((j) => (j.id === id ? { ...j, ...patch } : j));
  if (next.some((j, i) => j !== jobs[i])) save(next);
}

export function bumpPendingProgress(id: string, progress: number): void {
  const jobs = loadRaw();
  const next = jobs.map((j) =>
    j.id === id
      ? { ...j, progress: Math.min(99, Math.max(j.progress ?? 5, progress)) }
      : j,
  );
  save(next);
}

export function markPendingFailed(id: string): void {
  patchPendingJob(id, { status: 'failed', progress: 100 });
}

export function removePendingJob(id: string): void {
  save(loadRaw().filter((j) => j.id !== id));
}

export type LibraryTypeTabId = 'image' | 'video' | 'tts' | 'music';

export function jobTypeToLibraryTab(type: JobType): LibraryTypeTabId {
  if (type === 'music') return 'music';
  if (type === 'tts') return 'tts';
  if (type === 'video' || type === 'avatar-lipsync') return 'video';
  return 'image';
}

export function countProcessingByLibraryTab(): Record<LibraryTypeTabId, number> {
  const counts: Record<LibraryTypeTabId, number> = {
    image: 0,
    video: 0,
    tts: 0,
    music: 0,
  };
  for (const job of loadRaw()) {
    if (job.status !== 'processing') continue;
    counts[jobTypeToLibraryTab(job.type)]++;
  }
  return counts;
}

export function libraryRouteForJobType(type: JobType): string {
  const tab =
    type === 'music' ? 'music' : type === 'tts' ? 'tts' : type === 'video' ? 'video' : 'image';
  return `/library?type=${tab}`;
}

export type MineFilterLike = 'all' | 'video' | 'image' | 'music' | 'tts' | 'favorite';

export function studioJobTypeToFilter(type: JobType): MineFilterLike {
  if (type === 'music') return 'music';
  if (type === 'tts') return 'tts';
  if (type === 'video' || type === 'avatar-lipsync') return 'video';
  return 'image';
}

export function pendingMatchesFilter(job: LibraryPendingJob, filter: MineFilterLike): boolean {
  if (filter === 'all' || filter === 'favorite') return true;
  if (filter === 'image') return job.type === 'image' || job.type === 'image-upscale' || job.type === 'remove-bg';
  if (filter === 'video') {
    return (
      job.type === 'video' ||
      job.type === 'avatar-lipsync' ||
      job.type === 'video-upscale' ||
      job.type === 'video-vfx' ||
      job.type === 'video-subtitle' ||
      job.type === 'video-cut'
    );
  }
  if (filter === 'music') return job.type === 'music';
  if (filter === 'tts') return job.type === 'tts';
  return true;
}
