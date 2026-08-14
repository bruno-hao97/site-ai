import type { LucideIcon } from 'lucide-react';
import type { TranslationKey } from '../i18n';
import type { FeedItem } from '../services/feedApi';

export interface ComposerOnboardingSlide {
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  image: string;
}

export interface ComposerStarterPrompt {
  labelKey: TranslationKey;
  promptKey: TranslationKey;
}

export interface ComposerStudioOnboardingConfig {
  ariaTitleKey: TranslationKey;
  titleKey: TranslationKey;
  subtitleKey: TranslationKey;
  featuredEmptyKey: TranslationKey;
  slides: ComposerOnboardingSlide[];
  starters: ComposerStarterPrompt[];
  feedFilter: (item: FeedItem) => boolean;
  headIcon: LucideIcon;
}
