import { useLocale } from '../../i18n';
import type { TranslationKey } from '../../i18n';
import StudioOnboardingCarousel from '../onboarding/StudioOnboardingCarousel';
import { AUDIO_ONBOARDING_CONFIG } from '../../lib/audioOnboarding';

const STARTERS: { labelKey: TranslationKey; scriptKey: TranslationKey }[] = [
  { labelKey: 'audio.empty.starter1.label', scriptKey: 'audio.empty.starter1.script' },
  { labelKey: 'audio.empty.starter2.label', scriptKey: 'audio.empty.starter2.script' },
  { labelKey: 'audio.empty.starter3.label', scriptKey: 'audio.empty.starter3.script' },
  { labelKey: 'audio.empty.starter4.label', scriptKey: 'audio.empty.starter4.script' },
];

interface Props {
  onPickScript: (script: string) => void;
}

export default function AudioStudioOnboarding({ onPickScript }: Props) {
  const { t } = useLocale();

  return (
    <div className="audio-studio-onboarding">
      <StudioOnboardingCarousel config={AUDIO_ONBOARDING_CONFIG} />

      <section className="audio-studio-onboarding-starters" aria-label={t('audio.empty.startersTitle')}>
        <h3 className="composer-onboarding-section-title">{t('audio.empty.startersTitle')}</h3>
        <div className="audio-studio-empty-starters">
          {STARTERS.map((item) => (
            <button
              key={item.labelKey}
              type="button"
              className="audio-studio-empty-starter"
              onClick={() => onPickScript(t(item.scriptKey))}
            >
              <span className="audio-studio-empty-starter-label">{t(item.labelKey)}</span>
              <span className="audio-studio-empty-starter-preview">{t(item.scriptKey)}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
