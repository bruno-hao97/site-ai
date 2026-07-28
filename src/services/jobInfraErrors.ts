/** Phân biệt lỗi kỹ thuật (proxy/DB/HTML) vs job upstream thật sự fail. */

export const JOB_PENDING_PROGRESS_HINT =
  'Job đang chạy — kiểm tra thư viện trước khi tạo thêm.';

const PENDING_MSG_RE = /đã gửi job|job đang xử lý/i;

export function isAcceptedPendingProgressMessage(msg: string): boolean {
  return PENDING_MSG_RE.test(msg);
}

const INFRA_RE =
  /job không tồn tại|không poll|auth_bridge|html thay vì json|html error|upstream http|dịch vụ .* chưa sẵn sàng|máy chủ trả html|econnrefused|etimedout|502|503|504|waf|forbidden|không kết nối|bridge/i;

const PROVIDER_FAIL_RE =
  /failed|failure|rejected|cancelled|canceled|nsfw|blocked|denied|policy|vi phạm|thất bại|error/i;

export function isInfraJobError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  if (!msg.trim()) return false;
  if (INFRA_RE.test(msg)) return true;
  if (/\bHTTP\s*404\b/i.test(msg) && !PROVIDER_FAIL_RE.test(msg)) return true;
  return false;
}

export function formatAcceptedPendingMessage(providerJobId?: string): string {
  const id = providerJobId?.trim();
  return id
    ? `Đã gửi job (${id.slice(0, 12)}…). Đang xử lý — không bấm tạo lại.`
    : 'Job đang xử lý — không bấm tạo lại. Kiểm tra thư viện.';
}

export class JobAcceptedPendingError extends Error {
  readonly providerJobId?: string;
  readonly acceptedPending = true as const;

  constructor(providerJobId?: string, message?: string) {
    super(message || formatAcceptedPendingMessage(providerJobId));
    this.name = 'JobAcceptedPendingError';
    this.providerJobId = providerJobId;
  }
}

export function isJobAcceptedPendingError(err: unknown): err is JobAcceptedPendingError {
  return (
    err instanceof JobAcceptedPendingError ||
    (err instanceof Error &&
      ((err as { acceptedPending?: boolean }).acceptedPending === true ||
        isAcceptedPendingProgressMessage(err.message)))
  );
}

type PollLike = {
  success?: boolean;
  acceptedPending?: boolean;
  infraError?: boolean;
  timeout?: boolean;
  error?: string;
};

export function requireJobResultUrl(opts: {
  resultUrl?: string | null;
  acceptedOnProvider?: boolean;
  providerJobId?: string;
  pollResult?: PollLike | null;
  failMessage?: string;
}): string {
  const url = opts.resultUrl?.trim();
  if (url) return url;

  const poll = opts.pollResult;
  const soft =
    opts.acceptedOnProvider &&
    Boolean(poll?.acceptedPending || poll?.infraError || poll?.timeout);

  if (soft) {
    throw new JobAcceptedPendingError(opts.providerJobId, poll?.error);
  }

  throw new Error(poll?.error || opts.failMessage || 'Job thất bại');
}
