import type { ReactNode } from 'react';
import { Globe, X } from 'lucide-react';
import { AUTH_SPLIT_IMAGE } from '../../lib/authUiConfig';
import { useLocale } from '../../i18n';
import BrandLogo from '../BrandLogo';
import '../../styles/auth-split.css';

interface Props {
  children: ReactNode;
  onClose?: () => void;
}

export default function AuthSplitLayout({ children, onClose }: Props) {
  const { t, locale, toggleLocale } = useLocale();

  return (
    <div className="app-magnific auth-split-page">
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
          <h2>{t('auth.split.headline')}</h2>
          <p>{t('auth.split.lead')}</p>
        </div>
      </aside>

      <main className="auth-split-panel">
        <button
          type="button"
          className="lang-pill auth-split-lang"
          aria-label={t('header.switchLang')}
          onClick={toggleLocale}
        >
          <Globe size={14} /> {locale === 'vi' ? 'VI' : 'EN'}
        </button>

        {onClose ? (
          <button
            type="button"
            className="auth-split-close"
            onClick={onClose}
            aria-label={t('auth.split.close')}
          >
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
