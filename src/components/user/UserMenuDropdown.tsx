import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  clearAuth,
  getDisplayUser,
} from '../../services/authStore';
import { loadTheme, saveTheme, type ThemeMode } from '../../services/themeStore';
import { loadSettings, saveSettings } from '../../services/settingsStore';

const EXTERNAL = {
  community: 'https://discord.gg/',
  support: 'https://79ai.net/support',
  referral: 'https://79ai.net/referral',
  changelog: 'https://79ai.net/changelog',
};

interface Props {
  credits: number;
  onCreditsRefresh?: () => void;
}

export default function UserMenuDropdown({ credits, onCreditsRefresh }: Props) {
  const navigate = useNavigate();
  const user = getDisplayUser();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(loadTheme());
  const [projectId, setProjectId] = useState(loadSettings().projectId);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  function logout() {
    clearAuth();
    navigate('/login');
  }

  function toggleTheme() {
    const next: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    saveTheme(next);
    setTheme(next);
  }

  function handleProjectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    setProjectId(v);
    saveSettings({ projectId: v });
  }

  const handle = user.username ? `@${user.username}` : user.email;

  return (
    <div className="user-menu-root" ref={rootRef}>
      <button
        type="button"
        className="user-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {user.avatar ? (
          <img src={user.avatar} alt="" className="user-menu-avatar" />
        ) : (
          <span className="user-menu-avatar user-menu-avatar-fallback" />
        )}
      </button>

      {open && (
        <div className="user-menu-panel">
          <div className="user-menu-head">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="user-menu-head-avatar" />
            ) : (
              <span className="user-menu-head-avatar user-menu-avatar-fallback" />
            )}
            <div>
              <div className="user-menu-name">{user.name || user.email || 'User'}</div>
              <div className="user-menu-handle">{handle}</div>
            </div>
          </div>

          <button
            type="button"
            className="user-menu-balance"
            onClick={() => { onCreditsRefresh?.(); setOpen(false); }}
          >
            <span className="user-menu-balance-left">
              <span className="user-menu-icon">💰</span>
              Số dư
            </span>
            <strong>{credits.toLocaleString('vi-VN')}</strong>
          </button>

          <div className="user-menu-section">
            <div className="user-menu-section-head">
              <span>DỰ ÁN</span>
              <button type="button" className="user-menu-link-btn" disabled title="Sắp có">
                + Mới
              </button>
            </div>
            <select
              className="user-menu-select"
              value={projectId}
              onChange={handleProjectChange}
            >
              <option value={projectId}>{projectId}</option>
              {projectId !== 'default' && <option value="default">default</option>}
            </select>
          </div>

          <div className="user-menu-section user-menu-theme-row">
            <span>GIAO DIỆN</span>
            <button type="button" className="user-menu-theme-btn" onClick={toggleTheme}>
              {theme === 'dark' ? '☀ Sáng' : '🌙 Tối'}
            </button>
          </div>

          <nav className="user-menu-nav">
            <Link to="/profile" className="user-menu-item" onClick={() => setOpen(false)}>
              <span>👤</span> Xem hồ sơ
            </Link>
            <Link to="/usage-history" className="user-menu-item" onClick={() => setOpen(false)}>
              <span>🕐</span> Lịch sử sử dụng
            </Link>
            <Link to="/account" className="user-menu-item" onClick={() => setOpen(false)}>
              <span>🛡</span> Quản lý tài khoản
            </Link>
            <Link to="/settings" className="user-menu-item" onClick={() => setOpen(false)}>
              <span>⚙</span> Cài đặt
            </Link>
            <a href={EXTERNAL.community} target="_blank" rel="noreferrer" className="user-menu-item">
              <span>👥</span> Tham gia cộng đồng
            </a>
            <a href={EXTERNAL.support} target="_blank" rel="noreferrer" className="user-menu-item">
              <span>❓</span> Trung tâm hỗ trợ
            </a>
            <a href={EXTERNAL.referral} target="_blank" rel="noreferrer" className="user-menu-item">
              <span>🎁</span> Giới thiệu bạn bè
            </a>
            <a href={EXTERNAL.changelog} target="_blank" rel="noreferrer" className="user-menu-item">
              <span>📋</span> Changelog
            </a>
          </nav>

          <button type="button" className="user-menu-logout" onClick={logout}>
            <span>🚪</span> Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
