import {
  Bot,
  Clapperboard,
  Image as ImageIcon,
  Mic,
  Music,
  Volume2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { JobType } from '../services/api';
import type { TranslationKey } from '../i18n';

export type QuickMenuId = 'chat' | 'video' | 'image' | 'tts' | 'music' | 'audio';

export type QuickCreateJobType = Extract<JobType, 'video' | 'image'>;

export interface HomeQuickMenuItem {
  id: QuickMenuId;
  labelKey: TranslationKey;
  icon: LucideIcon;
  /** Magnific-style subtle tile tint */
  tint: string;
  /** Chỉ video/image — tạo job ngay trên Home quickstart */
  jobType?: QuickCreateJobType;
  /** Các mục còn lại — điều hướng sang trang studio tương ứng */
  href?: string;
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
    href: '/audio',
  },
  {
    id: 'music',
    labelKey: 'home.category.music',
    icon: Music,
    tint: 'rgba(217, 119, 6, 0.14)',
    href: '/music',
  },
  {
    id: 'chat',
    labelKey: 'home.category.chat',
    icon: Bot,
    tint: 'rgba(255, 255, 255, 0.08)',
    href: '/chat',
  },
  {
    id: 'audio',
    labelKey: 'home.category.audio',
    icon: Mic,
    tint: 'rgba(219, 39, 119, 0.12)',
    href: '/audio',
  },
];
