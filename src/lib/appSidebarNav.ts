/**
 * App rail IA (Magnific-style)
 *
 * ON RAIL — primary app destinations (9):
 *   Home, Projects, Library, Models, Image, Video, Audio, Music, Chat, Workflow
 *
 * NOT ON RAIL — secondary (user menu / home categories):
 *   Settings, Profile, Dashboard, Wallet, Account, Usage history
 *
 * Create (+) — quick entry to home composer
 */
import {
  Clapperboard,
  FolderOpen,
  GitBranch,
  Home,
  Image as ImageIcon,
  LayoutGrid,
  Library,
  MessageSquare,
  Mic,
  Music,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TranslationKey } from '../i18n';

export interface AppSidebarNavItem {
  to: string;
  labelKey: TranslationKey;
  icon: LucideIcon;
  end?: boolean;
}

export const APP_SIDEBAR_PRIMARY: AppSidebarNavItem[] = [
  { to: '/home', labelKey: 'nav.home', icon: Home, end: true },
  { to: '/projects', labelKey: 'nav.projects', icon: FolderOpen },
  { to: '/library', labelKey: 'nav.library', icon: Library },
  { to: '/models', labelKey: 'nav.models', icon: LayoutGrid },
  { to: '/image', labelKey: 'nav.image', icon: ImageIcon },
  { to: '/video', labelKey: 'nav.video', icon: Clapperboard },
  { to: '/audio', labelKey: 'nav.audio', icon: Mic },
  { to: '/music', labelKey: 'nav.music', icon: Music },
  { to: '/chat', labelKey: 'nav.chat', icon: MessageSquare },
  { to: '/workflow', labelKey: 'nav.workflow', icon: GitBranch },
];

/** Offset for fixed floating rail (width + left margin + gap) */
export const APP_RAIL_OFFSET_PX = 100;
