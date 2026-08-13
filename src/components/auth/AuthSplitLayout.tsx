import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import {
  AUTH_SPLIT_ACTIVE_TAB,
  AUTH_SPLIT_HEADLINE,
  AUTH_SPLIT_IMAGE,
  AUTH_SPLIT_LEAD,
  AUTH_SPLIT_TABS,
} from '../../lib/authUiConfig';
import BrandLogo from '../BrandLogo';
import '../../styles/auth-split.css';

interface Props {
  children: ReactNode;
  onClose?: () => void;
}

export default function AuthSplitLayout({ children, onClose }: Props) {
  return (
    <div className="auth-split-page">
      <aside className="auth-split-visual">
        <img
          src={AUTH_SPLIT_IMAGE}
          alt=""
          className="auth-split-photo"
          loading="eager"
          fetchPriority="high"
        />
        <div className="auth-split-visual-overlay" aria-hidden="true" />
        <div className="auth-split-visual-copy">
          <h2>{AUTH_SPLIT_HEADLINE}</h2>
          <p>{AUTH_SPLIT_LEAD}</p>
          <nav className="auth-split-tabs" aria-label="Danh mục sáng tạo">
            {AUTH_SPLIT_TABS.map((tab) => (
              <span
                key={tab}
                className={tab === AUTH_SPLIT_ACTIVE_TAB ? 'active' : undefined}
                aria-current={tab === AUTH_SPLIT_ACTIVE_TAB ? 'true' : undefined}
              >
                {tab}
              </span>
            ))}
          </nav>
        </div>
      </aside>

      <main className="auth-split-panel">
        {onClose ? (
          <button type="button" className="auth-split-close" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        ) : null}

        <div className="auth-split-brand">
          <BrandLogo to="/" variant="mark" />
        </div>

        <div className="auth-split-form">{children}</div>
      </main>
    </div>
  );
}
