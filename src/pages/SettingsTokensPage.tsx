import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadAuth, loginWithGommoToken } from '../services/authStore';
import {
  fetchAllUpstreamTokens,
  formatUnixTime,
  maskToken,
  type UpstreamTokenItem,
} from '../services/upstreamTokens';
import { UpstreamMeError } from '../services/upstreamMe';
import { useLocale } from '../i18n';

export default function SettingsTokensPage() {
  const { t } = useLocale();
  const auth = loadAuth();
  const [tokens, setTokens] = useState<UpstreamTokenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!auth?.access_token || !auth.domain) {
      setError(t('tokens.notLoggedIn'));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetchAllUpstreamTokens(auth.access_token, auth.domain);
      setTokens(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err instanceof UpstreamMeError || err instanceof Error ? err.message : String(err));
      setTokens([]);
    } finally {
      setLoading(false);
    }
  }, [auth?.access_token, auth?.domain, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function copyToken(item: UpstreamTokenItem) {
    try {
      await navigator.clipboard.writeText(item.access_token);
      setCopiedId(item.token_key);
      setNotice(t('tokens.copiedNotice'));
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError(t('tokens.copyFailed'));
    }
  }

  async function useToken(item: UpstreamTokenItem) {
    if (!auth?.domain) return;
    setSwitchingId(item.token_key);
    setError('');
    setNotice('');
    try {
      await loginWithGommoToken(item.access_token, auth.domain);
      setNotice(t('tokens.switchedNotice'));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSwitchingId(null);
    }
  }

  const activeToken = auth?.access_token;

  return (
    <div className="page">
      <div className="page-head">
        <p className="kicker">
          <Link to="/settings">{t('tokens.backLink')}</Link>
        </p>
        <h1>{t('tokens.title')}</h1>
        <p className="lead">
          {t('tokens.lead')} <strong>{auth?.domain}</strong>
        </p>
      </div>

      <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span className="muted">{t('tokens.count', { count: tokens.length })}</span>
        <button type="button" className="btn ghost sm" onClick={() => load()} disabled={loading}>
          {t('tokens.refresh')}
        </button>
      </div>

      {loading && <p className="muted">{t('tokens.loading')}</p>}
      {error && <p className="error">{error}</p>}
      {notice && <p className="notice">{notice}</p>}

      {!loading && tokens.length === 0 && !error && (
        <p className="muted panel">{t('tokens.empty')}</p>
      )}

      <div className="token-list">
        {tokens.map((item) => {
          const isActive = item.access_token === activeToken;
          return (
            <article key={item.token_key} className={`panel token-card ${isActive ? 'token-card-active' : ''}`}>
              <div className="token-card-head">
                <div>
                  <h3 className="token-card-title">
                    {item.name?.trim() || t('tokens.unnamed')}
                    {isActive && <span className="status-badge live">{t('tokens.activeBadge')}</span>}
                  </h3>
                  <p className="token-card-meta mono">{item.token_key}</p>
                </div>
                <span className={`status-badge ${item.status === 'LIVE' ? 'live' : ''}`}>
                  {item.status || '—'}
                </span>
              </div>

              <dl className="token-card-dl">
                <div>
                  <dt>{t('tokens.createdAt')}</dt>
                  <dd>{formatUnixTime(item.created_time)}</dd>
                </div>
                <div>
                  <dt>{t('tokens.expiresAt')}</dt>
                  <dd>{formatUnixTime(item.expired_time)}</dd>
                </div>
                <div className="token-card-token">
                  <dt>{t('tokens.accessToken')}</dt>
                  <dd className="mono">{maskToken(item.access_token)}</dd>
                </div>
              </dl>

              <div className="token-card-actions">
                <button
                  type="button"
                  className="btn secondary sm"
                  onClick={() => copyToken(item)}
                >
                  {copiedId === item.token_key ? t('tokens.copiedBtn') : t('tokens.copyBtn')}
                </button>
                {!isActive && (
                  <button
                    type="button"
                    className="btn primary sm"
                    disabled={switchingId === item.token_key}
                    onClick={() => useToken(item)}
                  >
                    {switchingId === item.token_key ? t('tokens.usingBtn') : t('tokens.useBtn')}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
