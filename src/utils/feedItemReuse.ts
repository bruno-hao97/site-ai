import type { NavigateFunction } from 'react-router-dom';
import type { FeedItem } from '../services/feedApi';
import { feedMediaUrl, feedThumb } from '../services/feedApi';
import { feedModelDisplay } from '../services/feedLibraryMeta';
import type { HistoryEntry } from '../services/historyStore';
import type { JobType } from '../services/api';
import { jobTypeToHistoryType, studioRouteForType } from '../constants/studioTypes';

export type ReuseHistoryState = {
  type: JobType;
  prompt?: string;
  modelSlug?: string;
  meta?: Record<string, string>;
  references?: string[];
};

export function feedItemJobType(item: FeedItem): JobType {
  if (item.type === 'image') return 'image';
  if (item.type === 'music') return 'music';
  if (item.type === 'tts' || item.type === 'audio') return 'tts';
  return 'video';
}

export function feedItemToHistoryEntry(item: FeedItem, jobType: JobType, resultUrl: string): HistoryEntry {
  return {
    id: item.id_base,
    type: jobTypeToHistoryType(jobType),
    resultUrl,
    prompt: item.prompt,
    modelSlug: item.model,
    modelName: feedModelDisplay(item),
    createdAt: (() => {
      if (item.created_time == null) return new Date().toISOString();
      let ts = typeof item.created_time === 'string' ? Number(item.created_time) : item.created_time;
      if (!Number.isFinite(ts) || ts <= 0) return new Date().toISOString();
      if (ts < 1e12) ts *= 1000;
      return new Date(ts).toISOString();
    })(),
    meta: {
      mode: item.mode || '',
      resolution: item.resolution || '',
      ratio: item.ratio || '',
      duration: item.duration || '',
    },
  };
}

export function reuseStateFromFeedItem(
  item: FeedItem,
  opts?: { asType?: JobType; withMediaAsReference?: boolean },
): ReuseHistoryState {
  const jobType = opts?.asType ?? feedItemJobType(item);
  const media = feedMediaUrl(item) || feedThumb(item) || '';
  return {
    type: jobType,
    prompt: item.prompt || item.title || '',
    modelSlug: item.model,
    meta: {
      mode: item.mode || '',
      resolution: item.resolution || '',
      ratio: item.ratio || '',
      duration: item.duration || '',
    },
    references: opts?.withMediaAsReference && media ? [media] : undefined,
  };
}

export function navigateReuseFeedItem(
  navigate: NavigateFunction,
  item: FeedItem,
  opts?: { asType?: JobType; withMediaAsReference?: boolean },
): void {
  const reuseHistory = reuseStateFromFeedItem(item, opts);
  navigate(studioRouteForType(reuseHistory.type), { state: { reuseHistory } });
}

export function navigateReuseHistoryEntry(navigate: NavigateFunction, entry: HistoryEntry): void {
  const t = entry.type as JobType;
  navigate(studioRouteForType(t), {
    state: {
      reuseHistory: {
        type: t,
        prompt: entry.prompt,
        modelSlug: entry.modelSlug,
        meta: entry.meta,
        references: entry.resultUrl ? [entry.resultUrl] : undefined,
      } satisfies ReuseHistoryState,
    },
  });
}
