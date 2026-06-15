import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithGommoToken } from '../services/authStore';
import { UpstreamMeError } from '../services/upstreamMe';

export default function LoginPage() {
  const navigate = useNavigate();
  const [accessToken, setAccessToken] = useState('');
  const [domain, setDomain] = useState('79ai.net');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await loginWithGommoToken(accessToken, domain.trim() || '79ai.net');
      navigate('/app');
    } catch (err) {
      setError(err instanceof UpstreamMeError || err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page auth-page">
      <div className="auth-card panel">
        <h1>Đăng nhập</h1>
        <p className="lead">
          Gọi thẳng <code>api.gommo.net/ai/me</code> — dùng Access Token từ Account Settings trên{' '}
          <a href="https://79ai.net/settings/tokens" target="_blank" rel="noreferrer">79ai.net</a>.
        </p>

        <form onSubmit={handleSubmit} className="form">
          <label className="field">
            <span className="label">Access Token</span>
            <textarea
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              rows={3}
              placeholder="Dán token từ Account Settings"
              required
            />
          </label>
          <label className="field">
            <span className="label">Domain</span>
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="79ai.net"
              required
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? 'Đang xác thực…' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
}
