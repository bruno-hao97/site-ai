import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../services/backendApi';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (!token) {
      setError('Thiếu token trong URL');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await resetPassword(token, password);
      setNotice(data.message);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="page auth-page">
        <div className="auth-card panel">
          <h1>Link không hợp lệ</h1>
          <p className="error">Thiếu token. Yêu cầu link mới từ <Link to="/forgot-password">Quên mật khẩu</Link>.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page auth-page">
      <div className="auth-card panel">
        <h1>Đặt lại mật khẩu</h1>
        <form onSubmit={handleSubmit} className="form">
          <label className="field">
            <span className="label">Mật khẩu mới (≥6 ký tự)</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </label>
          <label className="field">
            <span className="label">Xác nhận mật khẩu</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={6}
              required
            />
          </label>
          {error && <p className="error">{error}</p>}
          {notice && <p className="notice">{notice}</p>}
          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? 'Đang lưu…' : 'Đặt mật khẩu'}
          </button>
        </form>
      </div>
    </div>
  );
}
