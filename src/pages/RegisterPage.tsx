import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Phone, User } from 'lucide-react';
import AuthSplitLayout from '../components/auth/AuthSplitLayout';
import { loginPathWithNext } from '../lib/landingConfig';
import { loginWithGommoToken } from '../services/authStore';
import { gommoRegisterWithPassword, GommoAuthError } from '../services/gommoAuth';
import { SITE_DISPLAY_NAME } from '../services/siteConfig';
import { DEFAULT_DOMAIN } from '../services/settingsStore';
import { useLocale } from '../i18n';

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/home';
  return raw;
}

export default function RegisterPage() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = safeNextPath(searchParams.get('next'));
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = `${t('auth.register.pageTitle')} · ${SITE_DISPLAY_NAME}`;
    return () => {
      document.title = SITE_DISPLAY_NAME;
    };
  }, [t]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError(t('auth.register.passwordMinError'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const token = await gommoRegisterWithPassword({
        email,
        password,
        name: name.trim() || undefined,
        phone: phone.trim(),
        domain: DEFAULT_DOMAIN,
      });
      await loginWithGommoToken(token, DEFAULT_DOMAIN);
      navigate(nextPath, { replace: true });
    } catch (err) {
      setError(err instanceof GommoAuthError || err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplitLayout onClose={() => navigate(-1)}>
      <h1>{t('auth.register.title')}</h1>
      <p className="auth-split-lead">{t('auth.register.lead', { siteName: SITE_DISPLAY_NAME })}</p>

      <form onSubmit={handleSubmit} className="form">
        <label className="field">
          <span className="label">{t('auth.register.displayName')}</span>
          <span className="auth-input">
            <User size={16} className="auth-input-icon" />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('auth.register.displayNamePlaceholder')}
              autoComplete="name"
            />
          </span>
        </label>
        <label className="field">
          <span className="label">{t('auth.register.email')}</span>
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
        <label className="field">
          <span className="label">{t('auth.register.phone')}</span>
          <span className="auth-input">
            <Phone size={16} className="auth-input-icon" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('auth.register.phonePlaceholder')}
              autoComplete="tel"
              required
            />
          </span>
        </label>
        <label className="field">
          <span className="label">{t('auth.register.password')}</span>
          <span className="auth-input">
            <Lock size={16} className="auth-input-icon" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
          </span>
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn auth-submit" disabled={loading}>
          {loading ? t('auth.register.submitting') : t('auth.register.submit')}
        </button>
      </form>

      <div className="auth-links">
        <span>
          {t('auth.register.hasAccount')}{' '}
          <Link to={loginPathWithNext(nextPath)}>{t('auth.register.loginLink')}</Link>
        </span>
        <span className="auth-legal-note">
          {t('auth.register.legalPrefix')}{' '}
          <Link to="/terms">{t('auth.register.termsLink')}</Link> {t('auth.register.legalAnd')}{' '}
          <Link to="/privacy">{t('auth.register.privacyLink')}</Link>.
        </span>
      </div>
    </AuthSplitLayout>
  );
}
