import type { JobType } from '../services/api';
import { getGommoClient, isLoggedIn } from '../services/authStore';
import { prefetchModelsCache } from '../services/modelSchema';
import { STUDIO_PREFETCH_TYPES } from './studioRoutes';

/** Warm in-memory model cache for studio composers. */
export function prefetchStudioModels(types: JobType[] = STUDIO_PREFETCH_TYPES): void {
  if (!isLoggedIn()) return;
  try {
    const client = getGommoClient();
    prefetchModelsCache(types, (type: JobType) => client.fetchModels(type));
  } catch {
    /* auth not ready */
  }
}
