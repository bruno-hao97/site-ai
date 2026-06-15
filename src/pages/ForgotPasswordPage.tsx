import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../services/backendApi';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [resetUrl, setResetUrl] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setResetUrl('');
    try {
      const data = await forgotPassword(email);
      setMessage(data.message);
      if (data.reset_url) setResetUrl(data.reset_url);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page auth-page">
      <div className="auth-card panel">
        <h1>Quên mật khẩu</h1>
        <p className="lead">Nhập email đăng ký. Dev: link reset hiện bên dưới.</p>
        <form onSubmit={handleSubmit} className="form">
          <label className="field">
            <span className="label">Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? 'Đang gửi…' : 'Gửi link đặt lại'}
          </button>
        </form>
        {message && <p className="notice">{message}</p>}
        {resetUrl && (
          <p className="reset-link-box">
            <span className="label">Link reset (dev):</span>
            <a href={resetUrl}>{resetUrl}</a>
          </p>
        )}
        <p className="auth-footer">
          <Link to="/login">← Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
