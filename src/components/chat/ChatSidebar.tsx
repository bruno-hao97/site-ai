import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Coins, Folder, GitBranch, Moon, Plus, Search, Trash2 } from 'lucide-react';
import BrandLogo from '../BrandLogo';
import { getCreditsAi, getDisplayUser } from '../../services/authStore';
import { loadProjects, type Project } from '../../services/projectStore';
import { resolveChatAgent } from '../../services/chatAgents';
import type { ChatSessionSummary } from '../../services/chatSessionsLocal';
import { SITE_BRAND_LABEL } from '../../services/siteConfig';
import { useLocale } from '../../i18n';
import { formatChatSessionTime } from '../../lib/chatPageI18n';

interface Props {
  sessions: ChatSessionSummary[];
  activeSessionId: string;
  agentId: string;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function ChatSidebar({
  sessions,
  activeSessionId,
  agentId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  mobileOpen,
  onCloseMobile,
}: Props) {
  const { t, locale } = useLocale();
  const [query, setQuery] = useState('');
  const user = getDisplayUser();
  const credits = getCreditsAi();
  const agent = resolveChatAgent(agentId);
  const projects: Project[] = loadProjects();
  const defaultProject = projects[0];
  const localeTag = locale === 'vi' ? 'vi-VN' : 'en-US';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => s.title.toLowerCase().includes(q));
  }, [sessions, query]);

  const displayName = user.name || user.username || user.email || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="chat-sidebar-backdrop"
          aria-label={t('chat.sidebar.closeMenu')}
          onClick={onCloseMobile}
        />
      )}
      <aside
        className={`chat-sidebar${mobileOpen ? ' chat-sidebar--open' : ''}`}
        role="navigation"
        aria-label={t('chat.sidebar.aria')}
      >
        <div className="chat-sidebar-head">
          <BrandLogo to="/home" />
        </div>

        <div className="chat-sidebar-search-row">
          <div className="chat-sidebar-search">
            <Search size={15} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('chat.sidebar.searchPlaceholder')}
              aria-label={t('chat.sidebar.searchAria')}
            />
          </div>
          <button
            type="button"
            className="chat-sidebar-search-new"
            title={t('chat.sidebar.newChat')}
            aria-label={t('chat.sidebar.newChat')}
            onClick={onNewChat}
          >
            <Plus size={16} />
          </button>
        </div>

        <Link to="/workflow" className="chat-sidebar-wfl" onClick={onCloseMobile}>
          <GitBranch size={15} />
          {t('chat.sidebar.workflow')}
        </Link>

        <div className="chat-sidebar-section">
          <p className="chat-sidebar-section-label">{t('chat.sidebar.projects')}</p>
          <div className="chat-sidebar-section-item">
            <Folder size={14} />
            <span>{defaultProject?.name ?? t('chat.sidebar.defaultProject')}</span>
          </div>
        </div>

        <div className="chat-sidebar-section">
          <p className="chat-sidebar-section-label">{t('chat.sidebar.agent')}</p>
          <div className="chat-sidebar-section-item active">
            <Moon size={14} />
            <span>{agent.name}</span>
          </div>
        </div>

        <div className="chat-sidebar-section chat-sidebar-section--grow">
          <p className="chat-sidebar-section-label">{t('chat.sidebar.recent')}</p>
          <div className="chat-sidebar-list" role="list">
            {filtered.length === 0 ? (
              <p className="chat-sidebar-empty">
                {query ? t('chat.sidebar.emptySearch') : t('chat.sidebar.emptyHistory')}
              </p>
            ) : (
              filtered.map((s) => (
                <div
                  key={s.sessionId}
                  role="listitem"
                  className={`chat-sidebar-item${s.sessionId === activeSessionId ? ' active' : ''}`}
                >
                  <button
                    type="button"
                    className="chat-sidebar-item-btn"
                    onClick={() => {
                      onSelectSession(s.sessionId);
                      onCloseMobile();
                    }}
                  >
                    <span className="chat-sidebar-item-title">{s.title}</span>
                    <span className="chat-sidebar-item-time">
                      {formatChatSessionTime(s.updatedAt, locale, t)}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="chat-sidebar-item-del"
                    aria-label={t('chat.sidebar.deleteSession')}
                    onClick={() => onDeleteSession(s.sessionId)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <footer className="chat-sidebar-foot">
          <div className="chat-sidebar-user">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="chat-sidebar-avatar" />
            ) : (
              <span className="chat-sidebar-avatar chat-sidebar-avatar--fallback">{initial}</span>
            )}
            <div className="chat-sidebar-user-meta">
              <span className="chat-sidebar-user-name">{user.email || displayName}</span>
              <span className="chat-sidebar-user-brand">{SITE_BRAND_LABEL}</span>
            </div>
          </div>
          <div className="chat-sidebar-credits">
            <Coins size={14} />
            <span>{credits.toLocaleString(localeTag)}</span>
          </div>
        </footer>
      </aside>
    </>
  );
}
