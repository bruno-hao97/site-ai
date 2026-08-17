import type { GommoEnvelope, GommoModel, JobType } from './api';
import { getGommoClient, isLoggedIn } from './authStore';
import { gommoDeviceFields } from './gommoDevice';
import {
  getCachedModels,
  isModelAvailable,
  mergeModelsBySlug,
  parseModelsList,
  setCachedModels,
} from './modelSchema';
import { DEFAULT_DOMAIN } from './settingsStore';
import { modelOnSale } from './modelCatalogDisplay';

export interface CatalogModel {
  jobType: JobType;
  model: GommoModel;
}

export const CATALOG_JOB_TYPES: JobType[] = [
  'image',
  'video',
  'tts',
  'music',
  'avatar-lipsync',
  'image-upscale',
  'remove-bg',
  'video-upscale',
  'video-vfx',
];

export interface ModelFilterGroup {
  id: string;
  label: string;
  types: JobType[];
}

export const MODEL_FILTER_GROUPS: ModelFilterGroup[] = [
  { id: 'all', label: 'Tất cả', types: [] },
  { id: 'video', label: 'Video', types: ['video', 'video-upscale', 'video-vfx'] },
  { id: 'image', label: 'Hình ảnh', types: ['image', 'image-upscale', 'remove-bg'] },
  { id: 'tts', label: 'Audio / TTS', types: ['tts'] },
  { id: 'music', label: 'Nhạc', types: ['music'] },
  { id: 'avatar-lipsync', label: 'Avatar LipSync', types: ['avatar-lipsync'] },
];

async function parseEnvelope(res: Response): Promise<GommoEnvelope> {
  const text = await res.text();
  try {
    return JSON.parse(text) as GommoEnvelope;
  } catch {
    return { _rawText: text, message: text || `HTTP ${res.status}` };
  }
}

/** Catalog công khai — POST /ai/models chỉ cần domain (không Bearer). */
export async function fetchAnonymousModels(type: JobType): Promise<GommoModel[]> {
  const domain = DEFAULT_DOMAIN;
  const q = `type=${encodeURIComponent(type)}&domain=${encodeURIComponent(domain)}`;
  const body = new URLSearchParams({
    type,
    domain,
    ...gommoDeviceFields(),
  }).toString();

  const res = await fetch(`/ai/models?${q}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const envelope = await parseEnvelope(res);
  if (!res.ok || envelope.success === false) {
    throw new Error(envelope.message || `Không tải được model (${type})`);
  }
  return parseModelsList(envelope);
}

async function fetchModelsForType(type: JobType): Promise<GommoModel[]> {
  const cached = getCachedModels(type);
  if (cached?.length) return cached;

  const lists: GommoModel[][] = [];

  try {
    lists.push(await fetchAnonymousModels(type));
  } catch {
    /* anonymous fail — thử auth bên dưới */
  }

  if (isLoggedIn()) {
    try {
      const client = getGommoClient();
      lists.push(parseModelsList(await client.fetchModels(type)));
    } catch {
      /* auth fail */
    }
  }

  const merged = mergeModelsBySlug(lists);
  if (merged.length) setCachedModels(type, merged);
  return merged;
}

let catalogCache: CatalogModel[] | null = null;
let catalogPromise: Promise<CatalogModel[]> | null = null;

export async function fetchModelCatalog(
  types: JobType[] = CATALOG_JOB_TYPES,
  { force = false }: { force?: boolean } = {},
): Promise<CatalogModel[]> {
  if (!force && catalogCache && catalogCache.length > 0) return catalogCache;
  if (!force && catalogPromise) return catalogPromise;

  catalogPromise = Promise.allSettled(types.map((jobType) => fetchModelsForType(jobType))).then(
    (results) => {
      const entries: CatalogModel[] = [];
      results.forEach((result, index) => {
        if (result.status !== 'fulfilled') return;
        const jobType = types[index]!;
        for (const model of result.value) {
          entries.push({ jobType, model });
        }
      });
      catalogCache = entries;
      return entries;
    },
  );

  try {
    return await catalogPromise;
  } finally {
    catalogPromise = null;
  }
}

export function clearModelCatalogCache(): void {
  catalogCache = null;
  catalogPromise = null;
}

export function catalogAvailableModels(catalog: CatalogModel[]): CatalogModel[] {
  return catalog.filter((entry) => isModelAvailable(entry.model));
}

export function catalogByJobTypes(catalog: CatalogModel[], types: JobType[]): CatalogModel[] {
  if (!types.length) return catalog;
  const set = new Set(types);
  return catalog.filter((entry) => set.has(entry.jobType));
}

export function catalogOnSale(catalog: CatalogModel[]): CatalogModel[] {
  return catalog.filter((entry) => modelOnSale(entry.model));
}
