import { Music } from 'lucide-react';
import { feedThumb, type FeedItem } from '../services/feedApi';
import type { ComposerStudioOnboardingConfig } from './composerOnboardingTypes';

function isMusicFeedItem(item: FeedItem): boolean {
  const type = (item.type || '').toLowerCase();
  return type === 'music' || type === 'audio';
}

export const COMPOSER_MUSIC_ONBOARDING_CONFIG: ComposerStudioOnboardingConfig = {
  ariaTitleKey: 'composer.musicOnboarding.title',
  titleKey: 'composer.musicOnboarding.title',
  subtitleKey: 'composer.musicOnboarding.subtitle',
  featuredEmptyKey: 'composer.musicOnboarding.featuredEmpty',
  headIcon: Music,
  feedFilter: (item) => isMusicFeedItem(item) && Boolean(feedThumb(item)),
  slides: [
    {
      titleKey: 'composer.musicOnboarding.slide1.title',
      bodyKey: 'composer.musicOnboarding.slide1.body',
      image: '/onboarding/music-slide-1.png',
    },
    {
      titleKey: 'composer.musicOnboarding.slide2.title',
      bodyKey: 'composer.musicOnboarding.slide2.body',
      image: '/onboarding/music-slide-2.png',
    },
    {
      titleKey: 'composer.musicOnboarding.slide4.title',
      bodyKey: 'composer.musicOnboarding.slide4.body',
      image: '/onboarding/music-slide-3.png',
    },
  ],
  starters: [
    {
      labelKey: 'composer.musicOnboarding.starter1.label',
      promptKey: 'composer.musicOnboarding.starter1.prompt',
    },
    {
      labelKey: 'composer.musicOnboarding.starter2.label',
      promptKey: 'composer.musicOnboarding.starter2.prompt',
    },
    {
      labelKey: 'composer.musicOnboarding.starter3.label',
      promptKey: 'composer.musicOnboarding.starter3.prompt',
    },
    {
      labelKey: 'composer.musicOnboarding.starter4.label',
      promptKey: 'composer.musicOnboarding.starter4.prompt',
    },
  ],
};
