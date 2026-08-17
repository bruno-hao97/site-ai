import { getGommoClient, loadAuth } from './authStore';
import {
  analyzeModel,
  parseModelsList,
  type ModelSchema,
} from './modelSchema';
import type { GommoModel, JobType } from './api';
import { runQuickJobBackground as runQuickJobBackgroundImpl } from './pendingJobRunner';

/** Có thể tạo job khi đã đăng nhập Gommo. */
export function canQuickCreate(): boolean {
  return Boolean(loadAuth()?.access_token?.trim());
}

export function isMotionModel(m: GommoModel): boolean {
  return Boolean(m.withMotion);
}

export function isEditModel(m: GommoModel): boolean {
  return Boolean(m.withEdit);
}

/** Quickstart video: cùng bộ model create thường như Studio (không Motion/Edit). */
export function filterQuickCreateModels(type: JobType, models: GommoModel[]): GommoModel[] {
  if (type !== 'video') return models;
  const hasMotion = models.some(isMotionModel);
  const hasEdit = models.some(isEditModel);
  if (!hasMotion && !hasEdit) return models;
  return models.filter((m) => !isMotionModel(m) && !isEditModel(m));
}

export async function loadQuickModels(type: JobType): Promise<GommoModel[]> {
  if (!loadAuth()) return [];
  const list = parseModelsList(await getGommoClient().fetchModels(type));
  return filterQuickCreateModels(type, list);
}

export function buildQuickSchema(model: GommoModel, type: JobType): ModelSchema {
  return analyzeModel(model, type);
}

export async function uploadQuickImage(file: File): Promise<string | null> {
  if (!loadAuth()) return null;
  const { url } = await getGommoClient().uploadImage(file);
  return url;
}

export async function uploadQuickVideo(file: File): Promise<string | null> {
  if (!loadAuth()) return null;
  const { url } = await getGommoClient().uploadVideo(file);
  return url;
}

/** Tải ảnh hoặc video tùy MIME — dùng cho quick bar khi mode video. */
export async function uploadQuickMedia(file: File): Promise<string | null> {
  if (!loadAuth()) return null;
  const client = getGommoClient();
  const { url } = file.type.startsWith('video/')
    ? await client.uploadVideo(file)
    : await client.uploadImage(file);
  return url;
}

export { runQuickJobBackgroundImpl as runQuickJobBackground };
