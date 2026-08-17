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

export type LibraryTypeTabId = 'image' | 'video' | 'tts' | 'music';
export type MineFilterLike = 'all' | 'video' | 'image' | 'music' | 'tts' | 'favorite';

const pendingListeners = new Set<() => void>();

const EMPTY_TAB_COUNTS: Record<LibraryTypeTabId, number> = {
  image: 0,
  video: 0,
  tts: 0,
  music: 0,
};

let cachedRawSignature = '';
let cachedRawJobs: LibraryPendingJob[] = [];
const filteredSnapshots = new Map<MineFilterLike, LibraryPendingJob[]>();
let cachedTabCounts: Record<LibraryTypeTabId, number> | null = null;

function invalidateSnapshotCaches(): void {
  cachedRawSignature = '';
  filteredSnapshots.clear();
  cachedTabCounts = null;
}

export function subscribePendingStore(onStoreChange: () => void): () => void {
  pendingListeners.add(onStoreChange);
  return () => pendingListeners.delete(onStoreChange);
}

function notifyPendingStore(): void {
  invalidateSnapshotCaches();
  for (const listener of pendingListeners) listener();
  document.dispatchEvent(new CustomEvent('pending:updated'));
}

function loadRaw(): LibraryPendingJob[] {
  try {
    const raw = sessionStorage.getItem(KEY) ?? '';
    if (raw === cachedRawSignature) return cachedRawJobs;
    if (!raw) {
      cachedRawSignature = raw;
      cachedRawJobs = [];
      filteredSnapshots.clear();
      cachedTabCounts = null;
      return cachedRawJobs;
    }
    const parsed = JSON.parse(raw) as LibraryPendingJob[];
    if (!Array.isArray(parsed)) {
      cachedRawSignature = raw;
      cachedRawJobs = [];
      filteredSnapshots.clear();
      cachedTabCounts = null;
      return cachedRawJobs;
    }
    const cutoff = Date.now() - MAX_AGE_MS;
    cachedRawSignature = raw;
    cachedRawJobs = parsed.filter((j) => j.createdAt >= cutoff);
    filteredSnapshots.clear();
    cachedTabCounts = null;
    return cachedRawJobs;
  } catch {
    cachedRawSignature = '';
    cachedRawJobs = [];
    filteredSnapshots.clear();
    cachedTabCounts = null;
    return cachedRawJobs;
  }
}

function save(jobs: LibraryPendingJob[]): void {
  sessionStorage.setItem(KEY, JSON.stringify(jobs));
  notifyPendingStore();
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

/** Xóa job failed cũ khỏi session (Library không hiển thị failed). */
export function clearFailedPendingJobs(): void {
  const jobs = loadRaw();
  const next = jobs.filter((j) => j.status !== 'failed');
  if (next.length !== jobs.length) save(next);
}

export function removePendingJob(id: string): void {
  save(loadRaw().filter((j) => j.id !== id));
}

export function jobTypeToLibraryTab(type: JobType): LibraryTypeTabId {
  if (type === 'music') return 'music';
  if (type === 'tts') return 'tts';
  if (type === 'video' || type === 'avatar-lipsync') return 'video';
  return 'image';
}

function buildTabCounts(jobs: LibraryPendingJob[]): Record<LibraryTypeTabId, number> {
  const counts: Record<LibraryTypeTabId, number> = {
    image: 0,
    video: 0,
    tts: 0,
    music: 0,
  };
  for (const job of jobs) {
    if (job.status !== 'processing') continue;
    counts[jobTypeToLibraryTab(job.type)]++;
  }
  return counts;
}

export function countProcessingByLibraryTab(): Record<LibraryTypeTabId, number> {
  return buildTabCounts(loadRaw());
}

/** Stable snapshot for useSyncExternalStore — same reference until store notifies. */
export function getPendingJobsSnapshot(filter: MineFilterLike): LibraryPendingJob[] {
  loadRaw();
  const cached = filteredSnapshots.get(filter);
  if (cached) return cached;
  const next = cachedRawJobs.filter((j) => pendingMatchesFilter(j, filter));
  filteredSnapshots.set(filter, next);
  return next;
}

/** Stable snapshot for useSyncExternalStore — same reference until store notifies. */
export function getPendingTabCountsSnapshot(): Record<LibraryTypeTabId, number> {
  loadRaw();
  if (!cachedTabCounts) cachedTabCounts = buildTabCounts(cachedRawJobs);
  return cachedTabCounts;
}

export const EMPTY_PENDING_JOBS: LibraryPendingJob[] = [];
export const EMPTY_PENDING_TAB_COUNTS = EMPTY_TAB_COUNTS;

export function libraryRouteForJobType(type: JobType): string {
  const tab =
    type === 'music' ? 'music' : type === 'tts' ? 'tts' : type === 'video' ? 'video' : 'image';
  return `/library?type=${tab}`;
}

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
