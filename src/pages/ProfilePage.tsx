import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getCreditsAi,
  getDisplayUser,
  getUpstreamMe,
  refreshSession,
} from '../services/authStore';
import { listHistory } from '../services/historyStore';

function formatJoined(ts?: number): string {
  if (!ts) return '—';
  try {
    return new Date(ts * 1000).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
}

function activityScore(): { label: string; level: 'high' | 'mid' | 'low' } {
  const weekAgo = Date.now() - 7 * 86400000;
  const recent = listHistory(null).filter((e) => new Date(e.createdAt).getTime() >= weekAgo).length;
  if (recent >= 10) return { label: 'High', level: 'high' };
  if (recent >= 3) return { label: 'Medium', level: 'mid' };
  return { label: 'Low', level: 'low' };
}

function UsageChart() {
  const data = useMemo(() => {
    const days = 14;
    const map = new Map<string, number>();
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, 0);
    }
    for (const e of listHistory(null)) {
      const key = e.createdAt.slice(0, 10);
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([day, count]) => ({ day, count }));
  }, []);

  const max = Math.max(1, ...data.map((d) => d.count));
  const w = 560;
  const h = 120;
  const pad = 8;
  const points = data.map((d, i) => {
    const x = pad + (i / Math.max(1, data.length - 1)) * (w - pad * 2);
    const y = h - pad - (d.count / max) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="profile-chart">
      <svg viewBox={`0 0 ${w} ${h}`} className="profile-chart-svg" preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          points={points}
        />
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

function KpiCard({
  icon,
  value,
  label,
  onRefresh,
  loading,
}: {
  icon: string;
  value: string;
  label: string;
  onRefresh: () => void;
  loading: boolean;
}) {
  return (
    <article className="profile-kpi-card">
      <div className="profile-kpi-top">
        <span className="profile-kpi-icon">{icon}</span>
        <button type="button" className="profile-kpi-update" onClick={onRefresh} disabled={loading}>
          UPDATE
        </button>
      </div>
      <div className="profile-kpi-value">{value}</div>
      <div className="profile-kpi-label">{label}</div>
    </article>
  );
}

export default function ProfilePage() {
  const [me, setMe] = useState(getUpstreamMe());
  const [credits, setCredits] = useState(getCreditsAi());
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
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

  async function copyId() {
    const id = info?.id_base || '';
    if (!id) return;
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  return (
    <div className="page profile-79">
      <div
        className="profile-cover"
        style={cover ? { backgroundImage: `url(${cover})` } : undefined}
      >
        {verified && <span className="profile-verified">Verified Account</span>}
      </div>

      <div className="profile-hero">
        <div className="profile-hero-left">
          {info?.avatar ? (
            <img src={info.avatar} alt="" className="profile-hero-avatar" />
          ) : (
            <span className="profile-hero-avatar profile-hero-avatar-fallback" />
          )}
          <div>
            <h1 className="profile-hero-name">
              {user.name || '—'}
              <span className="profile-role-badge">{info?.role || 'USER'}</span>
            </h1>
            <p className="profile-hero-handle">@{info?.username || '—'}</p>
            <p className="profile-hero-email">{user.email || '—'}</p>
            <p className="profile-hero-joined">Joined {formatJoined(info?.created_time)}</p>
          </div>
        </div>
      </div>

      <div className="profile-body">
        <div className="profile-main">
          <h2 className="profile-section-title">⚡ Performance Overview</h2>
          <div className="profile-kpi-grid">
            <KpiCard
              icon="💳"
              value={credits.toLocaleString('vi-VN')}
              label="Credits available"
              onRefresh={refresh}
              loading={loading}
            />
            <KpiCard
              icon="🎬"
              value={String(me?.videoCount ?? 0)}
              label="Videos Generated"
              onRefresh={refresh}
              loading={loading}
            />
            <KpiCard
              icon="⏱"
              value={String(me?.runtime ?? 0)}
              label="Runtime (minutes)"
              onRefresh={refresh}
              loading={loading}
            />
            <KpiCard
              icon="📈"
              value={score.label}
              label="Activity Score"
              onRefresh={refresh}
              loading={loading}
            />
          </div>

          <section className="panel profile-chart-card">
            <h3>🕐 Usage History</h3>
            <UsageChart />
            <p className="muted profile-chart-hint">Hoạt động gen nội dung 14 ngày gần nhất (local)</p>
          </section>
        </div>

        <aside className="profile-sidebar panel">
          <h3>Account Details</h3>
          <label className="profile-detail-field">
            <span>ACCOUNT ID</span>
            <div className="profile-detail-row">
              <input readOnly value={info?.id_base || '—'} />
              <button type="button" className="btn ghost sm" onClick={copyId}>
                {copied ? '✓' : '⧉'}
              </button>
            </div>
          </label>
          <div className="profile-detail-item">
            <span>PLAN STATUS</span>
            <span className={`profile-plan-badge ${planActive ? 'active' : ''}`}>
              {planActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="profile-detail-item">
            <span>API DOMAIN</span>
            <code>v2.api.gommo.net</code>
          </div>
          <a
            href="https://79ai.net/pricing"
            target="_blank"
            rel="noreferrer"
            className="btn primary profile-upgrade-btn"
          >
            UPGRADE TO PRO
          </a>
        </aside>
      </div>
    </div>
  );
}
