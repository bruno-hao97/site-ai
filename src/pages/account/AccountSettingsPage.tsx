import { FormEvent, useState } from 'react';
import { getDisplayUser, getUpstreamMe } from '../../services/authStore';

export default function AccountSettingsPage() {
  const user = getDisplayUser();
  const me = getUpstreamMe();
  const [name, setName] = useState(user.name || '');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  function handleProfile(e: FormEvent) {
    e.preventDefault();
    setNotice('');
    setError('');
    setNotice('Cập nhật hồ sơ upstream sẽ có khi tích hợp API Gommo user.update.');
  }

  function handlePassword(e: FormEvent) {
    e.preventDefault();
    setNotice('');
    setError('');
    if (newPw !== confirmPw) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (newPw.length < 6) {
      setError('Mật khẩu mới tối thiểu 6 ký tự.');
      return;
    }
    setNotice('Đổi mật khẩu cần đăng nhập email/password trên vmedia.ai — hiện app dùng Access Token.');
    void currentPw;
  }

  return (
    <div className="account-settings">
      <h1 className="account-content-title">⚙ CÀI ĐẶT TÀI KHOẢN</h1>

      <section className="panel account-card">
        <h2>👤 Thông tin hồ sơ</h2>
        <form onSubmit={handleProfile} className="form account-form">
          <label className="field">
            <span className="label">TÊN HIỂN THỊ</span>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            <span className="label">ĐỊA CHỈ EMAIL</span>
            <input value={user.email || me?.userInfo?.email || ''} readOnly />
          </label>
        </form>
      </section>

      <section className="panel account-card">
        <h2>🔑 Đổi mật khẩu</h2>
        <form onSubmit={handlePassword} className="form account-form">
          <label className="field">
            <span className="label">MẬT KHẨU HIỆN TẠI</span>
            <input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <label className="field">
            <span className="label">MẬT KHẨU MỚI</span>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          <label className="field">
            <span className="label">XÁC NHẬN MẬT KHẨU</span>
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          <button type="submit" className="btn account-teal-btn">
            Cập nhật mật khẩu
          </button>
        </form>
      </section>

      {notice && <p className="notice">{notice}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
