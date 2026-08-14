import { GitBranch } from 'lucide-react';
import type { ComposerStudioOnboardingConfig } from './composerOnboardingTypes';

export const WORKFLOW_ONBOARDING_CONFIG: Pick<
  ComposerStudioOnboardingConfig,
  'ariaTitleKey' | 'titleKey' | 'subtitleKey' | 'slides' | 'headIcon'
> = {
  ariaTitleKey: 'workflow.onboarding.title',
  titleKey: 'workflow.onboarding.title',
  subtitleKey: 'workflow.onboarding.subtitle',
  headIcon: GitBranch,
  slides: [
    {
      titleKey: 'workflow.onboarding.slide1.title',
      bodyKey: 'workflow.onboarding.slide1.body',
      image: '/onboarding/workflow-slide-1.png',
    },
    {
      titleKey: 'workflow.onboarding.slide2.title',
      bodyKey: 'workflow.onboarding.slide2.body',
      image: '/onboarding/workflow-slide-2.png',
    },
    {
      titleKey: 'workflow.onboarding.slide3.title',
      bodyKey: 'workflow.onboarding.slide3.body',
      image: '/onboarding/workflow-slide-3.png',
    },
    {
      titleKey: 'workflow.onboarding.slide4.title',
      bodyKey: 'workflow.onboarding.slide4.body',
      image: '/onboarding/workflow-slide-4.png',
    },
  ],
};
