import {
  fetchMyVideos,
  fetchMyImages,
  type FeedItem,
} from './feedApi';
import { getCreditsAi } from './authStore';
import type {
  CreditTransaction,
  DashboardPeriod,
  DashboardStats,
  Job,
} from './backendApi';

const PAGE_LIMIT = 50;
const MAX_PAGES = 4; // tối đa ~200 item mỗi loại để tránh tải quá nhiều

type Fetcher = (params: { limit?: number; afterId?: string }) => Promise<{
  items: FeedItem[];
  nextAfterId: string;
}>;

async function fetchAllMine(fetcher: Fetcher, maxItems: number): Promise<FeedItem[]> {
  const all: FeedItem[] = [];
  let afterId = '';
  for (let i = 0; i < MAX_PAGES; i += 1) {
    const page = await fetcher({ limit: PAGE_LIMIT, afterId });
    all.push(...page.items);
    if (!page.nextAfterId || page.items.length === 0 || all.length >= maxItems) break;
    afterId = page.nextAfterId;
  }
  return all;
}

function itemTime(it: FeedItem): number {
  const v = it.created_time;
  const ts = typeof v === 'string' ? Number(v) : v ?? 0;
  return Number.isFinite(ts) ? Number(ts) : 0;
}

function isSuccess(status: string | undefined): boolean {
  return /finish|success|done|complete/i.test(status ?? '');
}

function isFailed(status: string | undefined): boolean {
  return /fail|error|cancel/i.test(status ?? '');
}

function dayKey(tsSeconds: number): string {
  const d = new Date(tsSeconds * 1000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function periodDays(period: DashboardPeriod): number {
  if (period === '7d') return 7;
  return 30; // '30d' và 'all' đều hiển thị 30 ngày gần nhất trên biểu đồ
}

function emptyDayBuckets(period: DashboardPeriod): string[] {
  const days = periodDays(period);
  const keys: string[] = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i -= 1) {
    keys.push(dayKey(Math.floor((now - i * 86400_000) / 1000)));
  }
  return keys;
}

/**
 * Dựng thống kê dashboard từ dữ liệu Gommo thật (ảnh/video của user + số dư credit),
 * trả về cùng shape DashboardStats để tái dùng UI dashboard hiện có.
 */
export async function fetchGommoDashboardStats(
  period: DashboardPeriod = '7d',
): Promise<DashboardStats> {
  const [videos, images] = await Promise.all([
    fetchAllMine(fetchMyVideos, PAGE_LIMIT * MAX_PAGES),
    fetchAllMine(fetchMyImages, PAGE_LIMIT * MAX_PAGES),
  ]);

  const cutoff =
    period === 'all'
      ? 0
      : Math.floor(Date.now() / 1000) - periodDays(period) * 86400;

  const all: FeedItem[] = [...videos, ...images].filter(
    (it) => itemTime(it) >= cutoff,
  );

  const videosInPeriod = all.filter((it) => it.type === 'video');
  const imagesInPeriod = all.filter((it) => it.type === 'image');

  const jobsSuccess = all.filter((it) => isSuccess(it.status)).length;
  const jobsFailed = all.filter((it) => isFailed(it.status)).length;
  const jobsTotal = all.length;
  const creditsConsumed = all.reduce((sum, it) => sum + (it.credit_fee || 0), 0);

  // Biểu đồ theo ngày
  const dayKeys = emptyDayBuckets(period);
  const jobsByDayMap = new Map<string, { jobs: number; success: number; failed: number }>();
  const creditsByDayMap = new Map<string, number>();
  for (const k of dayKeys) {
    jobsByDayMap.set(k, { jobs: 0, success: 0, failed: 0 });
    creditsByDayMap.set(k, 0);
  }
  for (const it of all) {
    const k = dayKey(itemTime(it));
    const bucket = jobsByDayMap.get(k);
    if (bucket) {
      bucket.jobs += 1;
      if (isSuccess(it.status)) bucket.success += 1;
      if (isFailed(it.status)) bucket.failed += 1;
      creditsByDayMap.set(k, (creditsByDayMap.get(k) ?? 0) + (it.credit_fee || 0));
    }
  }

  const sorted = [...all].sort((a, b) => itemTime(b) - itemTime(a));

  const recentJobs: Job[] = sorted.slice(0, 12).map((it) => ({
    id: it.id_base,
    type: it.type,
    model_id: it.modelInfo?.name || it.model || '—',
    status: it.status || '—',
    result_url: it.download_url ?? it.thumbnail_url ?? null,
    cost: it.credit_fee || 0,
    error: null,
    created_at: new Date(itemTime(it) * 1000).toISOString(),
    updated_at: new Date(itemTime(it) * 1000).toISOString(),
  }));

  const recentTransactions: CreditTransaction[] = sorted
    .filter((it) => (it.credit_fee || 0) > 0)
    .slice(0, 12)
    .map((it) => ({
      id: `tx-${it.id_base}`,
      amount: -(it.credit_fee || 0),
      type: 'job_charge',
      job_id: it.id_base,
      description: `${it.type} · ${it.modelInfo?.name || it.model || ''}`.trim(),
      created_at: new Date(itemTime(it) * 1000).toISOString(),
    }));

  return {
    balance: getCreditsAi(),
    period,
    kpis: {
      balance: getCreditsAi(),
      images_success: imagesInPeriod.filter((it) => isSuccess(it.status)).length,
      videos_success: videosInPeriod.filter((it) => isSuccess(it.status)).length,
      credits_consumed_net: creditsConsumed,
    },
    totals: {
      jobs_total: jobsTotal,
      jobs_success: jobsSuccess,
      jobs_failed: jobsFailed,
      success_rate: jobsTotal ? Math.round((jobsSuccess / jobsTotal) * 100) : 0,
    },
    credits: {
      charged: creditsConsumed,
      refunded: 0,
      consumed_net: creditsConsumed,
      signup_bonus: 0,
    },
    charts: {
      jobs_by_day: dayKeys.map((date) => ({
        date,
        jobs: jobsByDayMap.get(date)?.jobs ?? 0,
        success: jobsByDayMap.get(date)?.success ?? 0,
        failed: jobsByDayMap.get(date)?.failed ?? 0,
      })),
      credits_by_day: dayKeys.map((date) => ({
        date,
        charged: creditsByDayMap.get(date) ?? 0,
        refunded: 0,
        net: creditsByDayMap.get(date) ?? 0,
      })),
    },
    recent_jobs: recentJobs,
    recent_transactions: recentTransactions,
  };
}
