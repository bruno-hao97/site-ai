import { COMPOSER_IMAGE_ONBOARDING_CONFIG } from '../../lib/composerImageOnboarding';
import ComposerStudioOnboarding from './ComposerStudioOnboarding';

interface Props {
  onApplyPrompt: (prompt: string) => void;
}

export default function ComposerImageOnboarding({ onApplyPrompt }: Props) {
  return (
    <ComposerStudioOnboarding config={COMPOSER_IMAGE_ONBOARDING_CONFIG} onApplyPrompt={onApplyPrompt} />
  );
}
