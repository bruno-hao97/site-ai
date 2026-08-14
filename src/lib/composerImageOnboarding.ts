import { ImageIcon } from 'lucide-react';
import { feedThumb, type FeedItem } from '../services/feedApi';
import type { ComposerStudioOnboardingConfig } from './composerOnboardingTypes';

export type {
  ComposerOnboardingSlide,
  ComposerStarterPrompt,
} from './composerOnboardingTypes';

function isImageFeedItem(item: FeedItem): boolean {
  const type = (item.type || '').toLowerCase();
  return type === 'image' || type === '';
}

export const COMPOSER_IMAGE_ONBOARDING_CONFIG: ComposerStudioOnboardingConfig = {
  ariaTitleKey: 'composer.onboarding.title',
  titleKey: 'composer.onboarding.title',
  subtitleKey: 'composer.onboarding.subtitle',
  featuredEmptyKey: 'composer.onboarding.featuredEmpty',
  headIcon: ImageIcon,
  feedFilter: (item) => isImageFeedItem(item) && Boolean(feedThumb(item)),
  slides: [
    {
      titleKey: 'composer.onboarding.slide1.title',
      bodyKey: 'composer.onboarding.slide1.body',
      image: '/onboarding/image-slide-1.png',
    },
    {
      titleKey: 'composer.onboarding.slide2.title',
      bodyKey: 'composer.onboarding.slide2.body',
      image: '/onboarding/image-slide-2.png',
    },
    {
      titleKey: 'composer.onboarding.slide3.title',
      bodyKey: 'composer.onboarding.slide3.body',
      image: '/onboarding/image-slide-3.png',
    },
    {
      titleKey: 'composer.onboarding.slide4.title',
      bodyKey: 'composer.onboarding.slide4.body',
      image: '/onboarding/image-slide-4.png',
    },
  ],
  starters: [
    {
      labelKey: 'composer.onboarding.starter1.label',
      promptKey: 'composer.onboarding.starter1.prompt',
    },
    {
      labelKey: 'composer.onboarding.starter2.label',
      promptKey: 'composer.onboarding.starter2.prompt',
    },
    {
      labelKey: 'composer.onboarding.starter3.label',
      promptKey: 'composer.onboarding.starter3.prompt',
    },
    {
      labelKey: 'composer.onboarding.starter4.label',
      promptKey: 'composer.onboarding.starter4.prompt',
    },
  ],
};

/** @deprecated use COMPOSER_IMAGE_ONBOARDING_CONFIG.slides */
export const COMPOSER_IMAGE_ONBOARDING_SLIDES = COMPOSER_IMAGE_ONBOARDING_CONFIG.slides;
/** @deprecated use COMPOSER_IMAGE_ONBOARDING_CONFIG.starters */
export const COMPOSER_IMAGE_STARTER_PROMPTS = COMPOSER_IMAGE_ONBOARDING_CONFIG.starters;
