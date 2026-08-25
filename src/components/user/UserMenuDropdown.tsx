import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  clearAuth,
  getDisplayUser,
} from '../../services/authStore';
import { loadTheme, saveTheme, type ThemeMode } from '../../services/themeStore';
import { Check, ChevronDown, CircleHelp, ClipboardList, Clock, CreditCard, Gift, KeyRound, LayoutDashboard, LayoutGrid, LogOut, Moon, Pencil, ScrollText, Settings, Shield, ShieldCheck, Sun, Trash2, User, Users, Wallet } from 'lucide-react';
import { APP_SITE_URL } from '../../services/settingsStore';
import {
  countByProject,
  createProject,
  deleteProject,
  loadProjects,
  onProjectsUpdated,
  updateProject,
  type Project,
} from '../../services/projectStore';
import { useLocale } from '../../i18n';
import type { AppLocale } from '../../i18n/types';

const ICON = { size: 16, strokeWidth: 1.75, className: 'user-menu-item-icon' } as const;

const EXTERNAL = {
  community: 'https://discord.gg/',
  support: `${APP_SITE_URL}/support`,
  referral: `${APP_SITE_URL}/referral`,
  changelog: `${APP_SITE_URL}/changelog`,
};

function numberLocale(locale: AppLocale): string {
  return locale === 'vi' ? 'vi-VN' : 'en-US';
}

interface Props {
  credits: number;
  onCreditsRefresh?: () => void;
}

export default function UserMenuDropdown({ credits, onCreditsRefresh }: Props) {
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const user = getDisplayUser();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(loadTheme());
  const [projects, setProjects] = useState<Project[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

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

  useEffect(() => {
    const refresh = () => {
      setProjects(loadProjects());
      setCounts(countByProject());
    };
    refresh();
    return onProjectsUpdated(refresh);
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

  function handleCreateProject() {
    const name = newName.trim();
    if (!name) return;
    createProject(name);
    setNewName('');
    setCreating(false);
  }

  function openProject(id: string) {
    navigate(`/projects?p=${encodeURIComponent(id)}`);
    setOpen(false);
  }

  function saveProjectEdit(id: string) {
    updateProject(id, { name: editName });
    setEditing(null);
  }

  function handleDeleteProject(p: Project) {
    if (!window.confirm(t('projects.deleteConfirm', { name: p.name }))) {
      return;
    }
    deleteProject(p.id);
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
        <ChevronDown size={14} className={`user-menu-caret ${open ? 'up' : ''}`} />
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
              <Wallet {...ICON} />
              {t('userMenu.balance')}
            </span>
            <strong>{credits.toLocaleString(numberLocale(locale))}</strong>
          </button>

          <div className="user-menu-section">
            <div className="user-menu-section-head">
              <span>{t('userMenu.projectsSection')}</span>
              <button
                type="button"
                className="user-menu-link-btn"
                onClick={() => setCreating((v) => !v)}
              >
                {t('userMenu.newProject')}
              </button>
            </div>

            {creating && (
              <div className="user-menu-proj-create">
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t('projects.newPlaceholder')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateProject();
                    if (e.key === 'Escape') setCreating(false);
                  }}
                />
                <button type="button" onClick={handleCreateProject} aria-label={t('projects.createAria')}>
                  <Check size={15} />
                </button>
              </div>
            )}

            <div className="user-menu-proj-list">
              {projects.length === 0 && !creating && (
                <p className="user-menu-proj-empty">{t('userMenu.projectsEmpty')}</p>
              )}
              {projects.map((p) => (
                <div key={p.id} className="user-menu-proj-item">
                  {editing === p.id ? (
                    <input
                      className="user-menu-proj-edit"
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveProjectEdit(p.id);
                        if (e.key === 'Escape') setEditing(null);
                      }}
                      onBlur={() => saveProjectEdit(p.id)}
                    />
                  ) : (
                    <button
                      type="button"
                      className="user-menu-proj-open"
                      onClick={() => openProject(p.id)}
                    >
                      <span className="user-menu-proj-name">{p.name}</span>
                      <span className="user-menu-proj-count">{counts[p.id] ?? 0}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="user-menu-proj-act"
                    aria-label={t('projects.renameAria')}
                    onClick={() => {
                      setEditing(p.id);
                      setEditName(p.name);
                    }}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    className="user-menu-proj-act danger"
                    aria-label={t('projects.deleteAria')}
                    onClick={() => handleDeleteProject(p)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <Link to="/projects" className="user-menu-proj-manage" onClick={() => setOpen(false)}>
              {t('userMenu.manageProjects')}
            </Link>
          </div>

          <div className="user-menu-section user-menu-theme-row">
            <span>{t('userMenu.appearance')}</span>
            <button type="button" className="user-menu-theme-btn" onClick={toggleTheme}>
              {theme === 'dark' ? (
                <>
                  <Sun {...ICON} /> {t('settings.appearance.light')}
                </>
              ) : (
                <>
                  <Moon {...ICON} /> {t('settings.appearance.dark')}
                </>
              )}
            </button>
          </div>

          <nav className="user-menu-nav">
            <Link to="/dashboard" className="user-menu-item" onClick={() => setOpen(false)}>
              <LayoutDashboard {...ICON} /> {t('userMenu.dashboard')}
            </Link>
            <Link to="/wallet" className="user-menu-item" onClick={() => setOpen(false)}>
              <CreditCard {...ICON} /> {t('wallet.title')}
            </Link>
            <Link to="/profile" className="user-menu-item" onClick={() => setOpen(false)}>
              <User {...ICON} /> {t('userMenu.viewProfile')}
            </Link>
            <Link to="/usage-history" className="user-menu-item" onClick={() => setOpen(false)}>
              <Clock {...ICON} /> {t('usageHistory.title')}
            </Link>
            <Link to="/settings/tokens" className="user-menu-item" onClick={() => setOpen(false)}>
              <KeyRound {...ICON} /> {t('userMenu.accessToken')}
            </Link>
            <Link to="/account" className="user-menu-item" onClick={() => setOpen(false)}>
              <Shield {...ICON} /> {t('userMenu.manageAccount')}
            </Link>
            <Link to="/settings" className="user-menu-item" onClick={() => setOpen(false)}>
              <Settings {...ICON} /> {t('settings.title')}
            </Link>
            <Link to="/models" className="user-menu-item" onClick={() => setOpen(false)}>
              <LayoutGrid {...ICON} /> {t('landing.nav.models')}
            </Link>
            <Link to="/privacy" className="user-menu-item" onClick={() => setOpen(false)}>
              <ShieldCheck {...ICON} /> {t('legal.privacy.pageTitle')}
            </Link>
            <Link to="/terms" className="user-menu-item" onClick={() => setOpen(false)}>
              <ScrollText {...ICON} /> {t('legal.terms.pageTitle')}
            </Link>
            <a href={EXTERNAL.community} target="_blank" rel="noreferrer" className="user-menu-item">
              <Users {...ICON} /> {t('userMenu.community')}
            </a>
            <a href={EXTERNAL.support} target="_blank" rel="noreferrer" className="user-menu-item">
              <CircleHelp {...ICON} /> {t('userMenu.support')}
            </a>
            <a href={EXTERNAL.referral} target="_blank" rel="noreferrer" className="user-menu-item">
              <Gift {...ICON} /> {t('userMenu.referral')}
            </a>
            <a href={EXTERNAL.changelog} target="_blank" rel="noreferrer" className="user-menu-item">
              <ClipboardList {...ICON} /> {t('userMenu.changelog')}
            </a>
          </nav>

          <button type="button" className="user-menu-logout" onClick={logout}>
            <LogOut {...ICON} className="user-menu-item-icon user-menu-item-icon--danger" /> {t('userMenu.logout')}
          </button>
        </div>
      )}
    </div>
  );
}
