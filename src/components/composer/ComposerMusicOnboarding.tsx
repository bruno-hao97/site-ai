import { COMPOSER_MUSIC_ONBOARDING_CONFIG } from '../../lib/composerMusicOnboarding';
import ComposerStudioOnboarding from './ComposerStudioOnboarding';

interface Props {
  onApplyStyle: (style: string) => void;
}

export default function ComposerMusicOnboarding({ onApplyStyle }: Props) {
  return (
    <ComposerStudioOnboarding
      config={COMPOSER_MUSIC_ONBOARDING_CONFIG}
      onApplyPrompt={onApplyStyle}
    />
  );
}
