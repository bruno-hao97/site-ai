import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../services/backendApi';
import { saveSession } from '../services/session';
import { loginWithGommoToken } from '../services/authStore';
import { UpstreamMeError } from '../services/upstreamMe';
import GoogleSignInButton from '../components/GoogleSignInButton';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [showToken, setShowToken] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [domain, setDomain] = useState('79ai.net');
  const [tokenLoading, setTokenLoading] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const auth = await login({ email, password, domain: '79ai.net' });
      if (auth.access_token) {
        // Đăng nhập qua Gommo → lưu session Gommo để đọc thẳng tài khoản + credit upstream.
        await loginWithGommoToken(auth.access_token, auth.domain || '79ai.net');
      } else {
        // Tài khoản local (fallback) → giữ session JWT backend.
        saveSession({ token: auth.token, user: auth.user, balance: auth.balance });
      }
      navigate('/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleTokenLogin(e: FormEvent) {
    e.preventDefault();
    setTokenLoading(true);
    setError('');
    try {
      await loginWithGommoToken(accessToken, domain.trim() || '79ai.net');
      navigate('/home');
    } catch (err) {
      setError(err instanceof UpstreamMeError || err instanceof Error ? err.message : String(err));
    } finally {
      setTokenLoading(false);
    }
  }

  return (
    <div className="page auth-page">
      <div className="auth-card panel">
        <h1>Đăng nhập</h1>
        <p className="lead">Đăng nhập để tiếp tục với LN AI.</p>

        <GoogleSignInButton onSuccess={() => navigate('/home')} onError={setError} />

        <div className="auth-divider"><span>hoặc</span></div>

        <form onSubmit={handleLogin} className="form">
          <label className="field">
            <span className="label">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>
          <label className="field">
            <span className="label">Mật khẩu</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/forgot-password">Quên mật khẩu?</Link>
          <span>
            Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
          </span>
        </div>

        <button
          type="button"
          className="auth-token-toggle"
          onClick={() => setShowToken((v) => !v)}
        >
          {showToken ? '▾' : '▸'} Đăng nhập bằng Access Token (nâng cao)
        </button>
        {showToken && (
          <form onSubmit={handleTokenLogin} className="form auth-token-form">
            <p className="lead sm">
              Dùng Access Token từ Account Settings trên{' '}
              <a href="https://79ai.net/settings/tokens" target="_blank" rel="noreferrer">79ai.net</a>.
            </p>
            <label className="field">
              <span className="label">Access Token</span>
              <textarea
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                rows={3}
                placeholder="Dán token từ Account Settings"
              />
            </label>
            <label className="field">
              <span className="label">Domain</span>
              <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="79ai.net" />
            </label>
            <button type="submit" className="btn secondary" disabled={tokenLoading}>
              {tokenLoading ? 'Đang xác thực…' : 'Đăng nhập bằng token'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
