import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { Globe, Menu } from 'lucide-react';
import {
  clearAuth,
  getCreditsAi,
  isLoggedIn,
  loadAuth,
  refreshSession,
} from './services/authStore';
import { UpstreamMeError } from './services/upstreamMe';
import { setupOneSignalFromAuth } from './services/oneSignal';
import { applyTheme } from './services/themeStore';
import { prefetchStudioModels } from './lib/studioModelPrefetch';
import { STUDIO_COMPOSER_PATHS } from './lib/studioRoutes';
import { useCreditsUpdated } from './hooks/useCreditsUpdated';
import { resumeAllPendingJobs } from './services/pendingJobRunner';
import ComposerShell from './pages/ComposerShell';
import AppSidebar from './components/AppSidebar';
import BrandLogo from './components/BrandLogo';
import ProtectedRoute from './components/ProtectedRoute';
import QuickChatWidget from './components/QuickChatWidget';
import UserMenuDropdown from './components/user/UserMenuDropdown';
import LandingPage from './pages/LandingPage';
import ModelsPage from './pages/ModelsPage';
import PublicPricingPage from './pages/PublicPricingPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import LegalShellLayout from './components/legal/LegalShellLayout';
import HomePage from './pages/HomePage';
import ProjectsPage from './pages/ProjectsPage';
import LibraryPage from './pages/LibraryPage';
import WorkflowPage from './pages/WorkflowPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AudioPage from './pages/AudioPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import SettingsTokensPage from './pages/SettingsTokensPage';
import UsageHistoryPage from './pages/UsageHistoryPage';
import StudioHistoryPage from './pages/StudioHistoryPage';
import ApiPlaygroundPage from './pages/ApiPlaygroundPage';
import DashboardPage from './pages/DashboardPage';
import WalletPage from './pages/WalletPage';
import ChatPage from './pages/ChatPage';
import AccountLayout from './pages/account/AccountLayout';
import AccountSettingsPage from './pages/account/AccountSettingsPage';
import AccountPromoPage from './pages/account/AccountPromoPage';
import AccountSubscriptionPage from './pages/account/AccountSubscriptionPage';
import AccountTransferPage from './pages/account/AccountTransferPage';
import AccountTransactionsPage from './pages/account/AccountTransactionsPage';
import { useLocale } from './i18n';

const STUDIO_NAV = STUDIO_COMPOSER_PATHS;

function StudioHistoryRedirect() {
  const { type } = useParams<{ type: string }>();
  return <Navigate to={type ? `/studio-history/${type}` : '/studio-history'} replace />;
}

function AppHeader({ slim = false, onOpenSidebar }: { slim?: boolean; onOpenSidebar?: () => void }) {
  const { t, locale, toggleLocale } = useLocale();
  const [credits, setCredits] = useState(getCreditsAi());
  const loggedIn = isLoggedIn();

  function refreshCredits() {
    if (!loadAuth()) return;
    refreshSession()
      .then((s) => setCredits(s.upstream_me.balancesInfo?.credits_ai ?? 0))
      .catch((err) => {
        if (err instanceof UpstreamMeError && (err.status === 401 || err.status === 403)) {
          clearAuth();
          window.location.href = '/login';
        }
      });
  }

  useEffect(() => {
    if (!loggedIn) return;
    refreshCredits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  useCreditsUpdated(() => {
    if (loggedIn) refreshCredits();
  });

  return (
    <header className={`app-header${slim ? ' app-header--slim' : ''}`}>
      <div className="app-header-inner">
        {slim && onOpenSidebar && (
          <button
            type="button"
            className="app-shell-menu-btn"
            aria-label={t('header.openMenu')}
            onClick={onOpenSidebar}
          >
            <Menu size={20} />
          </button>
        )}
        {!slim && loggedIn && (
          <button type="button" className="nav-toggle" aria-label={t('header.openMenu')}>
            <Menu size={20} />
          </button>
        )}
        {!slim && <BrandLogo to="/" />}
        {loggedIn ? (
          <div className="header-meta">
            <button
              type="button"
              className="lang-pill"
              aria-label={t('header.switchLang')}
              onClick={toggleLocale}
            >
              <Globe size={14} /> {locale === 'vi' ? 'VI' : 'EN'}
            </button>
            <Link to="/pricing" className={slim ? 'app-header-pricing-link' : 'price-pill'}>
              {t('header.pricing')}
            </Link>
            <div className="header-balance">
              <span className="header-balance-label">{t('header.balance')}</span>
              <span className="header-credit-pill">{credits.toLocaleString('vi-VN')}</span>
            </div>
            <UserMenuDropdown credits={credits} onCreditsRefresh={refreshCredits} />
          </div>
        ) : (
          <nav className="nav">
            <Link to="/login">{t('header.login')}</Link>
          </nav>
        )}
      </div>
    </header>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={isLoggedIn() ? <Navigate to="/home" replace /> : <LandingPage />} />
      <Route path="/featured" element={<Navigate to={{ pathname: '/', hash: 'product' }} replace />} />
      <Route path="/explore" element={<Navigate to={{ pathname: '/', hash: 'community' }} replace />} />
      <Route path="/models" element={<ModelsPage />} />
      <Route path="/pricing" element={<PublicPricingPage />} />
      <Route element={<LegalShellLayout />}>
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
      </Route>
      <Route path="/login" element={isLoggedIn() ? <Navigate to="/home" /> : <LoginPage />} />
      <Route path="/register" element={isLoggedIn() ? <Navigate to="/home" /> : <RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/workflow" element={<WorkflowPage />} />
        <Route path="/audio" element={<AudioPage />} />
        <Route element={<ComposerShell />}>
          {Object.keys(STUDIO_NAV).map((path) => (
            <Route key={path} path={path} element={null} />
          ))}
        </Route>
        <Route path="/app" element={<Navigate to="/image" replace />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/playground" element={<ApiPlaygroundPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/tokens" element={<SettingsTokensPage />} />
        <Route path="/usage-history" element={<UsageHistoryPage />} />
        <Route path="/usage-history/:type" element={<UsageHistoryPage />} />
        <Route path="/studio-history" element={<StudioHistoryPage />} />
        <Route path="/studio-history/:type" element={<StudioHistoryPage />} />
        <Route path="/history" element={<Navigate to="/studio-history" replace />} />
        <Route path="/history/:type" element={<StudioHistoryRedirect />} />
        <Route path="/account" element={<AccountLayout />}>
          <Route index element={<AccountSettingsPage />} />
          <Route path="promo" element={<AccountPromoPage />} />
          <Route path="subscription" element={<AccountSubscriptionPage />} />
          <Route path="transfer" element={<AccountTransferPage />} />
          <Route path="topup" element={<Navigate to="/pricing" replace />} />
          <Route path="transactions" element={<AccountTransactionsPage />} />
        </Route>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/wallet" element={<WalletPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppShell() {
  const location = useLocation();
  const { t } = useLocale();
  const loggedIn = isLoggedIn();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (loggedIn) void setupOneSignalFromAuth();
  }, [loggedIn]);

  useEffect(() => {
    if (loggedIn) resumeAllPendingJobs();
  }, [loggedIn]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const isBarePage =
    ['/', '/login', '/register'].includes(location.pathname) ||
    (['/privacy', '/terms'].includes(location.pathname) && !loggedIn) ||
    ((location.pathname === '/models' || location.pathname === '/pricing') && !loggedIn);
  const isWorkflow = location.pathname === '/workflow';
  const isChat = location.pathname === '/chat';
  const isHome = location.pathname === '/home';
  const isProjects = location.pathname === '/projects';
  const isLibrary = location.pathname === '/library';
  const isAccount = location.pathname.startsWith('/account');
  const isSecondary =
    location.pathname === '/dashboard' ||
    location.pathname === '/wallet' ||
    location.pathname === '/profile' ||
    location.pathname === '/playground' ||
    location.pathname === '/models' ||
    location.pathname === '/privacy' ||
    location.pathname === '/terms' ||
    location.pathname.startsWith('/settings') ||
    location.pathname.startsWith('/usage-history') ||
    location.pathname.startsWith('/studio-history');
  const isAppShell = loggedIn && !isBarePage;

  useEffect(() => {
    if (!isAppShell) return;
    applyTheme('dark');
  }, [isAppShell]);

  useEffect(() => {
    if (!loggedIn || !isAppShell) return;
    prefetchStudioModels();
  }, [loggedIn, isAppShell]);
  const isFullBleed =
    location.pathname in STUDIO_NAV ||
    location.pathname === '/audio' ||
    isWorkflow ||
    isChat;
  const hideHeader = isBarePage || isWorkflow || isChat;
  const showQuickChat = isLoggedIn() && !isBarePage && !isWorkflow && !isChat && !isHome;

  const mainClass = [
    !isBarePage && 'app-main',
    isFullBleed && 'app-main-full',
    isWorkflow && 'app-main-workflow',
    isChat && 'app-main-chat',
    isHome && 'app-main-home',
    isProjects && 'app-main-projects',
    isLibrary && 'app-main-library',
    isAccount && 'app-main-account',
    isSecondary && 'app-main-secondary',
  ]
    .filter(Boolean)
    .join(' ');

  if (isAppShell) {
    return (
      <div className={`app app-magnific${isAccount ? ' app-magnific--account' : ''}`}>
        {!isAccount && (
          <AppSidebar mobileOpen={sidebarOpen} onCloseMobile={() => setSidebarOpen(false)} />
        )}
        {hideHeader && (
          <button
            type="button"
            className="app-shell-floating-menu"
            aria-label={t('header.openMenu')}
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>
        )}
        <div className={`app-shell-body${isAccount ? ' app-shell-body--full' : ''}`}>
          <div className="app-shell-panel">
            {!hideHeader && (
              <AppHeader slim onOpenSidebar={() => setSidebarOpen(true)} />
            )}
            <main className={mainClass}>
              <AppRoutes />
            </main>
          </div>
        </div>
        {showQuickChat && <QuickChatWidget />}
      </div>
    );
  }

  return (
    <div className={isBarePage ? '' : 'app'}>
      {!hideHeader && <AppHeader />}
      <main className={isBarePage ? '' : mainClass}>
        <AppRoutes />
      </main>
      {showQuickChat && <QuickChatWidget />}
    </div>
  );
}

export default function App() {
  return <AppShell />;
}
