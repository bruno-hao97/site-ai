import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, KeySquare, Lock, User } from 'lucide-react';
import AuthSplitLayout from '../components/auth/AuthSplitLayout';
import { registerPathWithNext } from '../lib/landingConfig';
import { loginWithGommoToken } from '../services/authStore';
import { gommoLoginWithPassword, gommoResetPassword, GommoAuthError } from '../services/gommoAuth';
import { UpstreamMeError } from '../services/upstreamMe';
import { APP_SITE_URL, DEFAULT_DOMAIN } from '../services/settingsStore';
import { SITE_DISPLAY_NAME } from '../services/siteConfig';
import { useLocale } from '../i18n';

type Step = 'menu' | 'account' | 'token' | 'reset';

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/home';
  return raw;
}

export default function LoginPage() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = safeNextPath(searchParams.get('next'));
  const [step, setStep] = useState<Step>('menu');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [accessToken, setAccessToken] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);

  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');

  useEffect(() => {
    document.title = `${t('auth.login.pageTitle')} · ${SITE_DISPLAY_NAME}`;
    return () => {
      document.title = SITE_DISPLAY_NAME;
    };
  }, [t]);

  function goStep(next: Step) {
    setError('');
    setResetSuccess('');
    setStep(next);
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const token = await gommoLoginWithPassword(email, password, DEFAULT_DOMAIN);
      await loginWithGommoToken(token, DEFAULT_DOMAIN);
      navigate(nextPath, { replace: true });
    } catch (err) {
      setError(err instanceof GommoAuthError || err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    setResetLoading(true);
    setError('');
    setResetSuccess('');
    try {
      const message = await gommoResetPassword(email, DEFAULT_DOMAIN);
      setResetSuccess(message);
    } catch (err) {
      setError(err instanceof GommoAuthError || err instanceof Error ? err.message : String(err));
    } finally {
      setResetLoading(false);
    }
  }

  async function handleTokenLogin(e: FormEvent) {
    e.preventDefault();
    setTokenLoading(true);
    setError('');
    try {
      await loginWithGommoToken(accessToken, DEFAULT_DOMAIN);
      navigate(nextPath, { replace: true });
    } catch (err) {
      setError(err instanceof UpstreamMeError || err instanceof Error ? err.message : String(err));
    } finally {
      setTokenLoading(false);
    }
  }

  return (
    <AuthSplitLayout onClose={() => navigate(-1)}>
      <h1>{t('auth.login.welcome', { siteName: SITE_DISPLAY_NAME })}</h1>
      <p className="auth-split-lead">{t('auth.login.lead')}</p>

      {step === 'menu' && (
        <div className="auth-methods">
          <button type="button" className="auth-method" onClick={() => goStep('account')}>
            <span className="auth-method-icon teal">
              <User size={18} />
            </span>
            <span className="auth-method-text">
              <strong>{t('auth.login.methodAccount')}</strong>
              <small>{t('auth.login.methodAccountDesc')}</small>
            </span>
            <ChevronRight size={18} className="auth-method-arrow" />
          </button>

          <button type="button" className="auth-method" onClick={() => goStep('token')}>
            <span className="auth-method-icon purple">
              <KeySquare size={18} />
            </span>
            <span className="auth-method-text">
              <strong>{t('auth.login.methodToken')}</strong>
              <small>{t('auth.login.methodTokenDesc')}</small>
            </span>
            <ChevronRight size={18} className="auth-method-arrow" />
          </button>
        </div>
      )}

      {step === 'account' && (
        <>
          <div className="auth-switch">
            <button type="button" className="auth-back" onClick={() => goStep('menu')}>
              <ArrowLeft size={14} /> {t('auth.login.back')}
            </button>
            <button type="button" className="auth-switch-link" onClick={() => goStep('token')}>
              {t('auth.login.switchToToken')}
            </button>
          </div>

          <form onSubmit={handleLogin} className="form">
            <label className="field">
              <span className="label">{t('auth.login.emailLabel')}</span>
              <span className="auth-input">
                <User size={16} className="auth-input-icon" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="username"
                  required
                />
              </span>
            </label>
            <label className="field">
              <span className="label">{t('auth.login.passwordLabel')}</span>
              <span className="auth-input">
                <Lock size={16} className="auth-input-icon" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </span>
            </label>
            <button type="button" className="auth-forgot" onClick={() => goStep('reset')}>
              {t('auth.login.forgotPassword')}
            </button>
            {error && <p className="error">{error}</p>}
            <button type="submit" className="btn auth-submit" disabled={loading}>
              {loading ? t('auth.login.submitting') : t('auth.login.submit')}
            </button>
          </form>
        </>
      )}

      {step === 'reset' && (
        <>
          <div className="auth-switch">
            <button type="button" className="auth-back" onClick={() => goStep('account')}>
              <ArrowLeft size={14} /> {t('auth.login.back')}
            </button>
            <span className="auth-switch-link auth-switch-current">{t('auth.login.resetTitle')}</span>
          </div>

          <form onSubmit={handleResetPassword} className="form">
            <p className="lead sm">{t('auth.login.resetLead')}</p>
            <label className="field">
              <span className="label">{t('auth.login.resetEmailLabel')}</span>
              <span className="auth-input">
                <User size={16} className="auth-input-icon" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </span>
            </label>
            {error && <p className="error">{error}</p>}
            {resetSuccess && (
              <p className="account-transfer-feedback success">{resetSuccess}</p>
            )}
            <button type="submit" className="btn auth-submit" disabled={resetLoading}>
              {resetLoading ? t('auth.login.resetSubmitting') : t('auth.login.resetSubmit')}
            </button>
          </form>
        </>
      )}

      {step === 'token' && (
        <>
          <div className="auth-switch">
            <button type="button" className="auth-back" onClick={() => goStep('menu')}>
              <ArrowLeft size={14} /> {t('auth.login.back')}
            </button>
            <button type="button" className="auth-switch-link" onClick={() => goStep('account')}>
              {t('auth.login.switchToAccount')}
            </button>
          </div>

          <form onSubmit={handleTokenLogin} className="form">
            <label className="field">
              <span className="label">{t('auth.login.tokenLabel')}</span>
              <span className="auth-input">
                <KeySquare size={16} className="auth-input-icon" />
                <input
                  type="text"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder={t('auth.login.tokenPlaceholder')}
                />
              </span>
            </label>
            <p className="lead sm">
              {t('auth.login.tokenHintPrefix')}{' '}
              <a href={`${APP_SITE_URL}/settings/tokens`} target="_blank" rel="noreferrer">
                {DEFAULT_DOMAIN}
              </a>
              .
            </p>
            {error && <p className="error">{error}</p>}
            <button type="submit" className="btn auth-submit" disabled={tokenLoading}>
              {tokenLoading ? t('auth.login.tokenSubmitting') : t('auth.login.tokenSubmit')}
            </button>
          </form>
        </>
      )}

      {step === 'menu' && error && <p className="error">{error}</p>}

      <p className="auth-register">
        {t('auth.login.noAccount')}{' '}
        <Link to={registerPathWithNext(nextPath)}>{t('auth.login.registerLink')}</Link>
      </p>
    </AuthSplitLayout>
  );
}
