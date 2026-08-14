import type { JobType } from '../services/api';

export const STUDIO_COMPOSER_PATHS: Record<string, JobType> = {
  '/image': 'image',
  '/video': 'video',
  '/music': 'music',
};

export const STUDIO_PREFETCH_TYPES: JobType[] = ['image', 'video', 'music'];

export function studioTypeFromPath(pathname: string): JobType | null {
  return STUDIO_COMPOSER_PATHS[pathname] ?? null;
}
