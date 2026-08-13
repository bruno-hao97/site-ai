import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Mail, Phone } from 'lucide-react';
import {
  SITE_SUPPORT_EMAIL,
  SITE_SUPPORT_PHONE,
  SITE_SUPPORT_PHONE_LABEL,
} from '../../services/siteConfig';

interface Props {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}

export default function LegalDocument({ title, icon: Icon, children }: Props) {
  return (
    <article className="legal-card">
      <header className="legal-card-head">
        <span className="legal-card-icon" aria-hidden>
          <Icon size={22} />
        </span>
        <h1>{title}</h1>
      </header>

      {children}

      <footer className="legal-contact">
        <p className="legal-contact-label">Liên hệ hỗ trợ</p>
        <div className="legal-contact-row">
          <a className="legal-contact-item" href={`tel:${SITE_SUPPORT_PHONE}`}>
            <Phone size={16} />
            {SITE_SUPPORT_PHONE_LABEL}
          </a>
          <a className="legal-contact-item" href={`mailto:${SITE_SUPPORT_EMAIL}`}>
            <Mail size={16} />
            {SITE_SUPPORT_EMAIL}
          </a>
        </div>
      </footer>
    </article>
  );
}
