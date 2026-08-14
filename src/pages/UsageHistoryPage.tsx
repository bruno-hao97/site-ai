import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Download,
  History,
  Image as ImageIcon,
  type LucideIcon,
  Mic,
  Music,
  Search,
  Sparkles,
  TrendingUp,
  Video,
} from 'lucide-react';
import { getCreditsAi, loadAuth } from '../services/authStore';
import {
  fetchUpstreamUsageHistory,
  type UsageHistoryItem,
} from '../services/upstreamUsageHistory';
import { listHistory } from '../services/historyStore';
import { useLocale, type TranslateFn } from '../i18n';
import type { AppLocale, TranslationKey } from '../i18n/types';

type PillId = 'image' | 'video' | 'audio' | 'music';
type Category = PillId | 'other';

const PILL_IDS: PillId[] = ['image', 'video', 'audio', 'music'];

const PILLS: { id: PillId; labelKey: TranslationKey }[] = [
  { id: 'image', labelKey: 'usageHistory.pillImage' },
  { id: 'video', labelKey: 'usageHistory.pillVideo' },
  { id: 'audio', labelKey: 'usageHistory.pillAudio' },
  { id: 'music', labelKey: 'usageHistory.pillMusic' },
];

const CHART_TAB_KEYS = [
  { days: 7, labelKey: 'usageHistory.chart7' as TranslationKey },
  { days: 14, labelKey: 'usageHistory.chart14' as TranslationKey },
  { days: 30, labelKey: 'usageHistory.chart30' as TranslationKey },
];

const TIME_TABS: { id: string; labelKey: TranslationKey; days: number | null }[] = [
  { id: 'all', labelKey: 'usageHistory.timeAll', days: null },
  { id: '7', labelKey: 'usageHistory.time7', days: 7 },
  { id: '30', labelKey: 'usageHistory.time30', days: 30 },
  { id: '90', labelKey: 'usageHistory.time90', days: 90 },
];

const CATEGORY_STYLE: Record<Category, { color: string; bg: string; icon: LucideIcon }> = {
  image: { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', icon: ImageIcon },
  video: { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', icon: Video },
  audio: { color: '#4ade80', bg: 'rgba(74,222,128,0.12)', icon: Mic },
  music: { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', icon: Music },
  other: { color: 'var(--muted)', bg: 'rgba(255,255,255,0.06)', icon: Sparkles },
};

const STATUS_STYLE: Record<string, { color: string; labelKey: TranslationKey }> = {
  success: { color: '#4ade80', labelKey: 'usageHistory.statusSuccess' },
  failed: { color: '#f87171', labelKey: 'usageHistory.statusFailed' },
  pending: { color: '#fbbf24', labelKey: 'usageHistory.statusPending' },
};

const PAGE_SIZE = 20;

function dateLocale(locale: AppLocale): string {
  return locale === 'vi' ? 'vi-VN' : 'en-US';
}

function rowCategory(it: UsageHistoryItem): Category {
  const s = `${it.type} ${it.typeLabel}`.toLowerCase();
  if (/image|ảnh/.test(s)) return 'image';
  if (/video/.test(s)) return 'video';
  if (/music|nhạc/.test(s)) return 'music';
  if (/audio|tts|avatar|giọng/.test(s)) return 'audio';
  return 'other';
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function localFallbackRows(t: TranslateFn): UsageHistoryItem[] {
  return listHistory(null).map((e) => ({
    id: e.id,
    type: e.type,
    typeLabel:
      e.type === 'image'
        ? t('usageHistory.type.createImage')
        : e.type === 'video'
          ? t('usageHistory.type.createVideo')
          : /tts|music|avatar/.test(e.type)
            ? t('usageHistory.type.createAudio')
            : e.type,
    model: e.modelName || e.modelSlug,
    prompt: e.prompt,
    status: 'success' as const,
    statusLabel: t('usageHistory.status.completed'),
    cost: null,
    balanceAfter: null,
    createdAt: e.createdAt,
  }));
}

function UsageAreaChart({ items, days }: { items: UsageHistoryItem[]; days: number }) {
  const data = useMemo(() => {
    const map = new Map<string, number>();
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      map.set(d.toISOString().slice(0, 10), 0);
    }
    for (const it of items) {
      const key = dayKey(it.createdAt);
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.values()];
  }, [items, days]);

  const max = Math.max(1, ...data);
  const w = 600;
  const h = 110;
  const pad = 8;
  const points = data
    .map((count, i) => {
      const x = pad + (i / Math.max(1, data.length - 1)) * (w - pad * 2);
      const y = h - pad - (count / max) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="uh-chart-svg" preserveAspectRatio="none">
      <polyline fill="none" stroke="#4ade80" strokeWidth="1.8" points={points} />
      <polygon
        fill="url(#uhGrad)"
        points={`${pad},${h - pad} ${points} ${w - pad},${h - pad}`}
        opacity="0.9"
      />
      <defs>
        <linearGradient id="uhGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ade80" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function UsageHistoryPage() {
  const { t, locale } = useLocale();
  const localeTag = dateLocale(locale);
  const { type: typeParam } = useParams<{ type?: string }>();

  const [items, setItems] = useState<UsageHistoryItem[]>([]);
  const [source, setSource] = useState<'upstream' | 'local' | 'empty'>('empty');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeTime, setActiveTime] = useState('all');
  const [activeTypes, setActiveTypes] = useState<PillId[]>(
    typeParam && PILL_IDS.includes(typeParam as PillId)
      ? [typeParam as PillId]
      : [...PILL_IDS],
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [chartDays, setChartDays] = useState(14);
  const [page, setPage] = useState(1);

  const formatTime = useCallback(
    (iso: string): string => {
      try {
        return new Date(iso).toLocaleTimeString(localeTag, { hour: '2-digit', minute: '2-digit' });
      } catch {
        return '';
      }
    },
    [localeTag],
  );

  const formatDayLabel = useCallback(
    (key: string): string => {
      const today = new Date();
      const todayKey = today.toISOString().slice(0, 10);
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const yKey = y.toISOString().slice(0, 10);
      if (key === todayKey) return t('date.today');
      if (key === yKey) return t('date.yesterday');
      try {
        return new Date(`${key}T00:00:00`).toLocaleDateString(localeTag, {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
      } catch {
        return key;
      }
    },
    [localeTag, t],
  );

  const load = useCallback(async () => {
    const auth = loadAuth();
    setLoading(true);
    setError('');
    try {
      if (auth?.access_token) {
        const res = await fetchUpstreamUsageHistory(auth.access_token, auth.domain, {});
        if (res.items.length > 0) {
          setItems(res.items);
          setSource('upstream');
          return;
        }
      }
      const local = localFallbackRows(t);
      setItems(local);
      setSource(local.length > 0 ? 'local' : 'empty');
    } catch {
      const local = localFallbackRows(t);
      setItems(local);
      setSource(local.length > 0 ? 'local' : 'empty');
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleType(id: PillId) {
    setActiveTypes((prev) =>
      prev.includes(id) ? prev.filter((pillId) => pillId !== id) : [...prev, id],
    );
    setPage(1);
  }

  const allTypesActive = activeTypes.length === PILL_IDS.length;

  const filtered = useMemo(() => {
    const timeDays = TIME_TABS.find((tab) => tab.id === activeTime)?.days ?? null;
    const cutoff = timeDays != null ? Date.now() - timeDays * 86400000 : null;
    const q = searchQuery.trim().toLowerCase();

    return items
      .filter((it) => {
        const cat = rowCategory(it);
        const typeOk = allTypesActive || (cat !== 'other' && activeTypes.includes(cat));
        if (!typeOk) return false;
        if (cutoff != null && new Date(it.createdAt).getTime() < cutoff) return false;
        if (q) {
          const hay = `${it.model ?? ''} ${it.prompt ?? ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [items, activeTime, activeTypes, allTypesActive, searchQuery]);

  const summary = useMemo(() => {
    const total = items.length;
    const creditsUsed = items.reduce((sum, it) => sum + (it.cost != null ? Math.abs(it.cost) : 0), 0);
    const success = items.filter((it) => it.status === 'success').length;
    return {
      total,
      creditsUsed,
      successRate: total ? Math.round((success / total) * 100) : 0,
    };
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIndex = filtered.length ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const endIndex = Math.min(safePage * PAGE_SIZE, filtered.length);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const groups = useMemo(() => {
    const out: { key: string; label: string; rows: UsageHistoryItem[] }[] = [];
    const index = new Map<string, number>();
    for (const it of pageItems) {
      const key = dayKey(it.createdAt);
      if (!index.has(key)) {
        index.set(key, out.length);
        out.push({ key, label: formatDayLabel(key), rows: [] });
      }
      out[index.get(key)!].rows.push(it);
    }
    return out;
  }, [pageItems, formatDayLabel]);

  function exportCsv() {
    const header = [
      t('usageHistory.csv.type'),
      t('usageHistory.csv.model'),
      t('usageHistory.csv.prompt'),
      t('usageHistory.csv.time'),
      t('usageHistory.csv.credits'),
      t('usageHistory.csv.status'),
    ];
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = filtered.map((it) =>
      [
        it.typeLabel || it.type,
        it.model || '',
        it.prompt || '',
        new Date(it.createdAt).toLocaleString(localeTag),
        it.cost != null ? String(Math.abs(it.cost)) : '',
        it.statusLabel || it.status,
      ]
        .map(escape)
        .join(','),
    );
    const csv = [header.map(escape).join(','), ...lines].join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usage-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page uh-page">
      <div className="uh-head">
        <div>
          <h1 className="uh-title">
            <History size={18} /> {t('usageHistory.title')}
          </h1>
          <p className="uh-sub">{t('usageHistory.subtitle')}</p>
          {source === 'local' && (
            <p className="uh-fallback">{t('usageHistory.fallbackLocal')}</p>
          )}
        </div>
        <button type="button" className="uh-export" onClick={exportCsv} disabled={!filtered.length}>
          <Download size={14} /> {t('usageHistory.exportCsv')}
        </button>
      </div>

      <div className="uh-cards">
        <div className="uh-card">
          <span className="uh-card-label">{t('usageHistory.totalCalls')}</span>
          <span className="uh-card-value">{summary.total.toLocaleString(localeTag)}</span>
          <span className="uh-card-sub">{t('usageHistory.records')}</span>
        </div>
        <div className="uh-card">
          <span className="uh-card-label">{t('usageHistory.balance')}</span>
          <span className="uh-card-value accent">{getCreditsAi().toLocaleString(localeTag)}</span>
          <span className="uh-card-sub">{t('usageHistory.available')}</span>
        </div>
        <div className="uh-card">
          <span className="uh-card-label">{t('usageHistory.creditsUsed')}</span>
          <span className="uh-card-value">{summary.creditsUsed.toLocaleString(localeTag)}</span>
          <span className="uh-card-sub">{t('usageHistory.totalConsumed')}</span>
        </div>
        <div className="uh-card">
          <span className="uh-card-label">{t('usageHistory.successRate')}</span>
          <span className="uh-card-value">{summary.successRate}%</span>
          <span className="uh-card-sub">{t('usageHistory.onTotalJobs')}</span>
        </div>
      </div>

      <div className="uh-filters">
        <div className="uh-time-tabs">
          {TIME_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`uh-time-tab ${activeTime === tab.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTime(tab.id);
                setPage(1);
              }}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        <div className="uh-search">
          <Search size={14} />
          <input
            type="text"
            placeholder={t('usageHistory.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="uh-pills">
          {PILLS.map((pill) => {
            const active = activeTypes.includes(pill.id);
            const style = CATEGORY_STYLE[pill.id];
            return (
              <button
                key={pill.id}
                type="button"
                className="uh-pill"
                onClick={() => toggleType(pill.id)}
                style={
                  active
                    ? { borderColor: style.color, background: style.bg, color: style.color }
                    : undefined
                }
              >
                {t(pill.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="uh-chart-card">
        <div className="uh-chart-head">
          <span className="uh-chart-title">
            <TrendingUp size={15} /> {t('usageHistory.chartTitle')}
          </span>
          <div className="uh-chart-tabs">
            {CHART_TAB_KEYS.map((tab) => (
              <button
                key={tab.days}
                type="button"
                className={`uh-chart-tab ${chartDays === tab.days ? 'active' : ''}`}
                onClick={() => setChartDays(tab.days)}
              >
                {t('profile.chartDays', { days: tab.days })}
              </button>
            ))}
          </div>
        </div>
        <UsageAreaChart items={filtered} days={chartDays} />
      </div>

      {loading && <p className="muted uh-status-msg">{t('usageHistory.loading')}</p>}
      {error && <p className="error uh-status-msg">{error}</p>}

      {!loading && !filtered.length ? (
        <div className="uh-empty">{t('usageHistory.empty')}</div>
      ) : (
        <div className="uh-table">
          <div className="uh-table-inner">
            <div className="uh-thead">
              <span className="uh-th">{t('usageHistory.colModel')}</span>
              <span className="uh-th right">{t('usageHistory.colTime')}</span>
              <span className="uh-th right">{t('usageHistory.colCredits')}</span>
              <span className="uh-th right">{t('usageHistory.colStatus')}</span>
            </div>

            {groups.map((group) => (
              <div key={group.key}>
                <div className="uh-group-divider">
                  {group.label} — {new Date(`${group.key}T00:00:00`).toLocaleDateString(localeTag)}
                </div>
                {group.rows.map((row) => {
                  const cat = rowCategory(row);
                  const style = CATEGORY_STYLE[cat];
                  const Icon = style.icon;
                  const status = STATUS_STYLE[row.status] ?? STATUS_STYLE.pending;
                  return (
                    <div key={row.id} className="uh-row">
                      <div className="uh-row-main">
                        <span className="uh-icon" style={{ background: style.bg }}>
                          <Icon size={14} style={{ color: style.color }} />
                        </span>
                        <div className="uh-row-text">
                          <span className="uh-model">{row.model || row.typeLabel}</span>
                          {row.prompt && <span className="uh-prompt">{row.prompt}</span>}
                        </div>
                      </div>
                      <span className="uh-time right">{formatTime(row.createdAt)}</span>
                      <span className="uh-credits right">
                        {row.cost != null ? `-${Math.abs(row.cost)}` : '—'}
                      </span>
                      <span className="uh-status right">
                        <span
                          className="uh-status-dot"
                          style={{ background: status.color }}
                          title={t(status.labelKey)}
                        />
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {filtered.length > PAGE_SIZE && (
        <div className="uh-pagination">
          <span className="uh-pag-info">
            {t('usageHistory.pagination', {
              start: startIndex,
              end: endIndex,
              total: filtered.length.toLocaleString(localeTag),
            })}
          </span>
          <div className="uh-pag-btns">
            <button
              type="button"
              className="uh-pag-btn"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              title={t('usageHistory.prev')}
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((n) => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
              .map((n, idx, arr) => (
                <span key={n} className="uh-pag-seg">
                  {idx > 0 && n - arr[idx - 1] > 1 && <span className="uh-pag-ellipsis">…</span>}
                  <button
                    type="button"
                    className={`uh-pag-btn ${safePage === n ? 'active' : ''}`}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                </span>
              ))}
            <button
              type="button"
              className="uh-pag-btn"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              title={t('usageHistory.next')}
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
