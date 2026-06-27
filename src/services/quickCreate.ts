import { getGommoClient, loadAuth } from './authStore';
import { isBackendLoggedIn } from './session';
import {
  analyzeModel,
  buildJobPayload,
  modelSlug,
  parseModelsList,
  type JobSelections,
  type ModelSchema,
} from './modelSchema';
import { createJobAndPoll } from './polling';
import {
  createStudioJob,
  fetchModels as fetchModelsBackend,
  pollJobUntilDone,
  uploadMediaBackend,
} from './backendApi';
import type { GommoModel, JobType } from './api';

/** Có thể tạo job (đăng nhập Gommo token hoặc backend). */
export function canQuickCreate(): boolean {
  return Boolean(loadAuth()?.access_token?.trim()) || isBackendLoggedIn();
}

/** Tải danh sách model theo loại — ưu tiên Gommo client, fallback backend. */
export async function loadQuickModels(type: JobType): Promise<GommoModel[]> {
  const client = loadAuth() ? getGommoClient() : null;
  if (client) return parseModelsList(await client.fetchModels(type));
  if (isBackendLoggedIn()) return parseModelsList(await fetchModelsBackend(type));
  return [];
}

export function buildQuickSchema(model: GommoModel, type: JobType): ModelSchema {
  return analyzeModel(model, type);
}

export async function uploadQuickImage(file: File): Promise<string | null> {
  const client = loadAuth() ? getGommoClient() : null;
  if (client) {
    const { url } = await client.uploadImage(file);
    return url;
  }
  if (isBackendLoggedIn()) {
    const { url } = await uploadMediaBackend('image', file);
    return url;
  }
  return null;
}

export interface QuickGenerateArgs {
  type: JobType;
  model: GommoModel;
  selections: JobSelections;
  onProgress?: (msg: string) => void;
  signal?: AbortSignal;
}

/** Tạo job + poll tới khi xong, trả về URL kết quả. */
export async function quickGenerate({
  type,
  model,
  selections,
  onProgress,
  signal,
}: QuickGenerateArgs): Promise<string> {
  const client = loadAuth() ? getGommoClient() : null;
  const auth = loadAuth();
  const slug = modelSlug(model);
  const { payload } = buildJobPayload(model, type, selections, {
    domain: auth?.domain,
    projectId: auth?.projectId,
  });

  if (client) {
    const { pollResult, resultUrl } = await createJobAndPoll(
      client,
      type,
      slug,
      payload,
      (p) => {
        if ('phase' in p && p.phase === 'creating') {
          onProgress?.('Đang tạo job…');
          return;
        }
        const prog = p as { status?: string; phase?: string };
        onProgress?.(`Đang xử lý… ${prog.status || prog.phase || ''}`.trim());
      },
      signal,
    );
    if (resultUrl) return resultUrl;
    throw new Error(pollResult?.error || 'Job thất bại');
  }

  if (isBackendLoggedIn()) {
    onProgress?.('Đang tạo job…');
    const created = await createStudioJob({ type, model_id: slug, payload });
    const job = await pollJobUntilDone(
      created.job.id,
      (j) => onProgress?.(`Trạng thái: ${j.status}`),
      signal,
    );
    if (job.status === 'success' && job.result_url) return job.result_url;
    throw new Error(job.error || 'Job thất bại');
  }

  throw new Error('Chưa đăng nhập — không thể tạo job.');
}
