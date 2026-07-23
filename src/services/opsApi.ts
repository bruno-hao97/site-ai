export interface OpsStatusData {
  ok?: boolean;
  detail?: boolean;
  hint?: string;
  mcp?: {
    cursorServer?: string;
    note?: string;
    toolsHint?: string[];
  };
  payos?: {
    configured?: boolean;
    valid?: boolean | null;
    message?: string | null;
    webhookUrl?: string | null;
  };
  merchant?: {
    configured?: boolean;
    domain?: string;
    minRemainingAfterSend?: number;
    safeAvailableThreshold?: number;
    bufferCredits?: number;
    balance?: number | null;
    reservedPendingCredits?: number;
    available?: number | null;
    error?: string | null;
  };
  telegram?: {
    configured?: boolean;
    notifyChatIdsConfigured?: number;
    webhookUrl?: string | null;
    webhook?: unknown;
    webhookError?: string | null;
  };
  packages?: Array<{
    id: string;
    credits: number;
    amountVnd: number;
    requiredMerchant: number;
  }>;
}

export async function fetchOpsStatus(opsKey?: string): Promise<OpsStatusData> {
  const headers: Record<string, string> = {};
  if (opsKey?.trim()) headers['x-ops-key'] = opsKey.trim();

  const res = await fetch('/api/ops/status', { headers });
  const text = await res.text();
  let raw: { success?: boolean; message?: string; data?: OpsStatusData };
  try {
    raw = JSON.parse(text) as typeof raw;
  } catch {
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (!res.ok || !raw.success || !raw.data) {
    throw new Error(raw.message || `HTTP ${res.status}`);
  }
  return raw.data;
}
