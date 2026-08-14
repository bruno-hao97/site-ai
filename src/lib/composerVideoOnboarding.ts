import { Clapperboard } from 'lucide-react';
import { feedThumb, type FeedItem } from '../services/feedApi';
import type { ComposerStudioOnboardingConfig } from './composerOnboardingTypes';

function isVideoFeedItem(item: FeedItem): boolean {
  const type = (item.type || '').toLowerCase();
  if (type === 'video' || type === 'avatar-lipsync') return true;
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(item.url || item.download_url || '');
}

export const COMPOSER_VIDEO_ONBOARDING_CONFIG: ComposerStudioOnboardingConfig = {
  ariaTitleKey: 'composer.videoOnboarding.title',
  titleKey: 'composer.videoOnboarding.title',
  subtitleKey: 'composer.videoOnboarding.subtitle',
  featuredEmptyKey: 'composer.videoOnboarding.featuredEmpty',
  headIcon: Clapperboard,
  feedFilter: (item) => isVideoFeedItem(item) && Boolean(feedThumb(item)),
  slides: [
    {
      titleKey: 'composer.videoOnboarding.slide1.title',
      bodyKey: 'composer.videoOnboarding.slide1.body',
      image: '/onboarding/video-slide-1.png',
    },
    {
      titleKey: 'composer.videoOnboarding.slide2.title',
      bodyKey: 'composer.videoOnboarding.slide2.body',
      image: '/onboarding/video-slide-2.png',
    },
    {
      titleKey: 'composer.videoOnboarding.slide3.title',
      bodyKey: 'composer.videoOnboarding.slide3.body',
      image: '/onboarding/video-slide-3.png',
    },
    {
      titleKey: 'composer.videoOnboarding.slide4.title',
      bodyKey: 'composer.videoOnboarding.slide4.body',
      image: '/onboarding/video-slide-4.png',
    },
  ],
  starters: [
    {
      labelKey: 'composer.videoOnboarding.starter1.label',
      promptKey: 'composer.videoOnboarding.starter1.prompt',
    },
    {
      labelKey: 'composer.videoOnboarding.starter2.label',
      promptKey: 'composer.videoOnboarding.starter2.prompt',
    },
    {
      labelKey: 'composer.videoOnboarding.starter3.label',
      promptKey: 'composer.videoOnboarding.starter3.prompt',
    },
    {
      labelKey: 'composer.videoOnboarding.starter4.label',
      promptKey: 'composer.videoOnboarding.starter4.prompt',
    },
  ],
};
