import type { GommoModel, JobType } from '../services/api';
import type { TtsModelOption } from '../services/audioCatalog';
import {
  ELEVENLABS_MODEL_CATALOG,
  MINIMAX_MODEL_CATALOG,
  OPENVOICE_MODEL_CATALOG,
} from '../services/audioCatalog';
import type { VoiceProvider } from '../services/audioVoices';
import { modelSlug } from '../services/modelSchema';

function modelDurations(model: GommoModel): unknown[] {
  return model.durations ?? (model as { duration?: unknown[] }).duration ?? [];
}

function hasVideoReferenceConfig(model: GommoModel): boolean {
  const ref = (model.configs as { reference?: { constraints?: { video?: unknown } } })?.reference;
  return Boolean(ref?.constraints?.video);
}

/** Suy luận studio job type thật — upstream hay liệt kê model video trong catalog image. */
export function inferStudioJobType(model: GommoModel, declared: JobType): JobType {
  if (declared === 'music') return 'music';
  if (declared === 'tts') return 'tts';

  const slug = modelSlug(model).toLowerCase();
  const name = String(model.name || '').toLowerCase();
  const desc = String(model.description || '').toLowerCase();
  const hay = `${slug} ${name} ${desc}`;

  const videoSignals =
    modelDurations(model).length > 0 ||
    Boolean(model.withMotion || model.withEdit) ||
    hasVideoReferenceConfig(model) ||
    /\b(video|veo|sora|runway|lipsync)\b/.test(hay) ||
    /(?:^|[_-])(edit|omni_edit|video_edit)(?:$|[_-])/.test(slug);

  if (videoSignals) {
    if (declared.startsWith('video') || declared === 'avatar-lipsync') return declared;
    return 'video';
  }

  if (declared === 'image-upscale' || declared === 'remove-bg') return declared;
  if (declared.startsWith('image')) return 'image';
  return declared;
}

export function ttsProviderForGommoModel(m: GommoModel): VoiceProvider {
  const server = String(m.server || '').toLowerCase();
  const slug = modelSlug(m).toLowerCase();
  const name = String(m.name || '').toLowerCase();
  const hay = `${server} ${slug} ${name}`;
  if (server === 'omnivoice_local' || /omni|openvoice/.test(hay)) return 'omnivoice_local';
  if (/minimax/.test(hay)) return 'minimaxai_cheap';
  return 'elevenlabs_cheap';
}

const TTS_PROVIDER_CATALOGS: Array<[VoiceProvider, TtsModelOption[]]> = [
  ['omnivoice_local', OPENVOICE_MODEL_CATALOG],
  ['minimaxai_cheap', MINIMAX_MODEL_CATALOG],
  ['elevenlabs_cheap', ELEVENLABS_MODEL_CATALOG],
];

/** Suy provider từ ?model= engine id (omnivoice_v1, eleven_v3, …). */
export function ttsProviderForEngineModelId(query: string): VoiceProvider | null {
  const slug = query.trim().toLowerCase();
  if (!slug) return null;

  for (const [provider, catalog] of TTS_PROVIDER_CATALOGS) {
    for (const entry of catalog) {
      if (entry.modelId.toLowerCase() === slug) return provider;
      if (entry.matchIds.some((id) => id.toLowerCase() === slug)) return provider;
    }
  }

  if (/omni|openvoice|vmedia_fast/.test(slug)) return 'omnivoice_local';
  if (/minimax|speech-0/.test(slug)) return 'minimaxai_cheap';
  if (/eleven|autoai_speech/.test(slug)) return 'elevenlabs_cheap';

  return null;
}

export function matchTtsEngineModel(
  gommoSlug: string,
  options: Array<TtsModelOption & { resolvedId: string }>,
): (TtsModelOption & { resolvedId: string }) | null {
  const slug = gommoSlug.trim().toLowerCase();
  if (!slug) return null;
  for (const opt of options) {
    if (opt.resolvedId.toLowerCase() === slug || opt.modelId.toLowerCase() === slug) return opt;
    if (opt.matchIds.some((id) => id.toLowerCase() === slug)) return opt;
  }
  return null;
}

export function isVideoEditModel(m: GommoModel): boolean {
  if ((m as { withEdit?: boolean }).withEdit) return true;
  const slug = modelSlug(m).toLowerCase();
  const hay = `${slug} ${String(m.name || '').toLowerCase()} ${String(m.description || '').toLowerCase()}`;
  if (/(?:^|[_-])(edit|omni_edit|video_edit)(?:$|[_-])/.test(slug)) return true;
  if (/\bedit video\b|\bvideo edit\b/.test(hay)) return true;
  if (hasVideoReferenceConfig(m) && /edit|omni/.test(hay)) return true;
  return false;
}

export function isVideoMotionModel(m: GommoModel): boolean {
  return Boolean((m as { withMotion?: boolean }).withMotion);
}

export type StudioVideoMode = 'create' | 'motion' | 'edit';

export function videoModeForModel(m: GommoModel): StudioVideoMode {
  if (isVideoEditModel(m)) return 'edit';
  if (isVideoMotionModel(m)) return 'motion';
  return 'create';
}

export function buildStudioModelHref(
  route: string,
  slug: string,
  model: GommoModel,
  jobType: JobType,
): string {
  const params = new URLSearchParams({ model: slug });
  const studioType = inferStudioJobType(model, jobType);
  if (studioType === 'video') {
    const mode = videoModeForModel(model);
    if (mode !== 'create') params.set('videoMode', mode);
  }
  return `${route}?${params.toString()}`;
}

/** Khi model query không thuộc list hiện tại — đoán route composer đúng từ slug. */
export function composerRedirectForModelQuery(
  modelQuery: string,
  currentPath: string,
): string | null {
  const slug = modelQuery.trim().toLowerCase();
  if (!slug) return null;

  if (currentPath !== '/video') {
    const looksVideo =
      /(?:^|[_-])(veo|sora|runway|lipsync|motion|kling)(?:$|[_-])/.test(slug) ||
      /(?:^|[_-])(edit|omni_edit|video_edit)(?:$|[_-])/.test(slug) ||
      slug.includes('video');
    if (looksVideo) {
      const params = new URLSearchParams({ model: modelQuery.trim() });
      if (/(?:^|[_-])(edit|omni_edit|video_edit)(?:$|[_-])/.test(slug)) {
        params.set('videoMode', 'edit');
      }
      return `/video?${params.toString()}`;
    }
  }

  if (currentPath !== '/music' && /(?:^|[_-])(suno|music|udio)(?:$|[_-])/.test(slug)) {
    return `/music?model=${encodeURIComponent(modelQuery.trim())}`;
  }

  return null;
}
