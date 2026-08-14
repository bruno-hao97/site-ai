import { Headphones } from 'lucide-react';
import type { ComposerStudioOnboardingConfig } from './composerOnboardingTypes';

/** Bật lại khi muốn hiện carousel + starter scripts trên /audio (TTS trống). */
export const AUDIO_ONBOARDING_ENABLED = false;

export const AUDIO_ONBOARDING_CONFIG: Pick<
  ComposerStudioOnboardingConfig,
  'ariaTitleKey' | 'titleKey' | 'subtitleKey' | 'slides' | 'headIcon'
> = {
  ariaTitleKey: 'audio.onboarding.title',
  titleKey: 'audio.onboarding.title',
  subtitleKey: 'audio.onboarding.subtitle',
  headIcon: Headphones,
  slides: [
    {
      titleKey: 'audio.onboarding.slide1.title',
      bodyKey: 'audio.onboarding.slide1.body',
      image: '/onboarding/audio-slide-1.png',
    },
    {
      titleKey: 'audio.onboarding.slide2.title',
      bodyKey: 'audio.onboarding.slide2.body',
      image: '/onboarding/audio-slide-2.png',
    },
    {
      titleKey: 'audio.onboarding.slide3.title',
      bodyKey: 'audio.onboarding.slide3.body',
      image: '/onboarding/audio-slide-3.png',
    },
  ],
};
