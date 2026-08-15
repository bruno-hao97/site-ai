import { useCallback, useEffect, useState } from 'react';
import {
  listPendingJobs,
  pendingMatchesFilter,
  countProcessingByLibraryTab,
  type LibraryPendingJob,
  type LibraryTypeTabId,
  type MineFilterLike,
} from '../services/pendingJobsStore';

export function usePendingJobs(filter: MineFilterLike): LibraryPendingJob[] {
  const [jobs, setJobs] = useState<LibraryPendingJob[]>(() =>
    listPendingJobs().filter((j) => pendingMatchesFilter(j, filter)),
  );

  const refresh = useCallback(() => {
    setJobs(listPendingJobs().filter((j) => pendingMatchesFilter(j, filter)));
  }, [filter]);

  useEffect(() => {
    refresh();
    const onUpdate = () => refresh();
    document.addEventListener('pending:updated', onUpdate);
    return () => document.removeEventListener('pending:updated', onUpdate);
  }, [refresh]);

  return jobs;
}

export function usePendingTabCounts(): Record<LibraryTypeTabId, number> {
  const [counts, setCounts] = useState(() => countProcessingByLibraryTab());

  useEffect(() => {
    const refresh = () => setCounts(countProcessingByLibraryTab());
    refresh();
    document.addEventListener('pending:updated', refresh);
    return () => document.removeEventListener('pending:updated', refresh);
  }, []);

  return counts;
}
