import type { LucideIcon } from 'lucide-react';
import {
  Code2,
  GitBranch,
  Image as ImageIcon,
  MessageSquare,
  Mic,
  Music,
  Video,
} from 'lucide-react';
import type { TranslateFn } from '../i18n/LanguageProvider';
import type { TranslationKey } from '../i18n/types';
import type { JobType } from '../services/api';

export interface ResolvedProductTab {
  id: string;
  label: string;
  kicker: string;
  headline: string;
  lead: string;
  icon: LucideIcon;
  mockLabel: string;
  badge?: string;
  features: { title: string; desc: string }[];
}

export interface ResolvedCategoryItem {
  id: string;
  label: string;
  icon: LucideIcon;
  types: readonly JobType[];
}

const PRODUCT_TAB_DEFS: Array<{
  id: string;
  labelKey: TranslationKey;
  kickerKey: TranslationKey;
  headlineKey: TranslationKey;
  leadKey: TranslationKey;
  mockLabelKey: TranslationKey;
  badgeKey?: TranslationKey;
  icon: LucideIcon;
  featureKeys: Array<{ titleKey: TranslationKey; descKey: TranslationKey }>;
}> = [
  {
    id: 'chat',
    labelKey: 'landing.product.chat.label',
    kickerKey: 'landing.product.chat.kicker',
    headlineKey: 'landing.product.chat.headline',
    leadKey: 'landing.product.chat.lead',
    mockLabelKey: 'landing.product.chat.mockLabel',
    icon: MessageSquare,
    featureKeys: [
      { titleKey: 'landing.product.chat.f1.title', descKey: 'landing.product.chat.f1.desc' },
      { titleKey: 'landing.product.chat.f2.title', descKey: 'landing.product.chat.f2.desc' },
      { titleKey: 'landing.product.chat.f3.title', descKey: 'landing.product.chat.f3.desc' },
      { titleKey: 'landing.product.chat.f4.title', descKey: 'landing.product.chat.f4.desc' },
    ],
  },
  {
    id: 'image',
    labelKey: 'landing.product.image.label',
    kickerKey: 'landing.product.image.kicker',
    headlineKey: 'landing.product.image.headline',
    leadKey: 'landing.product.image.lead',
    mockLabelKey: 'landing.product.image.mockLabel',
    icon: ImageIcon,
    featureKeys: [
      { titleKey: 'landing.product.image.f1.title', descKey: 'landing.product.image.f1.desc' },
      { titleKey: 'landing.product.image.f2.title', descKey: 'landing.product.image.f2.desc' },
      { titleKey: 'landing.product.image.f3.title', descKey: 'landing.product.image.f3.desc' },
      { titleKey: 'landing.product.image.f4.title', descKey: 'landing.product.image.f4.desc' },
    ],
  },
  {
    id: 'video',
    labelKey: 'landing.product.video.label',
    kickerKey: 'landing.product.video.kicker',
    headlineKey: 'landing.product.video.headline',
    leadKey: 'landing.product.video.lead',
    mockLabelKey: 'landing.product.video.mockLabel',
    icon: Video,
    featureKeys: [
      { titleKey: 'landing.product.video.f1.title', descKey: 'landing.product.video.f1.desc' },
      { titleKey: 'landing.product.video.f2.title', descKey: 'landing.product.video.f2.desc' },
      { titleKey: 'landing.product.video.f3.title', descKey: 'landing.product.video.f3.desc' },
      { titleKey: 'landing.product.video.f4.title', descKey: 'landing.product.video.f4.desc' },
    ],
  },
  {
    id: 'audio',
    labelKey: 'landing.product.audio.label',
    kickerKey: 'landing.product.audio.kicker',
    headlineKey: 'landing.product.audio.headline',
    leadKey: 'landing.product.audio.lead',
    mockLabelKey: 'landing.product.audio.mockLabel',
    icon: Mic,
    featureKeys: [
      { titleKey: 'landing.product.audio.f1.title', descKey: 'landing.product.audio.f1.desc' },
      { titleKey: 'landing.product.audio.f2.title', descKey: 'landing.product.audio.f2.desc' },
    ],
  },
  {
    id: 'workflow',
    labelKey: 'landing.product.workflow.label',
    kickerKey: 'landing.product.workflow.kicker',
    headlineKey: 'landing.product.workflow.headline',
    leadKey: 'landing.product.workflow.lead',
    mockLabelKey: 'landing.product.workflow.mockLabel',
    badgeKey: 'landing.product.workflow.badge',
    icon: GitBranch,
    featureKeys: [
      { titleKey: 'landing.product.workflow.f1.title', descKey: 'landing.product.workflow.f1.desc' },
      { titleKey: 'landing.product.workflow.f2.title', descKey: 'landing.product.workflow.f2.desc' },
      { titleKey: 'landing.product.workflow.f3.title', descKey: 'landing.product.workflow.f3.desc' },
    ],
  },
];

const CATEGORY_DEFS: Array<{
  id: string;
  labelKey: TranslationKey;
  icon: LucideIcon;
  types: readonly JobType[];
}> = [
  { id: 'image', labelKey: 'landing.categories.items.image', icon: ImageIcon, types: ['image'] },
  { id: 'video', labelKey: 'landing.categories.items.video', icon: Video, types: ['video', 'avatar-lipsync'] },
  { id: 'tts', labelKey: 'landing.categories.items.tts', icon: Mic, types: ['tts'] },
  { id: 'music', labelKey: 'landing.categories.items.music', icon: Music, types: ['music'] },
  { id: 'chat', labelKey: 'landing.categories.items.chat', icon: MessageSquare, types: [] },
  { id: 'workflow', labelKey: 'landing.categories.items.workflow', icon: Code2, types: [] },
];

const HERO_CAPABILITY_KEYS: TranslationKey[] = [
  'landing.hero.cap.imageCreate',
  'landing.hero.cap.imageEdit',
  'landing.hero.cap.textToVideo',
  'landing.hero.cap.imageToVideo',
  'landing.hero.cap.avatarLipsync',
  'landing.hero.cap.upscale4k',
  'landing.hero.cap.tts',
  'landing.hero.cap.musicCreate',
  'landing.hero.cap.workflow',
  'landing.hero.cap.multiModelChat',
  'landing.hero.cap.imageAnalysis',
  'landing.hero.cap.removeBg',
];

export function getProductTabs(t: TranslateFn): ResolvedProductTab[] {
  return PRODUCT_TAB_DEFS.map((tab) => ({
    id: tab.id,
    label: t(tab.labelKey),
    kicker: t(tab.kickerKey),
    headline: t(tab.headlineKey),
    lead: t(tab.leadKey),
    mockLabel: t(tab.mockLabelKey),
    badge: tab.badgeKey ? t(tab.badgeKey) : undefined,
    icon: tab.icon,
    features: tab.featureKeys.map((f) => ({
      title: t(f.titleKey),
      desc: t(f.descKey),
    })),
  }));
}

export function getCategoryItems(t: TranslateFn): ResolvedCategoryItem[] {
  return CATEGORY_DEFS.map((item) => ({
    id: item.id,
    label: t(item.labelKey),
    icon: item.icon,
    types: item.types,
  }));
}

export function getHeroCapabilities(t: TranslateFn): string[] {
  return HERO_CAPABILITY_KEYS.map((key) => t(key));
}

export function getNavLinks(t: TranslateFn) {
  return [
    { href: '/#product', label: t('landing.nav.features') },
    { to: '/models', label: t('landing.nav.models') },
    { href: '/#community', label: t('landing.nav.explore') },
    { to: '/pricing', label: t('landing.nav.pricing') },
  ] as const;
}
