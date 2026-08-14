import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useHistoryUpdated } from '../hooks/useHistoryUpdated';
import {
  JOB_TYPES,
  clearHistory,
  isMediaUrl,
  isValidHistoryType,
  listHistory,
  removeHistoryEntry,
  countHistoryGrouped,
  type HistoryEntry,
  type HistoryType,
} from '../services/historyStore';
import { REUSABLE_JOB_TYPES, studioRouteForType } from '../constants/studioTypes';
import type { JobType } from '../services/api';
import { useLocale, type TranslationKey } from '../i18n';
import type { AppLocale } from '../i18n/types';

const JOB_TYPE_KEYS: Record<HistoryType, TranslationKey> = {
  video: 'jobType.video',
  image: 'jobType.image',
  tts: 'jobType.tts',
  music: 'jobType.music',
  'avatar-lipsync': 'jobType.avatar-lipsync',
};

function dateLocale(locale: AppLocale): string {
  return locale === 'vi' ? 'vi-VN' : 'en-US';
}

function formatTime(iso: string, localeTag: string): string {
  try {
    return new Date(iso).toLocaleString(localeTag, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function truncate(text: string, max = 120): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function HistoryThumb({ entry }: { entry: HistoryEntry }) {
  const kind = isMediaUrl(entry.resultUrl, entry.type);
  if (kind === 'image') {
    return (
      <img
        className="hist-thumb-img"
        src={entry.resultUrl}
        alt=""
        loading="lazy"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }
  if (kind === 'video') {
    return <video className="hist-thumb-vid" src={entry.resultUrl} muted playsInline preload="metadata" />;
  }
  const icon = kind === 'audio' ? '🔊' : '📄';
  return <span className="hist-thumb-icon">{icon}</span>;
}

/** Lịch sử kết quả gen Studio (localStorage) — route /studio-history */
export default function StudioHistoryPage() {
  const { t, locale } = useLocale();
  const localeTag = dateLocale(locale);
  const { type: typeParam } = useParams<{ type?: string }>();
  const navigate = useNavigate();
  const activeType = isValidHistoryType(typeParam) ? typeParam : null;

  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((n) => n + 1), []);
  useHistoryUpdated(refresh);

  const counts = useMemo(() => countHistoryGrouped(), [tick]);
  const entries = useMemo(() => listHistory(activeType), [activeType, tick]);
  const totalAll = useMemo(() => Object.values(counts).reduce((a, b) => a + b, 0), [counts]);

  function typeLabel(type: HistoryType): string {
    return t(JOB_TYPE_KEYS[type]);
  }

  function handleDelete(id: string) {
    if (!confirm(t('studioHistory.confirmDelete'))) return;
    removeHistoryEntry(id);
    refresh();
  }

  function handleClearTab() {
    if (!activeType) return;
    if (!confirm(t('studioHistory.confirmClearTab', { type: typeLabel(activeType) }))) return;
    clearHistory(activeType);
    refresh();
  }

  function handleClearAll() {
    if (!confirm(t('studioHistory.confirmClearAll'))) return;
    clearHistory(null);
    refresh();
  }

  function applyReuse(entry: HistoryEntry) {
    const jobType = entry.type as JobType;
    if (!REUSABLE_JOB_TYPES.includes(jobType)) return;
    navigate(studioRouteForType(jobType), {
      state: {
        reuseHistory: {
          type: jobType,
          prompt: entry.prompt,
          modelSlug: entry.modelSlug,
          meta: entry.meta,
        },
      },
    });
  }

  const emptyTypeSuffix = activeType ? ` ${typeLabel(activeType)}` : '';

  return (
    <div className="page view-history">
      <div className="page-head">
        <p className="kicker">{t('studioHistory.kicker')}</p>
        <h1>{t('studioHistory.title')}</h1>
        <p className="lead">{t('studioHistory.lead')}</p>
      </div>

      <div className="page-segment-tabs type-tabs">
        <Link to="/studio-history" className={`tab ${activeType === null ? 'active' : ''}`}>
          {t('studioHistory.all')}
          {totalAll > 0 && <span className="hist-count">{totalAll}</span>}
        </Link>
        {JOB_TYPES.map((tab) => (
          <Link
            key={tab.value}
            to={`/studio-history/${tab.value}`}
            className={`tab ${activeType === tab.value ? 'active' : ''}`}
          >
            {tab.icon} {typeLabel(tab.value)}
            {counts[tab.value] > 0 && <span className="hist-count">{counts[tab.value]}</span>}
          </Link>
        ))}
      </div>

      <div className="hist-toolbar">
        {activeType && counts[activeType] > 0 && (
          <button type="button" className="btn ghost sm danger-text" onClick={handleClearTab}>
            {t('studioHistory.clearTab', { type: typeLabel(activeType) })}
          </button>
        )}
        {totalAll > 0 && (
          <button type="button" className="btn ghost sm danger-text" onClick={handleClearAll}>
            {t('studioHistory.clearAll')}
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="hist-empty panel">
          <p>{t('studioHistory.empty', { type: emptyTypeSuffix })}</p>
          <p className="muted">
            {t('studioHistory.emptyHintPrefix')}{' '}
            <Link to="/image">{t('studioHistory.kicker')}</Link>{' '}
            {t('studioHistory.emptyHintSuffix')}
          </p>
        </div>
      ) : (
        <div className="hist-grid">
          {entries.map((entry) => (
            <article key={entry.id} className="hist-card panel">
              <a className="hist-thumb" href={entry.resultUrl} target="_blank" rel="noreferrer">
                <HistoryThumb entry={entry} />
              </a>
              <div className="hist-body">
                <div className="hist-meta">
                  <span className="hist-type-tag">{typeLabel(entry.type)}</span>
                  <time className="hist-time">{formatTime(entry.createdAt, localeTag)}</time>
                </div>
                <p className="hist-prompt" title={entry.prompt}>
                  {entry.prompt ? truncate(entry.prompt) : '—'}
                </p>
                {entry.modelName && <p className="hist-model">{entry.modelName}</p>}
                <div className="hist-actions">
                  <a className="hist-btn" href={entry.resultUrl} target="_blank" rel="noreferrer">
                    {t('studioHistory.open')}
                  </a>
                  <button type="button" className="hist-btn" onClick={() => applyReuse(entry)}>
                    {t('studioHistory.reuse')}
                  </button>
                  <button type="button" className="hist-btn danger" onClick={() => handleDelete(entry.id)}>
                    {t('studioHistory.delete')}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
