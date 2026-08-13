import type { GommoModel, JobType } from './api';
import { analyzeModel, isModelAvailable, modelSlug } from './modelSchema';

const SERVER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  grokai: 'Grok AI',
  google_veo: 'Google',
  midjourneyai: 'Midjourney AI',
  seedream_ai: 'Seedream',
  klingai: 'Kling AI',
  autoai: 'Auto AI',
  alibabaai: 'Alibaba AI',
  dreamina_ai: 'Dreamina',
};

export function modelLabel(model: GommoModel): string {
  return model.name || modelSlug(model) || 'Model';
}

export function modelProvider(m: GommoModel): string {
  const server = (m.server || '').trim().toLowerCase();
  if (server && SERVER_LABELS[server]) return SERVER_LABELS[server];

  const raw = m as unknown as Record<string, unknown>;
  for (const key of ['group', 'company', 'provider', 'brand', 'vendor']) {
    const v = raw[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  const n = modelLabel(m).toLowerCase();
  if (/\bgpt\b|dall-?e|openai|sora/.test(n)) return 'OpenAI';
  if (/gemini|nano\s*banana|imagen|veo|google/.test(n)) return 'Google';
  if (/grok|xai/.test(n)) return 'Grok AI';
  if (/kling|colors/.test(n)) return 'Kling AI';
  if (/seedream|seedance/.test(n)) return 'Seedream';
  if (/dreamina|capcut/.test(n)) return 'Dreamina';
  if (/qwen|wan|alibaba|tongyi|z-?image/.test(n)) return 'Alibaba AI';
  if (/midjourney|\bmj\b/.test(n)) return 'Midjourney AI';
  if (/upscale|auto\s*ai/.test(n)) return 'Auto AI';
  if (/flux|black\s*forest/.test(n)) return 'Black Forest Labs';
  if (/runway|gen-?\d/.test(n)) return 'Runway';
  if (/luma|dream\s*machine/.test(n)) return 'Luma';
  if (/stable|sdxl|stability/.test(n)) return 'Stability AI';
  if (/minimax|hailuo/.test(n)) return 'MiniMax';
  if (/elevenlabs|eleven\s*labs/.test(n)) return 'ElevenLabs';
  if (/suno/.test(n)) return 'Suno';
  return 'Khác';
}

export function modelPriceLabel(m: GommoModel): string {
  const values: number[] = [];
  if (Array.isArray(m.prices)) {
    for (const p of m.prices) {
      if (typeof p?.price === 'number' && p.price > 0) values.push(p.price);
    }
  }
  if (values.length === 0 && typeof m.price === 'number' && m.price > 0) values.push(m.price);
  if (values.length === 0) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const fmt = (n: number) => n.toLocaleString('vi-VN');
  return min === max ? fmt(min) : `${fmt(min)}-${fmt(max)}`;
}

export function modelOnSale(m: GommoModel): boolean {
  const raw = m as unknown as Record<string, unknown>;
  for (const key of ['sale', 'on_sale', 'discount', 'is_sale']) {
    const v = raw[key];
    if (typeof v === 'boolean' && v) return true;
    if (typeof v === 'number' && v > 0) return true;
  }
  return false;
}

export function modelSalePercent(m: GommoModel): number | null {
  const raw = m as unknown as Record<string, unknown>;
  for (const key of ['sale', 'discount']) {
    const v = raw[key];
    if (typeof v === 'number' && v > 0) return v;
  }
  return null;
}

export function buildNewModelChecker(models: GommoModel[]): (m: GommoModel) => boolean {
  let newest = 0;
  for (const m of models) {
    if (typeof m.created_time === 'number' && m.created_time > newest) newest = m.created_time;
  }
  const threshold = newest - 30 * 24 * 60 * 60;
  return (m) =>
    newest > 0 && typeof m.created_time === 'number' && m.created_time >= threshold;
}

export function modelCapabilityTags(model: GommoModel, jobType: JobType): string[] {
  const schema = analyzeModel(model, jobType);
  const tags: string[] = [];

  if (jobType === 'video' || jobType === 'avatar-lipsync') {
    if (schema.fields.prompt) tags.push('Text2Video');
    if (schema.fields.startFrame || schema.flags.startImage) tags.push('Img2Video');
    if (schema.flags.withReference) tags.push('Reference');
    if (schema.flags.withMotion) tags.push('Motion');
    if (schema.flags.withMultiShots) tags.push('Multi-shot');
    if (schema.flags.withEdit) tags.push('Edit');
  } else if (jobType === 'image' || jobType === 'image-upscale' || jobType === 'remove-bg') {
    if (schema.fields.prompt) tags.push('Text2Image');
    if (schema.flags.withEdit) tags.push('Edit');
    if (schema.flags.withReference) tags.push('Reference');
    if (jobType === 'image-upscale') tags.push('Upscale');
    if (jobType === 'remove-bg') tags.push('Remove BG');
  } else if (jobType === 'tts') {
    tags.push('TTS');
  } else if (jobType === 'music') {
    tags.push('Music');
  } else if (jobType === 'video-upscale') {
    tags.push('Upscale');
  } else if (jobType === 'video-vfx') {
    tags.push('VFX');
  }

  return tags.slice(0, 4);
}

export function filterAvailableCatalog<T extends GommoModel>(models: T[]): T[] {
  return models.filter(isModelAvailable);
}

export function topModelNames(models: GommoModel[], limit = 3): string {
  return models
    .slice(0, limit)
    .map(modelLabel)
    .join(' · ');
}
