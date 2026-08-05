import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Coins, Folder, GitBranch, Moon, Plus, Search, Trash2 } from 'lucide-react';
import BrandLogo from '../BrandLogo';
import { getCreditsAi, getDisplayUser } from '../../services/authStore';
import { loadProjects, type Project } from '../../services/projectStore';
import { resolveChatAgent } from '../../services/chatAgents';
import {
  formatSessionTime,
  type ChatSessionSummary,
} from '../../services/chatSessionsLocal';
import { SITE_BRAND_LABEL } from '../../services/siteConfig';

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
  const [query, setQuery] = useState('');
  const user = getDisplayUser();
  const credits = getCreditsAi();
  const agent = resolveChatAgent(agentId);
  const projects: Project[] = loadProjects();
  const defaultProject = projects[0];

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
          aria-label="Đóng menu"
          onClick={onCloseMobile}
        />
      )}
      <aside
        className={`chat-sidebar${mobileOpen ? ' chat-sidebar--open' : ''}`}
        role="navigation"
        aria-label="Chat sidebar"
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
              placeholder="Tìm kiếm đoạn chat"
              aria-label="Tìm kiếm đoạn chat"
            />
          </div>
          <button
            type="button"
            className="chat-sidebar-search-new"
            title="Chat mới"
            aria-label="Chat mới"
            onClick={onNewChat}
          >
            <Plus size={16} />
          </button>
        </div>

        <Link to="/workflow" className="chat-sidebar-wfl" onClick={onCloseMobile}>
          <GitBranch size={15} />
          Auto Workflow
        </Link>

        <div className="chat-sidebar-section">
          <p className="chat-sidebar-section-label">DỰ ÁN</p>
          <div className="chat-sidebar-section-item">
            <Folder size={14} />
            <span>{defaultProject?.name ?? 'Mặc định'}</span>
          </div>
        </div>

        <div className="chat-sidebar-section">
          <p className="chat-sidebar-section-label">AGENT</p>
          <div className="chat-sidebar-section-item active">
            <Moon size={14} />
            <span>{agent.name}</span>
          </div>
        </div>

        <div className="chat-sidebar-section chat-sidebar-section--grow">
          <p className="chat-sidebar-section-label">GẦN ĐÂY</p>
          <div className="chat-sidebar-list" role="list">
            {filtered.length === 0 ? (
              <p className="chat-sidebar-empty">
                {query ? 'Không tìm thấy cuộc trò chuyện.' : 'Chưa có lịch sử chat.'}
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
                    <span className="chat-sidebar-item-time">{formatSessionTime(s.updatedAt)}</span>
                  </button>
                  <button
                    type="button"
                    className="chat-sidebar-item-del"
                    aria-label="Xóa cuộc trò chuyện"
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
            <span>{credits.toLocaleString('vi-VN')}</span>
          </div>
        </footer>
      </aside>
    </>
  );
}
