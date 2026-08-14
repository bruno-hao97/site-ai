import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, GraduationCap, Plus } from 'lucide-react';
import BrandLogo from './BrandLogo';
import AppSidebarLink from './AppSidebarLink';
import { APP_SIDEBAR_PRIMARY } from '../lib/appSidebarNav';
import { useLocale } from '../i18n';
import { requestPushPermission } from '../services/oneSignal';

interface Props {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const SIDEBAR_EXPANDED_KEY = 'app-sidebar-expanded';

function readSidebarExpanded(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SIDEBAR_EXPANDED_KEY) === '1';
}

export default function AppSidebar({ mobileOpen, onCloseMobile }: Props) {
  const { t } = useLocale();
  const [expanded, setExpanded] = useState(readSidebarExpanded);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_EXPANDED_KEY, expanded ? '1' : '0');
  }, [expanded]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseMobile();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [mobileOpen, onCloseMobile]);

  const handleSidebarShellClick = (e: React.MouseEvent<HTMLElement>) => {
    if (window.matchMedia('(max-width: 768px)').matches) return;
    const target = e.target as HTMLElement;
    if (target.closest('a, button')) return;
    setExpanded((v) => !v);
  };

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="app-sidebar-backdrop"
          aria-label={t('header.openMenu')}
          onClick={onCloseMobile}
        />
      )}
      <aside
        className={`app-sidebar${mobileOpen ? ' app-sidebar--open' : ''}${expanded ? ' app-sidebar--expanded' : ''}`}
        role="navigation"
        aria-label="App navigation"
        aria-expanded={expanded || mobileOpen}
        onClick={handleSidebarShellClick}
      >
        <div className="app-sidebar-top">
          <div className="app-sidebar-brand">
            <BrandLogo to="/home" variant="mark" />
          </div>
          <Link
            to="/home#home-quick-create"
            className="app-sidebar-create"
            aria-label={t('sidebar.create')}
            title={t('sidebar.create')}
            onClick={onCloseMobile}
          >
            <Plus size={20} strokeWidth={2.25} aria-hidden />
            <span className="app-sidebar-link-label">{t('sidebar.create')}</span>
          </Link>
        </div>

        <div className="app-sidebar-divider" aria-hidden />

        <nav className="app-sidebar-nav">
          {APP_SIDEBAR_PRIMARY.map((item) => (
            <AppSidebarLink
              key={item.to}
              {...item}
              expanded={expanded || mobileOpen}
              onNavigate={onCloseMobile}
            />
          ))}
        </nav>

        <div className="app-sidebar-footer">
          <button
            type="button"
            className="app-sidebar-foot-btn"
            aria-label={t('sidebar.academy')}
            title={t('sidebar.academy')}
            onClick={() => {
              onCloseMobile();
              window.dispatchEvent(new CustomEvent('quick-chat:open'));
            }}
          >
            <GraduationCap size={20} strokeWidth={1.75} aria-hidden />
            <span className="app-sidebar-tooltip" role="tooltip">
              {t('sidebar.academy')}
            </span>
            <span className="app-sidebar-link-label">{t('sidebar.academy')}</span>
          </button>
          <button
            type="button"
            className="app-sidebar-foot-btn"
            aria-label={t('sidebar.notifications')}
            title={t('sidebar.notifications')}
            onClick={() => {
              onCloseMobile();
              void requestPushPermission();
            }}
          >
            <Bell size={20} strokeWidth={1.75} aria-hidden />
            <span className="app-sidebar-tooltip" role="tooltip">
              {t('sidebar.notifications')}
            </span>
            <span className="app-sidebar-link-label">{t('sidebar.notifications')}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
