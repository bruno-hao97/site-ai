import type { GommoModel, JobType } from './api';
import { getGommoClient, loadAuth } from './authStore';
import { isBackendLoggedIn } from './session';
import { createJobAndPoll, type PollProgress } from './polling';
import {
  createStudioJob,
  fetchModels as fetchModelsBackend,
  pollJobUntilDone,
} from './backendApi';
import {
  analyzeModel,
  buildJobPayload,
  defaultSelections,
  isModelAvailable,
  modelSlug,
  parseModelsList,
  type JobSelections,
} from './modelSchema';

const modelsCache = new Map<JobType, GommoModel[]>();

/** Lấy danh sách model cho 1 loại job, theo phiên đăng nhập (Gommo token hoặc backend JWT). */
export async function fetchModelsForType(type: JobType): Promise<GommoModel[]> {
  const cached = modelsCache.get(type);
  if (cached) return cached;

  let models: GommoModel[] = [];
  const auth = loadAuth();
  if (auth?.access_token) {
    const env = await getGommoClient().fetchModels(type);
    models = parseModelsList(env);
  } else if (isBackendLoggedIn()) {
    models = (await fetchModelsBackend(type)) as unknown as GommoModel[];
  }
  modelsCache.set(type, models);
  return models;
}

export function pickDefaultModel(models: GommoModel[]): GommoModel | null {
  return models.find((m) => isModelAvailable(m)) ?? models[0] ?? null;
}

export interface RunNodeInput {
  type: JobType;
  modelId: string;
  selections: JobSelections;
  onStatus?: (s: string) => void;
  signal?: AbortSignal;
}

/** Chạy 1 job (tạo + poll) và trả về URL kết quả. Dùng đúng đường dẫn như StudioPage. */
export async function runNodeJob(input: RunNodeInput): Promise<string> {
  const { type, modelId, selections, onStatus, signal } = input;

  const models = await fetchModelsForType(type);
  const model = models.find((m) => modelSlug(m) === modelId);
  if (!model) throw new Error(`Không tìm thấy model "${modelId}" cho ${type}`);

  const auth = loadAuth();
  const schema = analyzeModel(model, type);
  const merged: JobSelections = { ...defaultSelections(schema), ...selections };
  const { payload } = buildJobPayload(model, type, merged, {
    domain: auth?.domain,
    projectId: auth?.projectId,
  });

  if (auth?.access_token) {
    onStatus?.('Đang tạo job…');
    const { pollResult, resultUrl } = await createJobAndPoll(
      getGommoClient(),
      type,
      modelId,
      payload,
      (p) => {
        if ('phase' in p && p.phase === 'creating') {
          onStatus?.('Đang gửi request…');
          return;
        }
        const prog = p as PollProgress;
        onStatus?.(`Poll #${prog.attempt}: ${prog.status || prog.phase}`);
      },
      signal,
    );
    if (resultUrl) return resultUrl;
    throw new Error(pollResult?.error || 'Job thất bại');
  }

  if (isBackendLoggedIn()) {
    onStatus?.('Đang tạo job…');
    const created = await createStudioJob({ type, model_id: modelId, payload });
    const job = await pollJobUntilDone(
      created.job.id,
      (j) => onStatus?.(`Trạng thái: ${j.status}`),
      signal,
    );
    if (job.status === 'success' && job.result_url) return job.result_url;
    throw new Error(job.error || 'Job thất bại');
  }

  throw new Error('Chưa đăng nhập');
}
