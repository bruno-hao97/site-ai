import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  Activity,
  AtSign,
  Calendar,
  Camera,
  Check,
  Clock,
  Copy,
  LineChart,
  type LucideIcon,
  Mail,
  ShieldCheck,
  Video,
  Zap,
} from 'lucide-react';
import {
  getCreditsAi,
  getDisplayUser,
  getUpstreamMe,
  refreshSession,
} from '../services/authStore';
import { listHistory } from '../services/historyStore';
import { APP_SITE_URL } from '../services/settingsStore';
import { useLocale, type TranslationKey } from '../i18n';
import type { AppLocale } from '../i18n/types';

const UPGRADE_FEATURE_KEYS: TranslationKey[] = [
  'profile.upgradeFeat1',
  'profile.upgradeFeat2',
  'profile.upgradeFeat3',
  'profile.upgradeFeat4',
];

const CHART_TABS = [7, 14, 30] as const;

function dateLocale(locale: AppLocale): string {
  return locale === 'vi' ? 'vi-VN' : 'en-US';
}

function formatJoined(ts: number | undefined, localeTag: string): string {
  if (!ts) return '—';
  try {
    return new Date(ts * 1000).toLocaleDateString(localeTag, {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function initials(name: string | null, email: string): string {
  const base = (name || email || 'U').trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

function activityScore(): {
  labelKey: TranslationKey;
  level: 'high' | 'mid' | 'low';
} {
  const weekAgo = Date.now() - 7 * 86400000;
  const recent = listHistory(null).filter((e) => new Date(e.createdAt).getTime() >= weekAgo).length;
  if (recent >= 10) return { labelKey: 'profile.activityHigh', level: 'high' };
  if (recent >= 3) return { labelKey: 'profile.activityMid', level: 'mid' };
  return { labelKey: 'profile.activityLow', level: 'low' };
}

function UsageChart({ days }: { days: number }) {
  const data = useMemo(() => {
    const map = new Map<string, number>();
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      map.set(d.toISOString().slice(0, 10), 0);
    }
    for (const e of listHistory(null)) {
      const key = e.createdAt.slice(0, 10);
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([day, count]) => ({ day, count }));
  }, [days]);

  const max = Math.max(1, ...data.map((d) => d.count));
  const w = 560;
  const h = 120;
  const pad = 8;
  const points = data
    .map((d, i) => {
      const x = pad + (i / Math.max(1, data.length - 1)) * (w - pad * 2);
      const y = h - pad - (d.count / max) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="profile-chart">
      <svg viewBox={`0 0 ${w} ${h}`} className="profile-chart-svg" preserveAspectRatio="none">
        <polyline fill="none" stroke="var(--accent)" strokeWidth="2" points={points} />
        <polygon
          fill="url(#chartGrad)"
          points={`${pad},${h - pad} ${points} ${w - pad},${h - pad}`}
          opacity="0.25"
        />
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function StatCard({
  accent,
  icon: Icon,
  value,
  label,
  badge,
}: {
  accent: string;
  icon: LucideIcon;
  value: string;
  label: string;
  badge: string;
}) {
  return (
    <article className="stat-card" style={{ '--stat-accent': accent } as CSSProperties}>
      <span className="stat-badge">{badge}</span>
      <Icon className="stat-icon" size={16} style={{ color: accent }} />
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </article>
  );
}

export default function ProfilePage() {
  const { t, locale } = useLocale();
  const localeTag = dateLocale(locale);
  const [me, setMe] = useState(getUpstreamMe());
  const [credits, setCredits] = useState(getCreditsAi());
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [chartDays, setChartDays] = useState(14);
  const user = getDisplayUser();
  const score = useMemo(() => activityScore(), [me]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const s = await refreshSession();
      setMe(s.upstream_me);
      setCredits(s.upstream_me.balancesInfo?.credits_ai ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const info = me?.userInfo;
  const cover = info?.cover as string | undefined;
  const verified = info?.verify_email === 1 || info?.activate === 1;
  const planActive = info?.activate === 1;
  const planLabel = (info?.partner_level_key as string | undefined)?.trim() || t('profile.planFree');

  async function copyId() {
    const id = info?.id_base || '';
    if (!id) return;
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="page profile-79">
      <div
        className="profile-cover"
        style={cover ? { backgroundImage: `url(${cover})` } : undefined}
      >
        {verified && (
          <span className="profile-verified">
            <ShieldCheck size={12} /> {t('profile.verified')}
          </span>
        )}
        <div className="profile-cover-edit">
          <Camera size={14} /> {t('profile.changeCover')}
        </div>
      </div>

      <div className="profile-hero">
        <div className="profile-hero-left">
          <div className="profile-hero-avatar-wrap">
            {info?.avatar ? (
              <img src={info.avatar} alt="" className="profile-hero-avatar" />
            ) : (
              <span className="profile-hero-avatar profile-hero-avatar-initials">
                {initials(user.name, user.email)}
              </span>
            )}
            {verified && (
              <span className="profile-verified-dot" title={t('profile.verified')}>
                <Check size={11} />
              </span>
            )}
          </div>
          <div>
            <h1 className="profile-hero-name">
              {user.name || '—'}
              <span className="profile-role-badge">{info?.role || 'USER'}</span>
            </h1>
            <div className="profile-meta">
              <span className="profile-meta-item">
                <AtSign size={13} />
                {info?.username || '—'}
              </span>
              <span className="profile-meta-item">
                <Mail size={13} />
                {user.email || '—'}
              </span>
              <span className="profile-meta-item">
                <Calendar size={13} />
                {t('profile.joined')} {formatJoined(info?.created_time, localeTag)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="profile-body">
        <div className="profile-main">
          <div className="profile-section-head">
            <span className="profile-section-label">
              <Zap size={14} /> {t('profile.performance')}
            </span>
            <button
              type="button"
              className="profile-refresh"
              onClick={refresh}
              disabled={loading}
            >
              {loading ? t('profile.loading') : t('profile.refresh')}
            </button>
          </div>

          <div className="profile-stats-grid">
            <StatCard
              accent="#4ADE80"
              icon={Zap}
              value={credits.toLocaleString(localeTag)}
              label={t('profile.statCredits')}
              badge={t('profile.badgeLive')}
            />
            <StatCard
              accent="#60A5FA"
              icon={Video}
              value={String(me?.videoCount ?? 0)}
              label={t('profile.statVideos')}
              badge={t('profile.badgeUpdate')}
            />
            <StatCard
              accent="#FBBF24"
              icon={Clock}
              value={String(me?.runtime ?? 0)}
              label={t('profile.statRuntime')}
              badge={t('profile.badgeUpdate')}
            />
            <StatCard
              accent="#F87171"
              icon={Activity}
              value={t(score.labelKey)}
              label={t('profile.statActivity')}
              badge={t('profile.badgeUpdate')}
            />
          </div>

          <section className="panel profile-chart-card">
            <div className="profile-chart-head">
              <span className="profile-chart-title">
                <LineChart size={15} /> {t('profile.usageHistory')}
              </span>
              <div className="profile-chart-tabs">
                {CHART_TABS.map((days) => (
                  <button
                    key={days}
                    type="button"
                    className={`profile-chart-tab ${chartDays === days ? 'active' : ''}`}
                    onClick={() => setChartDays(days)}
                  >
                    {t('profile.chartDays', { days })}
                  </button>
                ))}
              </div>
            </div>
            <UsageChart days={chartDays} />
            <p className="profile-chart-hint">
              {t('profile.chartHint', { days: chartDays })}
            </p>
          </section>
        </div>

        <aside className="profile-sidebar">
          <section className="profile-side-card">
            <h3 className="profile-side-title">{t('profile.accountInfo')}</h3>
            <div className="profile-acc-row">
              <span className="profile-acc-key">{t('profile.accountId')}</span>
              <button type="button" className="profile-acc-val mono copyable" onClick={copyId}>
                <span className="profile-acc-id">{info?.id_base || '—'}</span>
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
            <div className="profile-acc-row">
              <span className="profile-acc-key">{t('profile.status')}</span>
              <span className={`profile-acc-status ${planActive ? 'active' : ''}`}>
                <span className="profile-acc-dot" />
                {planActive ? t('profile.statusActive') : t('profile.statusInactive')}
              </span>
            </div>
            <div className="profile-acc-row">
              <span className="profile-acc-key">{t('profile.currentPlan')}</span>
              <span className="profile-acc-val">{planLabel}</span>
            </div>
            <div className="profile-acc-row">
              <span className="profile-acc-key">{t('profile.apiDomain')}</span>
              <span className="profile-acc-val mono accent">v2.api.gommo.net</span>
            </div>
          </section>

          <section className="profile-upgrade-card">
            <h3 className="profile-upgrade-title">{t('profile.upgradeTitle')}</h3>
            <p className="profile-upgrade-desc">{t('profile.upgradeDesc')}</p>
            <ul className="profile-upgrade-feats">
              {UPGRADE_FEATURE_KEYS.map((featKey) => (
                <li key={featKey}>
                  <Check size={13} />
                  {t(featKey)}
                </li>
              ))}
            </ul>
            <a
              href={`${APP_SITE_URL}/pricing`}
              target="_blank"
              rel="noreferrer"
              className="btn primary profile-upgrade-btn"
            >
              <Zap size={14} /> {t('profile.upgradeBtn')}
            </a>
          </section>
        </aside>
      </div>
    </div>
  );
}
