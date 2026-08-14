import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import type { JobType } from '../services/api';
import type { TranslationKey } from '../i18n';
import { useLocale } from '../i18n';
import { prefetchStudioModels } from '../lib/studioModelPrefetch';
import { studioTypeFromPath } from '../lib/studioRoutes';

interface Props {
  to: string;
  labelKey: TranslationKey;
  icon: LucideIcon;
  end?: boolean;
  expanded?: boolean;
  onNavigate?: () => void;
}

export default function AppSidebarLink({ to, labelKey, icon: Icon, end, expanded, onNavigate }: Props) {
  const { t } = useLocale();
  const label = t(labelKey);

  const warmModels = () => {
    const type = studioTypeFromPath(to) as JobType | null;
    if (type) prefetchStudioModels([type]);
  };

  return (
    <NavLink
      to={to}
      end={end}
      aria-label={label}
      className={({ isActive }) => `app-sidebar-link${isActive ? ' active' : ''}`}
      onClick={onNavigate}
      onMouseEnter={warmModels}
      onFocus={warmModels}
    >
      <Icon size={22} strokeWidth={1.75} aria-hidden />
      {!expanded && (
        <span className="app-sidebar-tooltip" role="tooltip">
          {label}
        </span>
      )}
      <span className="app-sidebar-link-label">{label}</span>
    </NavLink>
  );
}
