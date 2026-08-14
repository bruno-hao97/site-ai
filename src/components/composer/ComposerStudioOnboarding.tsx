import { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useLocale } from '../../i18n';
import { useLandingFeedPreview } from '../../hooks/useLandingFeedPreview';
import { feedThumb } from '../../services/feedApi';
import type { ComposerStudioOnboardingConfig } from '../../lib/composerOnboardingTypes';
import StudioOnboardingCarousel from '../onboarding/StudioOnboardingCarousel';

type CreateTab = 'new' | 'prompts';

interface Props {
  config: ComposerStudioOnboardingConfig;
  onApplyPrompt: (prompt: string) => void;
}

export default function ComposerStudioOnboarding({ config, onApplyPrompt }: Props) {
  const { t } = useLocale();
  const { items, loading } = useLandingFeedPreview(24);

  const feedItems = useMemo(
    () => items.filter(config.feedFilter).slice(0, 12),
    [items, config],
  );

  const [createTab, setCreateTab] = useState<CreateTab>('new');

  useEffect(() => {
    if (feedItems.length > 0) setCreateTab('new');
    else setCreateTab('prompts');
  }, [feedItems.length]);

  const openChatHelp = () => {
    window.dispatchEvent(new CustomEvent('quick-chat:open'));
  };

  return (
    <div className="composer-onboarding">
      <StudioOnboardingCarousel
        config={config}
        footer={
          <button type="button" className="composer-onboarding-pick-tutorial" onClick={openChatHelp}>
            <Sparkles size={14} />
            {t('composer.onboarding.pickTutorial')}
          </button>
        }
      />

      <section className="composer-onboarding-create" aria-label={t('composer.onboarding.startCreating')}>
        <div className="composer-onboarding-create-head">
          <h3 className="composer-onboarding-section-title">{t('composer.onboarding.startCreating')}</h3>
          <div className="composer-onboarding-create-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={createTab === 'new'}
              className={createTab === 'new' ? 'active' : ''}
              onClick={() => setCreateTab('new')}
            >
              {t('composer.onboarding.tabNew')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={createTab === 'prompts'}
              className={createTab === 'prompts' ? 'active' : ''}
              onClick={() => setCreateTab('prompts')}
            >
              {t('composer.onboarding.tabPrompts')}
            </button>
          </div>
        </div>

        {createTab === 'prompts' && (
          <div className="composer-onboarding-prompt-row" role="tabpanel">
            {config.starters.map((item) => (
              <button
                key={item.labelKey}
                type="button"
                className="composer-onboarding-prompt-card"
                onClick={() => onApplyPrompt(t(item.promptKey))}
              >
                <span className="composer-onboarding-prompt-label">{t(item.labelKey)}</span>
                <span className="composer-onboarding-prompt-preview">{t(item.promptKey)}</span>
              </button>
            ))}
          </div>
        )}

        {createTab === 'new' && (
          <div className="composer-onboarding-masonry" role="tabpanel">
            {loading &&
              Array.from({ length: 6 }, (_, i) => (
                <div
                  key={`sk-${i}`}
                  className={`composer-onboarding-masonry-card composer-onboarding-masonry-card--sk composer-onboarding-masonry-card--h${(i % 3) + 1}`}
                />
              ))}
            {!loading && feedItems.length === 0 && (
              <p className="composer-onboarding-masonry-empty">{t(config.featuredEmptyKey)}</p>
            )}
            {!loading &&
              feedItems.map((item, i) => {
                const thumb = feedThumb(item)!;
                const prompt = item.prompt || item.title || '';
                return (
                  <button
                    key={item.id_base}
                    type="button"
                    className={`composer-onboarding-masonry-card composer-onboarding-masonry-card--h${(i % 3) + 1}`}
                    onClick={() => prompt && onApplyPrompt(prompt)}
                    title={prompt || undefined}
                  >
                    <img src={thumb} alt="" loading="lazy" />
                    {prompt && (
                      <span className="composer-onboarding-masonry-label">
                        {prompt.slice(0, 48)}
                        {prompt.length > 48 ? '…' : ''}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        )}
      </section>
    </div>
  );
}
