import {
  Bot,
  Clapperboard,
  FileText,
  Image as ImageIcon,
  LayoutGrid,
  Mic,
  Music,
  Volume2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { JobType } from '../services/api';
import type { TranslationKey } from '../i18n';

export type QuickMenuId = 'chat' | 'script' | 'video' | 'image' | 'tts' | 'music' | 'audio' | 'apps';

export interface HomeQuickMenuItem {
  id: QuickMenuId;
  labelKey: TranslationKey;
  icon: LucideIcon;
  /** Magnific-style subtle tile tint */
  tint: string;
  jobType?: JobType;
  href?: string;
  action?: 'open-chat';
  fixedCount?: number;
}

export const HOME_QUICK_MENU: HomeQuickMenuItem[] = [
  {
    id: 'video',
    labelKey: 'home.category.video',
    icon: Clapperboard,
    tint: 'rgba(124, 58, 237, 0.14)',
    jobType: 'video',
  },
  {
    id: 'image',
    labelKey: 'home.category.image',
    icon: ImageIcon,
    tint: 'rgba(37, 99, 235, 0.14)',
    jobType: 'image',
  },
  {
    id: 'tts',
    labelKey: 'home.category.tts',
    icon: Volume2,
    tint: 'rgba(234, 88, 12, 0.14)',
    jobType: 'tts',
  },
  {
    id: 'music',
    labelKey: 'home.category.music',
    icon: Music,
    tint: 'rgba(217, 119, 6, 0.14)',
    jobType: 'music',
  },
  {
    id: 'chat',
    labelKey: 'home.category.chat',
    icon: Bot,
    tint: 'rgba(255, 255, 255, 0.08)',
    action: 'open-chat',
    fixedCount: 1,
  },
  {
    id: 'audio',
    labelKey: 'home.category.audio',
    icon: Mic,
    tint: 'rgba(219, 39, 119, 0.12)',
    href: '/audio',
    fixedCount: 1,
  },
  {
    id: 'script',
    labelKey: 'home.category.script',
    icon: FileText,
    tint: 'rgba(5, 150, 105, 0.12)',
    href: '/video',
    fixedCount: 1,
  },
  {
    id: 'apps',
    labelKey: 'home.category.apps',
    icon: LayoutGrid,
    tint: 'rgba(8, 145, 178, 0.12)',
    href: '/workflow',
    fixedCount: 1,
  },
];
