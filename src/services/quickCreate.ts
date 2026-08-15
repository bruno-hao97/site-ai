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

export async function loadQuickModels(type: JobType): Promise<GommoModel[]> {
  if (!loadAuth()) return [];
  return parseModelsList(await getGommoClient().fetchModels(type));
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
