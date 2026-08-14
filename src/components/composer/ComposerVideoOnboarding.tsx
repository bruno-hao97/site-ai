import { COMPOSER_VIDEO_ONBOARDING_CONFIG } from '../../lib/composerVideoOnboarding';
import ComposerStudioOnboarding from './ComposerStudioOnboarding';

interface Props {
  onApplyPrompt: (prompt: string) => void;
}

export default function ComposerVideoOnboarding({ onApplyPrompt }: Props) {
  return (
    <ComposerStudioOnboarding config={COMPOSER_VIDEO_ONBOARDING_CONFIG} onApplyPrompt={onApplyPrompt} />
  );
}
