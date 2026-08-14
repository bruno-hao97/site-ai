import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { clearAuth, loadAuth } from '../services/authStore';
import { loadOpenaiKey, saveOpenaiKey } from '../services/openaiKeyStore';
import { loadTheme, saveTheme, type ThemeMode } from '../services/themeStore';
import { fetchOpsStatus, type OpsStatusData } from '../services/opsApi';
import {
  getBrowserPushStatus,
  requestPushPermission,
  resolvePushAppId,
  setupOneSignalFromAuth,
  type PushStatus,
} from '../services/oneSignal';
import { useLocale } from '../i18n';

const OPS_KEY_SESSION = 'ops_status_key';

function pill(ok: boolean | null | undefined): string {
  if (ok === true) return 'ok';
  if (ok === false) return 'warn';
  return '';
}

export default function SettingsPage() {
  const { t, locale } = useLocale();
  const auth = loadAuth();
  const domain = auth?.domain || '—';
  const [theme, setTheme] = useState<ThemeMode>(loadTheme());
  const [layoutWide, setLayoutWide] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);
  const [openaiKey, setOpenaiKey] = useState(loadOpenaiKey());
  const [openaiSaved, setOpenaiSaved] = useState(false);
  const [ops, setOps] = useState<OpsStatusData | null>(null);
  const [opsError, setOpsError] = useState('');
  const [opsLoading, setOpsLoading] = useState(false);
  const [opsKey, setOpsKey] = useState(() => sessionStorage.getItem(OPS_KEY_SESSION) || '');
  const [pushStatus, setPushStatus] = useState<PushStatus>(() => getBrowserPushStatus());
  const [pushBusy, setPushBusy] = useState(false);
  const [pushAppId, setPushAppId] = useState<string | null>(null);
  const [pushError, setPushError] = useState('');

  const loadOps = useCallback(async () => {
    setOpsLoading(true);
    setOpsError('');
    try {
      if (opsKey.trim()) sessionStorage.setItem(OPS_KEY_SESSION, opsKey.trim());
      else sessionStorage.removeItem(OPS_KEY_SESSION);
      const data = await fetchOpsStatus(opsKey.trim() || undefined);
      setOps(data);
    } catch (err) {
      setOps(null);
      setOpsError(err instanceof Error ? err.message : String(err));
    } finally {
      setOpsLoading(false);
    }
  }, [opsKey]);

  useEffect(() => {
    void loadOps();
    // Mount once; refresh via button
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const id = await resolvePushAppId();
      if (cancelled) return;
      setPushAppId(id);
      setPushStatus(getBrowserPushStatus());
      if (id) void setupOneSignalFromAuth();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleEnablePush() {
    setPushBusy(true);
    setPushError('');
    try {
      const id = pushAppId || (await resolvePushAppId());
      setPushAppId(id);
      if (!id) {
        setPushError(t('settings.pushErrorNoAppId'));
        return;
      }
      if (getBrowserPushStatus() === 'denied') {
        setPushError(t('settings.pushErrorDenied'));
        setPushStatus('denied');
        return;
      }
      const next = await requestPushPermission();
      setPushStatus(next);
      if (next !== 'granted') {
        setPushError(t('settings.pushErrorNotGranted'));
      }
    } catch (err) {
      setPushStatus(getBrowserPushStatus());
      setPushError(err instanceof Error ? err.message : String(err));
    } finally {
      setPushBusy(false);
    }
  }

  function handleLogout() {
    clearAuth();
    window.location.href = '/login';
  }

  function setThemeMode(mode: ThemeMode) {
    saveTheme(mode);
    setTheme(mode);
  }

  function saveOpenai(e: FormEvent) {
    e.preventDefault();
    saveOpenaiKey(openaiKey);
    setOpenaiSaved(true);
    setTimeout(() => setOpenaiSaved(false), 2000);
  }

  return (
    <div className="page settings-79">
      <div className="page-head">
        <h1>{t('settings.title')}</h1>
        <p className="lead">{t('settings.lead')}</p>
        <Link to="/account" className="settings-account-link">
          {t('settings.accountLink')}
        </Link>
      </div>

      <div className="settings-79-stack">
        <section className="panel settings-79-section">
          <h2>{t('settings.apiWebhook')}</h2>
          <div className="settings-79-row">
            <div>
              <div className="settings-79-row-title">{t('settings.domainTitle')}</div>
              <div className="settings-79-row-desc">{t('settings.domainDesc')}</div>
            </div>
            <span className="settings-79-domain">{domain}</span>
          </div>
          <div className="settings-79-row">
            <div>
              <div className="settings-79-row-title">{t('settings.tokenTitle')}</div>
              <div className="settings-79-row-desc">{t('settings.tokenDesc')}</div>
            </div>
            <Link to="/settings/tokens" className="btn secondary sm">
              {t('settings.tokenBtn')}
            </Link>
          </div>
        </section>

        <section className="panel settings-79-section">
          <h2>{t('settings.opsTitle')}</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            {t('settings.opsLead')}
          </p>
          <div className="settings-79-openai-row" style={{ marginBottom: '0.75rem' }}>
            <input
              value={opsKey}
              onChange={(e) => setOpsKey(e.target.value)}
              placeholder={t('settings.opsKeyPlaceholder')}
              className="settings-79-openai-input"
              type="password"
              autoComplete="off"
            />
            <button type="button" className="btn primary sm" onClick={() => void loadOps()} disabled={opsLoading}>
              {opsLoading ? t('settings.loading') : t('settings.refresh')}
            </button>
          </div>
          {opsError && <p className="muted" style={{ color: 'var(--danger)' }}>{opsError}</p>}
          {ops && (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <div className="settings-79-row">
                <div>
                  <div className="settings-79-row-title">PayOS</div>
                  <div className="settings-79-row-desc">{ops.payos?.message || ops.payos?.webhookUrl || '—'}</div>
                </div>
                <span className={`status-pill ${pill(Boolean(ops.payos?.configured && ops.payos?.valid !== false))}`}>
                  {ops.payos?.configured
                    ? (ops.payos.valid === false ? t('settings.opsKeyError') : t('settings.opsOk'))
                    : t('settings.opsNotConfigured')}
                </span>
              </div>
              <div className="settings-79-row">
                <div>
                  <div className="settings-79-row-title">{t('settings.opsMerchantTitle')}</div>
                  <div className="settings-79-row-desc">
                    Domain {ops.merchant?.domain || '—'}
                    {ops.detail && ops.merchant?.available != null
                      ? ` · ${t('settings.opsMerchantAvailable', { credits: ops.merchant.available.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US') })}`
                      : ''}
                    {ops.merchant?.error ? ` · ${ops.merchant.error}` : ''}
                  </div>
                </div>
                <span className={`status-pill ${pill(Boolean(ops.merchant?.configured && !ops.merchant?.error))}`}>
                  {ops.merchant?.configured ? t('settings.opsOk') : t('settings.opsNotConfigured')}
                </span>
              </div>
              <div className="settings-79-row">
                <div>
                  <div className="settings-79-row-title">{t('settings.opsTelegramTitle')}</div>
                  <div className="settings-79-row-desc">
                    {t('settings.opsTelegramAdmin')}: {ops.telegram?.notifyChatIdsConfigured ?? 0}
                    {ops.telegram?.webhookError ? ` · ${ops.telegram.webhookError}` : ''}
                  </div>
                </div>
                <span className={`status-pill ${pill(ops.telegram?.configured)}`}>
                  {ops.telegram?.configured ? 'Token OK' : t('settings.opsNotConfigured')}
                </span>
              </div>
              {!ops.detail && ops.hint && (
                <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>{ops.hint}</p>
              )}
              {ops.mcp?.note && (
                <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>{ops.mcp.note}</p>
              )}
            </div>
          )}
        </section>

        <section className="panel settings-79-section">
          <h2>
            {t('settings.openaiTitle')}
            <span className="settings-79-tag">{t('settings.openaiTag')}</span>
          </h2>
          <form onSubmit={saveOpenai} className="settings-79-openai-row">
            <input
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder={t('settings.openaiPlaceholder')}
              className="settings-79-openai-input"
            />
            <button type="submit" className="btn primary sm">{t('settings.save')}</button>
          </form>
          <p className="settings-79-openai-foot muted">
            {openaiSaved
              ? t('settings.openaiSaved')
              : openaiKey
                ? t('settings.openaiConfigured')
                : t('settings.openaiEmpty')}
          </p>
        </section>

        <section className="panel settings-79-section">
          <h2>{t('settings.appearanceTitle')}</h2>
          <div className="settings-79-row">
            <div>
              <div className="settings-79-row-title">{t('settings.appearanceTitle')}</div>
            </div>
            <div className="settings-79-segment">
              <button
                type="button"
                className={theme === 'light' ? 'active' : ''}
                onClick={() => setThemeMode('light')}
              >
                {t('settings.themeLight')}
              </button>
              <button
                type="button"
                className={theme === 'dark' ? 'active' : ''}
                onClick={() => setThemeMode('dark')}
              >
                {t('settings.themeDark')}
              </button>
            </div>
          </div>
          <div className="settings-79-row">
            <div>
              <div className="settings-79-row-title">{t('settings.layoutTitle')}</div>
              <div className="settings-79-row-desc">{t('settings.layoutDesc')}</div>
            </div>
            <label className="settings-79-toggle">
              <input
                type="checkbox"
                checked={layoutWide}
                onChange={(e) => setLayoutWide(e.target.checked)}
              />
              <span />
            </label>
          </div>
        </section>

        <section className="panel settings-79-section">
          <h2>{t('settings.notificationsTitle')}</h2>
          <div className="settings-79-row">
            <div>
              <div className="settings-79-row-title">{t('settings.pushTitle')}</div>
              <div className="settings-79-row-desc">
                {pushStatus === 'granted'
                  ? t('settings.pushGranted')
                  : pushStatus === 'denied'
                    ? t('settings.pushDenied')
                    : pushStatus === 'unsupported'
                      ? t('settings.pushUnsupported')
                      : t('settings.pushDefault')}
                {pushError ? (
                  <div style={{ color: 'var(--danger)', marginTop: 6 }}>{pushError}</div>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              className="btn settings-79-gradient-btn"
              onClick={() => void handleEnablePush()}
              disabled={pushBusy || pushStatus === 'unsupported' || pushStatus === 'granted'}
            >
              {pushBusy ? t('settings.loading') : pushStatus === 'granted' ? t('settings.pushEnabled') : t('settings.pushEnable')}
            </button>
          </div>
          <div className="settings-79-row">
            <div>
              <div className="settings-79-row-title">{t('settings.emailTitle')}</div>
              <div className="settings-79-row-desc">{t('settings.emailDesc')}</div>
            </div>
            <label className="settings-79-toggle">
              <input
                type="checkbox"
                checked={emailNotif}
                onChange={(e) => setEmailNotif(e.target.checked)}
              />
              <span />
            </label>
          </div>
        </section>

        <section className="panel settings-79-section">
          <h2>{t('settings.securityTitle')}</h2>
          <div className="settings-79-row">
            <div>
              <div className="settings-79-row-title">{t('settings.sessionsTitle')}</div>
              <div className="settings-79-row-desc">{t('settings.sessionsDesc')}</div>
            </div>
            <button type="button" className="btn ghost sm" onClick={handleLogout}>
              {t('settings.logout')}
            </button>
          </div>
          <div className="settings-79-row">
            <div>
              <div className="settings-79-row-title">{t('account.settings.passwordTitle')}</div>
              <div className="settings-79-row-desc">{t('account.settings.updatePassword')}</div>
            </div>
            <Link to="/account" className="btn ghost sm">{t('account.settings.passwordTitle')}</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
