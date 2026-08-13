import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Phone, User } from 'lucide-react';
import AuthSplitLayout from '../components/auth/AuthSplitLayout';
import { loginPathWithNext } from '../lib/landingConfig';
import { loginWithGommoToken } from '../services/authStore';
import { gommoRegisterWithPassword, GommoAuthError } from '../services/gommoAuth';
import { SITE_DISPLAY_NAME } from '../services/siteConfig';
import { DEFAULT_DOMAIN } from '../services/settingsStore';

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/home';
  return raw;
}

export default function RegisterPage() {
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
    document.title = `Đăng ký · ${SITE_DISPLAY_NAME}`;
    return () => {
      document.title = SITE_DISPLAY_NAME;
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError('Mật khẩu cần ít nhất 6 ký tự');
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
      <h1>Đăng ký</h1>
      <p className="auth-split-lead">Tạo tài khoản {SITE_DISPLAY_NAME} miễn phí.</p>

      <form onSubmit={handleSubmit} className="form">
        <label className="field">
          <span className="label">Tên hiển thị</span>
          <span className="auth-input">
            <User size={16} className="auth-input-icon" />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tên của bạn"
              autoComplete="name"
            />
          </span>
        </label>
        <label className="field">
          <span className="label">Email</span>
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
          <span className="label">Số điện thoại</span>
          <span className="auth-input">
            <Phone size={16} className="auth-input-icon" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0xxxxxxxxx"
              autoComplete="tel"
              required
            />
          </span>
        </label>
        <label className="field">
          <span className="label">Mật khẩu (≥6 ký tự)</span>
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
          {loading ? 'Đang tạo tài khoản…' : 'Đăng ký'}
        </button>
      </form>

      <div className="auth-links">
        <span>
          Đã có tài khoản? <Link to={loginPathWithNext(nextPath)}>Đăng nhập</Link>
        </span>
        <span className="auth-legal-note">
          Bằng việc đăng ký, bạn đồng ý{' '}
          <Link to="/terms">Điều khoản dịch vụ</Link> và{' '}
          <Link to="/privacy">Chính sách bảo mật</Link>.
        </span>
      </div>
    </AuthSplitLayout>
  );
}
