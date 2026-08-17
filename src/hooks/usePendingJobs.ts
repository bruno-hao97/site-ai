import { useSyncExternalStore } from 'react';
import {
  getPendingJobsSnapshot,
  getPendingTabCountsSnapshot,
  subscribePendingStore,
  EMPTY_PENDING_JOBS,
  EMPTY_PENDING_TAB_COUNTS,
  type LibraryPendingJob,
  type LibraryTypeTabId,
  type MineFilterLike,
} from '../services/pendingJobsStore';

export function usePendingJobs(filter: MineFilterLike): LibraryPendingJob[] {
  return useSyncExternalStore(
    subscribePendingStore,
    () => getPendingJobsSnapshot(filter),
    () => EMPTY_PENDING_JOBS,
  );
}

export function usePendingTabCounts(): Record<LibraryTypeTabId, number> {
  return useSyncExternalStore(
    subscribePendingStore,
    () => getPendingTabCountsSnapshot(),
    () => EMPTY_PENDING_TAB_COUNTS,
  );
}
