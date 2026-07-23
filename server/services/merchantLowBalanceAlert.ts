import fs from 'node:fs/promises';
import path from 'node:path';
import { config, isGommoMerchantConfigured, isTelegramConfigured } from '../config.js';
import {
  fetchMerchantCreditsAi,
  merchantSafeAvailableThreshold,
} from './gommoMerchantBalance.js';
import { sumReservedTopupCredits } from './topupOrders.js';
import { notifyTelegramAdmins } from './telegram.js';

const DEFAULT_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6h
const DEFAULT_POLL_MS = 30 * 60 * 1000; // 30m

interface AlertState {
  lastAlertAt?: string;
  lastAvailable?: number;
  lastBelowThreshold?: boolean;
}

function alertStateFile(): string {
  return (
    process.env.MERCHANT_LOW_BALANCE_ALERT_FILE ||
    path.join(path.dirname(config.topup.ordersFile), 'merchant-low-balance-alert.json')
  );
}

function cooldownMs(): number {
  const raw = Number(process.env.MERCHANT_LOW_BALANCE_ALERT_COOLDOWN_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_COOLDOWN_MS;
}

export function merchantLowBalancePollMs(): number {
  const raw = Number(process.env.MERCHANT_LOW_BALANCE_POLL_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_POLL_MS;
}

async function readState(): Promise<AlertState> {
  try {
    const raw = await fs.readFile(alertStateFile(), 'utf8');
    return JSON.parse(raw) as AlertState;
  } catch {
    return {};
  }
}

async function writeState(state: AlertState): Promise<void> {
  const file = alertStateFile();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(state, null, 2), 'utf8');
}

export async function checkAndNotifyMerchantLowBalance(opts?: {
  force?: boolean;
  reason?: string;
}): Promise<{
  checked: boolean;
  belowThreshold: boolean;
  available: number | null;
  threshold: number;
  notified: boolean;
  skippedReason?: string;
}> {
  const threshold = merchantSafeAvailableThreshold();

  if (!isGommoMerchantConfigured()) {
    return {
      checked: false,
      belowThreshold: false,
      available: null,
      threshold,
      notified: false,
      skippedReason: 'merchant_not_configured',
    };
  }
  if (!isTelegramConfigured() || config.telegram.notifyChatIds.length === 0) {
    return {
      checked: false,
      belowThreshold: false,
      available: null,
      threshold,
      notified: false,
      skippedReason: 'telegram_not_configured',
    };
  }

  const [balance, reserved] = await Promise.all([
    fetchMerchantCreditsAi(),
    sumReservedTopupCredits(),
  ]);
  const available = Math.max(0, Math.floor(balance) - Math.floor(reserved));
  const belowThreshold = available < threshold;

  const state = await readState();

  if (!belowThreshold) {
    if (state.lastBelowThreshold) {
      await writeState({
        lastAlertAt: state.lastAlertAt,
        lastAvailable: available,
        lastBelowThreshold: false,
      });
    }
    return {
      checked: true,
      belowThreshold: false,
      available,
      threshold,
      notified: false,
    };
  }

  const lastAlertMs = state.lastAlertAt ? Date.parse(state.lastAlertAt) : 0;
  const withinCooldown =
    !opts?.force &&
    Number.isFinite(lastAlertMs) &&
    Date.now() - lastAlertMs < cooldownMs() &&
    state.lastBelowThreshold === true;

  if (withinCooldown) {
    return {
      checked: true,
      belowThreshold: true,
      available,
      threshold,
      notified: false,
      skippedReason: 'cooldown',
    };
  }

  const fmt = (n: number) => n.toLocaleString('vi-VN');
  const reason = opts?.reason ? `\nLý do: ${opts.reason}` : '';
  const text = [
    '⚠️ Merchant credit thấp',
    `Khả dụng: ${fmt(available)} (threshold ${fmt(threshold)})`,
    `Balance: ${fmt(balance)} · Reserved pending: ${fmt(reserved)}`,
    `Rule: sau sendBalances phải còn > ${fmt(threshold - 1)} (GOMMO_MIN_REMAINING_AFTER_SEND)`,
    reason,
  ]
    .filter(Boolean)
    .join('\n');

  const result = await notifyTelegramAdmins(text);
  if (result.errors.length) {
    console.warn('[merchant-low-balance] telegram errors', result.errors);
  }

  const notified = result.sent > 0;
  if (notified) {
    await writeState({
      lastAlertAt: new Date().toISOString(),
      lastAvailable: available,
      lastBelowThreshold: true,
    });
  }

  return {
    checked: true,
    belowThreshold: true,
    available,
    threshold,
    notified,
    skippedReason: notified ? undefined : 'telegram_send_failed',
  };
}

/** Fire-and-forget — không chặn request PayOS. */
export function notifyMerchantLowBalanceAsync(reason?: string): void {
  void checkAndNotifyMerchantLowBalance({ reason }).catch((err) => {
    console.warn(
      '[merchant-low-balance] check failed',
      err instanceof Error ? err.message : err,
    );
  });
}

let pollTimer: ReturnType<typeof setInterval> | null = null;

export function startMerchantLowBalancePoller(): void {
  if (pollTimer) return;
  if (!isGommoMerchantConfigured()) return;

  const interval = merchantLowBalancePollMs();
  console.log(`[merchant-low-balance] poll every ${Math.round(interval / 60_000)}m`);

  // Check sớm sau boot (tránh spam nếu cooldown còn hiệu lực).
  setTimeout(() => {
    notifyMerchantLowBalanceAsync('startup');
  }, 15_000);

  pollTimer = setInterval(() => {
    notifyMerchantLowBalanceAsync('poll');
  }, interval);
  pollTimer.unref?.();
}
