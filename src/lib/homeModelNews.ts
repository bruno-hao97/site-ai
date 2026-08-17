import type { JobType } from '../services/api';
import type { CatalogModel } from '../services/modelCatalog';
import { catalogAvailableModels } from '../services/modelCatalog';
import {
  modelCapabilityTags,
  modelCreatedUnix,
  modelLabel,
  modelPriceLabel,
  modelProvider,
} from '../services/modelCatalogDisplay';
import { modelSlug } from '../services/modelSchema';
import { studioRouteForType, jobTypeLabel } from '../constants/studioTypes';
import type { TranslationKey } from '../i18n/types';
import type { ProductNewsKind } from './homeProductNews';
import { thumbFromContentHtml } from './homeNewsThumb';
import { buildStudioModelHref, inferStudioJobType } from './studioDeepLink';

export type HomeNewsAccent =
  | ProductNewsKind
  | 'video'
  | 'image'
  | 'audio'
  | 'music';

export type HomeModelCategory = 'image' | 'video' | 'audio' | 'music';

export interface HomeNewsCardView {
  id: string;
  source: 'model' | 'static';
  kind: ProductNewsKind | 'model-new';
  accent: HomeNewsAccent;
  href: string;
  title: string;
  desc: string;
  provider?: string;
  price?: string;
  tags?: string[];
  showNewBadge: boolean;
  pinned?: boolean;
  /** Candidate cover — verify bằng probe trước khi render. */
  thumb?: string;
  /** Slug model — lookup thumb từ feed public. */
  modelSlug?: string;
}

/** Tối đa card trên strip Home — 1 hàng 4 cột. */
export const WHATS_NEW_MAX_TOTAL = 4;

/** Mỗi hạng mục lấy 1 model created_at mới nhất. */
export const PER_CATEGORY_MODEL_LIMIT = 1;

const HOME_MODEL_CATEGORIES: { id: HomeModelCategory; types: JobType[] }[] = [
  { id: 'image', types: ['image', 'image-upscale', 'remove-bg'] },
  { id: 'video', types: ['video', 'video-upscale', 'video-vfx', 'avatar-lipsync'] },
  { id: 'audio', types: ['tts'] },
  { id: 'music', types: ['music'] },
];

export function jobTypeToNewsAccent(jobType: JobType): HomeNewsAccent {
  switch (jobType) {
    case 'video':
    case 'avatar-lipsync':
    case 'video-upscale':
    case 'video-vfx':
      return 'video';
    case 'music':
      return 'music';
    case 'tts':
      return 'audio';
    default:
      return 'image';
  }
}

export function catalogModelHref(entry: CatalogModel): string {
  const slug = modelSlug(entry.model);
  const studioType = inferStudioJobType(entry.model, entry.jobType);
  const route = studioRouteForType(studioType);
  return buildStudioModelHref(route, slug, entry.model, entry.jobType);
}

function entryHomeCategory(entry: CatalogModel): HomeModelCategory {
  const studioType = inferStudioJobType(entry.model, entry.jobType);
  switch (studioType) {
    case 'music':
      return 'music';
    case 'tts':
      return 'audio';
    case 'video':
    case 'avatar-lipsync':
    case 'video-upscale':
    case 'video-vfx':
      return 'video';
    default:
      return 'image';
  }
}

function dedupeBySlug(entries: CatalogModel[], seen: Set<string>): CatalogModel[] {
  return entries.filter((entry) => {
    const slug = modelSlug(entry.model);
    if (!slug || seen.has(slug)) return false;
    seen.add(slug);
    return true;
  });
}

function pickTopForCategory(
  available: CatalogModel[],
  categoryId: HomeModelCategory,
  seen: Set<string>,
  perCategory: number,
): CatalogModel[] {
  const inCategory = available.filter((entry) => entryHomeCategory(entry) === categoryId);
  if (!inCategory.length) return [];

  const withTimestamp = inCategory
    .filter((entry) => modelCreatedUnix(entry.model) != null)
    .sort(
      (a, b) => modelCreatedUnix(b.model)! - modelCreatedUnix(a.model)!,
    );

  const pool = withTimestamp.length ? withTimestamp : inCategory;

  return dedupeBySlug(pool, seen).slice(0, perCategory);
}

/** Top N model mới nhất theo created_at trong từng hạng mục (image/video/audio/music). */
export function listTopModelsByCategory(
  catalog: CatalogModel[],
  perCategory = PER_CATEGORY_MODEL_LIMIT,
): CatalogModel[] {
  const available = catalogAvailableModels(catalog);
  if (!available.length) return [];

  const seen = new Set<string>();
  const out: CatalogModel[] = [];

  for (const cat of HOME_MODEL_CATEGORIES) {
    out.push(...pickTopForCategory(available, cat.id, seen, perCategory));
  }

  return out.sort(
    (a, b) => (modelCreatedUnix(b.model) ?? 0) - (modelCreatedUnix(a.model) ?? 0),
  );
}

/** @deprecated Dùng listTopModelsByCategory */
export function listNewCatalogEntries(
  catalog: CatalogModel[],
  limit = PER_CATEGORY_MODEL_LIMIT,
): CatalogModel[] {
  return listTopModelsByCategory(catalog, limit);
}

export function catalogEntryToNewsCard(
  entry: CatalogModel,
  t: (key: TranslationKey, vars?: Record<string, string>) => string,
): HomeNewsCardView {
  const { model, jobType } = entry;
  const studioType = inferStudioJobType(model, jobType);
  const provider = modelProvider(model);
  const tags = modelCapabilityTags(model, studioType).slice(0, 3);
  const price = modelPriceLabel(model);
  const desc =
    model.description?.trim() ||
    t('landing.modelCard.fallbackDesc', { jobType: jobTypeLabel(studioType), provider });

  const slug = modelSlug(model);
  const htmlThumb = thumbFromContentHtml(
    (model as { content_html?: string }).content_html,
  );

  return {
    id: `model-${slug}`,
    source: 'model',
    kind: 'model-new',
    accent: jobTypeToNewsAccent(studioType),
    href: catalogModelHref(entry),
    title: modelLabel(model),
    desc,
    provider,
    price: price || undefined,
    tags: tags.length ? tags : undefined,
    showNewBadge: modelCreatedUnix(model) != null,
    modelSlug: slug,
    thumb: htmlThumb || undefined,
  };
}
