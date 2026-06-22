import { clearSession, getSessionToken, setSessionBalance } from './session';

export interface BackendUser {
  id: string;
  email: string;
  name: string | null;
  auth_provider?: string;
  [key: string]: unknown;
}

export interface JwtAuthState {
  token: string;
  user: BackendUser;
  balance: number;
}

export class ApiError extends Error {
  status?: number;
  data?: unknown;
  constructor(message: string, opts?: { status?: number; data?: unknown }) {
    super(message);
    this.status = opts?.status;
    this.data = opts?.data;
  }
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getSessionToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, { ...opts, headers });
  const body = await res.json().catch(() => ({}));

  if (!res.ok || body.success === false) {
    // Phiên hết hạn / token không hợp lệ trên request đã xác thực → đăng xuất.
    if (res.status === 401 && token) {
      clearSession();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    throw new ApiError(body.message || `HTTP ${res.status}`, { status: res.status, data: body });
  }

  if (body.data?.balance != null) setSessionBalance(body.data.balance);
  return body.data as T;
}

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
  phone?: string;
  domain?: string;
}

export interface LoginInput {
  email: string;
  password: string;
  domain?: string;
}

export interface LoginTokenInput {
  access_token: string;
  domain?: string;
  project_id?: string;
}

export async function loginWithToken(input: LoginTokenInput): Promise<JwtAuthState> {
  const data = await request<{
    token: string;
    user: BackendUser;
    balance: number;
    upstream?: { domain: string; project_id: string; credits_ai?: number | null };
  }>('/auth/login-token', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return { token: data.token, user: data.user, balance: data.balance };
}

export async function updateUpstreamToken(input: LoginTokenInput): Promise<{
  user: BackendUser;
  balance: number;
  upstream: { domain: string; project_id: string };
}> {
  return request('/auth/upstream-token', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function register(input: RegisterInput): Promise<LoginResult> {
  const data = await request<{
    token: string;
    user: BackendUser;
    balance: number;
    access_token?: string;
    domain?: string;
  }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return {
    token: data.token,
    user: data.user,
    balance: data.balance,
    access_token: data.access_token,
    domain: data.domain,
  };
}

export interface LoginResult extends JwtAuthState {
  /** Có khi đăng nhập thành công qua Gommo → frontend lưu session Gommo. */
  access_token?: string;
  domain?: string;
}

export async function login(input: LoginInput): Promise<LoginResult> {
  const data = await request<{
    token: string;
    user: BackendUser;
    balance: number;
    access_token?: string;
    domain?: string;
  }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return {
    token: data.token,
    user: data.user,
    balance: data.balance,
    access_token: data.access_token,
    domain: data.domain,
  };
}

export async function fetchMe(): Promise<{ user: BackendUser; balance: number }> {
  return request('/auth/me');
}

export async function updateProfile(name: string): Promise<{ user: BackendUser; balance: number }> {
  return request('/auth/me', { method: 'PATCH', body: JSON.stringify({ name }) });
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ message: string }> {
  return request('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}

export async function forgotPassword(email: string): Promise<{ message: string; reset_url?: string }> {
  return request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, password: string): Promise<{ message: string }> {
  return request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}

export async function loginWithGoogle(credential: string): Promise<JwtAuthState> {
  const data = await request<{ token: string; user: BackendUser; balance: number }>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  });
  return { token: data.token, user: data.user, balance: data.balance };
}

export async function fetchGoogleConfig(): Promise<{ clientId: string | null; enabled: boolean }> {
  return request('/auth/google/config');
}

export interface ApiKeyItem {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
}

export async function listApiKeys(): Promise<ApiKeyItem[]> {
  const data = await request<{ keys: ApiKeyItem[] }>('/api-keys');
  return data.keys;
}

export async function createApiKey(name: string): Promise<{ key: ApiKeyItem; raw_key: string }> {
  return request('/api-keys', { method: 'POST', body: JSON.stringify({ name }) });
}

export async function deleteApiKey(id: string): Promise<void> {
  await request(`/api-keys/${id}`, { method: 'DELETE' });
}

export interface GommoModel {
  model?: string;
  slug?: string;
  model_id?: string;
  id?: string;
  name?: string;
  status?: string;
  ratios?: unknown[];
  modes?: unknown[];
  mode?: unknown[];
  resolutions?: unknown[];
  durations?: unknown[];
  duration?: unknown[];
  withSubject?: boolean;
  withReference?: boolean;
  startImage?: boolean;
  startImageAndEnd?: boolean;
  maxSubject?: number;
  configs?: Record<string, unknown>;
  price?: number;
}

export async function fetchModels(type: string): Promise<GommoModel[]> {
  const data = await request<unknown>('/jobs/models?type=' + encodeURIComponent(type));
  if (Array.isArray(data)) return data as GommoModel[];
  if (data && Array.isArray((data as { models?: GommoModel[] }).models)) {
    return (data as { models: GommoModel[] }).models;
  }
  return [];
}

export interface Job {
  id: string;
  type: string;
  model_id: string;
  status: string;
  result_url: string | null;
  cost: number;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateImageJobInput {
  model_id: string;
  prompt: string;
  ratio?: string;
  resolution?: string;
  mode?: string;
  duration?: string;
  template_id?: string;
  references?: { url: string }[];
  images?: { url: string }[];
  subjects?: { url: string }[];
}

export type JobCosts = {
  image: number;
  video: number;
  tts: number;
  music: number;
  'avatar-lipsync': number;
};

export async function fetchJobCosts(): Promise<JobCosts> {
  return request('/jobs/costs');
}

export async function createImageJob(input: CreateImageJobInput): Promise<{ job: Job; balance: number; cost: number }> {
  return request('/jobs/image', { method: 'POST', body: JSON.stringify(input) });
}

export async function createVideoJob(input: CreateImageJobInput): Promise<{ job: Job; balance: number; cost: number }> {
  return request('/jobs/video', { method: 'POST', body: JSON.stringify(input) });
}

export interface CreateStudioJobInput {
  type: string;
  model_id: string;
  payload: Record<string, unknown>;
}

export async function createStudioJob(
  input: CreateStudioJobInput,
): Promise<{ job: Job; balance: number; cost: number }> {
  return request('/jobs/create', { method: 'POST', body: JSON.stringify(input) });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Đọc file thất bại'));
    reader.readAsDataURL(file);
  });
}

export async function uploadMediaBackend(
  kind: 'image' | 'video',
  file: File,
): Promise<{ url: string }> {
  const file_base64 = await fileToBase64(file);
  return request('/jobs/upload', {
    method: 'POST',
    body: JSON.stringify({
      kind,
      file_name: file.name,
      mime: file.type,
      file_base64,
    }),
  });
}

export async function getJob(id: string): Promise<{ job: Job; balance: number }> {
  return request(`/jobs/${id}`);
}

export async function listJobs(): Promise<Job[]> {
  const data = await request<{ jobs: Job[] }>('/jobs');
  return data.jobs;
}

export interface CreditTransaction {
  id: string;
  amount: number;
  type: string;
  job_id: string | null;
  description: string | null;
  created_at: string;
}

export async function listTransactions(): Promise<{ transactions: CreditTransaction[]; balance: number }> {
  return request('/credits/transactions');
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  priceVnd: number;
  popular?: boolean;
  bonusHint?: string;
}

export interface TopupOrder {
  id: string;
  package_id: string;
  credits: number;
  bonus_credits: number;
  total_credits: number;
  amount_vnd: number;
  status: string;
  provider: string;
  created_at: string;
  completed_at: string | null;
}

export async function fetchTopupPackages(): Promise<{
  packages: CreditPackage[];
  mockEnabled: boolean;
  firstTopupBonusPercent: number;
}> {
  return request('/credits/packages');
}

export async function createTopupOrder(packageId: string): Promise<{
  order: TopupOrder;
  balance: number;
  mockEnabled: boolean;
}> {
  return request('/credits/topup/create', {
    method: 'POST',
    body: JSON.stringify({ package_id: packageId }),
  });
}

export async function confirmMockTopup(orderId: string): Promise<{
  order: TopupOrder;
  balance: number;
  credits_added: number;
}> {
  return request(`/credits/topup/confirm/${orderId}`, { method: 'POST' });
}

export async function listTopupOrders(): Promise<{ orders: TopupOrder[]; balance: number }> {
  return request('/credits/topup/orders');
}

export type DashboardPeriod = '7d' | '30d' | 'all';

export interface DashboardStats {
  balance: number;
  period: DashboardPeriod;
  kpis: {
    balance: number;
    images_success: number;
    videos_success: number;
    credits_consumed_net: number;
  };
  totals: {
    jobs_total: number;
    jobs_success: number;
    jobs_failed: number;
    success_rate: number;
  };
  credits: {
    charged: number;
    refunded: number;
    consumed_net: number;
    signup_bonus: number;
    topup?: number;
    promotion?: number;
    topped_up_total?: number;
  };
  charts: {
    jobs_by_day: Array<{ date: string; jobs: number; success: number; failed: number }>;
    credits_by_day: Array<{ date: string; charged: number; refunded: number; net: number }>;
  };
  recent_jobs: Job[];
  recent_transactions: CreditTransaction[];
}

export async function fetchDashboardStats(period: DashboardPeriod = '7d'): Promise<DashboardStats> {
  return request(`/dashboard/stats?period=${period}`);
}

export async function pollJobUntilDone(
  jobId: string,
  onProgress?: (job: Job) => void,
  signal?: AbortSignal,
): Promise<Job> {
  const intervalMs = 3000;
  const maxAttempts = 100;

  for (let i = 0; i < maxAttempts; i++) {
    if (signal?.aborted) throw new Error('Đã hủy');
    const { job } = await getJob(jobId);
    onProgress?.(job);
    if (job.status === 'success' || job.status === 'failed') return job;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error('Hết thời gian chờ job');
}
