import { getGommoClient, loadAuth, notifyCreditsUpdated } from './authStore';
import { jobTypeToHistoryType } from '../constants/studioTypes';
import {
  isJobAcceptedPendingError,
  requireJobResultUrl,
} from './jobInfraErrors';
import { buildJobPayload, modelSlug, pollMediaForJobType } from './modelSchema';
import type { GommoModel, JobType } from './api';
import type { JobSelections } from './modelSchema';
import { createJobAndPoll, startPolling, type PollProgress } from './polling';
import { buildProjectSnapshot, tryAutoAssign } from './projectStore';
import {
  bumpPendingProgress,
  markPendingFailed,
  removePendingJob,
  patchPendingJob,
  listPendingJobs,
  type LibraryPendingJob,
} from './pendingJobsStore';

const activeResumes = new Set<string>();
const activeCreates = new Set<string>();

export function notifyPendingLibraryRefresh(): void {
  document.dispatchEvent(new CustomEvent('history:updated'));
}

function schedulePendingRemoval(pendingId: string, delayMs = 45_000): void {
  window.setTimeout(() => {
    removePendingJob(pendingId);
    notifyPendingLibraryRefresh();
  }, delayMs);
}

export function finishPendingJobSuccess(
  pendingId: string,
  type: JobType,
  displayPrompt: string,
  url: string,
  coverUrl?: string | null,
  providerJobId?: string,
): void {
  const itemId = providerJobId?.trim() || url.trim();
  if (itemId) {
    tryAutoAssign(
      buildProjectSnapshot({
        itemId,
        type: jobTypeToHistoryType(type),
        prompt: displayPrompt,
        resultUrl: url,
        coverUrl,
      }),
    );
  }
  removePendingJob(pendingId);
  notifyCreditsUpdated();
  notifyPendingLibraryRefresh();
}

function handlePendingPollOutcome(
  pendingId: string,
  type: JobType,
  displayPrompt: string,
  resultUrl: string | null | undefined,
  acceptedOnProvider: boolean,
  providerJobId: string | undefined,
  pollResult: Parameters<typeof requireJobResultUrl>[0]['pollResult'],
): void {
  let url: string | null = null;
  try {
    url = requireJobResultUrl({
      resultUrl,
      acceptedOnProvider,
      providerJobId,
      pollResult,
      failMessage: 'Job thất bại',
    });
  } catch (err) {
    if (isJobAcceptedPendingError(err)) {
      bumpPendingProgress(pendingId, 40);
      schedulePendingRemoval(pendingId);
      return;
    }
    markPendingFailed(pendingId);
    return;
  }

  finishPendingJobSuccess(pendingId, type, displayPrompt, url, undefined, providerJobId);
}

export async function runCreateAndPollPendingJob(args: {
  pendingId: string;
  type: JobType;
  modelSlug: string;
  payload: Record<string, unknown>;
  displayPrompt: string;
  signal?: AbortSignal;
}): Promise<void> {
  const { pendingId, type, modelSlug, payload, displayPrompt, signal } = args;
  if (activeCreates.has(pendingId)) return;
  activeCreates.add(pendingId);

  try {
    const auth = loadAuth();
    if (!auth) {
      markPendingFailed(pendingId);
      return;
    }

    const client = getGommoClient();
    const { pollResult, resultUrl, acceptedOnProvider, providerJobId } = await createJobAndPoll(
      client,
      type,
      modelSlug,
      payload,
      (p) => {
        if ('phase' in p && p.phase === 'creating') {
          bumpPendingProgress(pendingId, 10);
          return;
        }
        const prog = p as PollProgress;
        bumpPendingProgress(pendingId, 12 + prog.attempt * 3);
      },
      signal,
      (id) => patchPendingJob(pendingId, { providerJobId: id }),
    );

    handlePendingPollOutcome(
      pendingId,
      type,
      displayPrompt,
      resultUrl,
      acceptedOnProvider,
      providerJobId,
      pollResult,
    );
  } catch (err) {
    if (isJobAcceptedPendingError(err)) {
      bumpPendingProgress(pendingId, 40);
      schedulePendingRemoval(pendingId);
      return;
    }
    markPendingFailed(pendingId);
  } finally {
    activeCreates.delete(pendingId);
  }
}

export async function resumePendingJobPoll(job: LibraryPendingJob): Promise<void> {
  const providerJobId = job.providerJobId?.trim();
  if (!providerJobId || job.status !== 'processing') return;

  if (activeResumes.has(job.id) || activeCreates.has(job.id)) return;
  activeResumes.add(job.id);

  try {
    if (!loadAuth()) return;

    const media = pollMediaForJobType(job.type);
    if (!media) return;

    const client = getGommoClient();
    const pollResult = await startPolling(client, providerJobId, media, {
      onProgress: (p) => bumpPendingProgress(job.id, 12 + p.attempt * 3),
    });

    if (pollResult.success && pollResult.resultUrl) {
      finishPendingJobSuccess(
        job.id,
        job.type,
        job.prompt,
        pollResult.resultUrl,
        pollResult.coverUrl,
        providerJobId,
      );
      return;
    }

    if (pollResult.acceptedPending || pollResult.timeout || pollResult.infraError) {
      bumpPendingProgress(job.id, 40);
      schedulePendingRemoval(job.id);
      notifyPendingLibraryRefresh();
      return;
    }

    markPendingFailed(job.id);
    notifyPendingLibraryRefresh();
  } finally {
    activeResumes.delete(job.id);
  }
}

export function resumeAllPendingJobs(): void {
  if (!loadAuth()) return;

  for (const job of listPendingJobs()) {
    if (job.status !== 'processing') continue;
    if (!job.providerJobId?.trim()) continue;
    void resumePendingJobPoll(job);
  }
}

/** Quickstart helper — build payload từ model + selections. */
export function runQuickJobBackground(args: {
  pendingId: string;
  type: JobType;
  model: GommoModel;
  selections: JobSelections;
  displayPrompt: string;
}): void {
  const auth = loadAuth();
  if (!auth) {
    markPendingFailed(args.pendingId);
    return;
  }

  const { payload } = buildJobPayload(args.model, args.type, args.selections, {
    domain: auth.domain,
    projectId: auth.projectId,
  });

  void runCreateAndPollPendingJob({
    pendingId: args.pendingId,
    type: args.type,
    modelSlug: modelSlug(args.model),
    payload,
    displayPrompt: args.displayPrompt,
  });
}
