import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale } from '../../i18n';
import type { ComposerStudioOnboardingConfig } from '../../lib/composerOnboardingTypes';

const SLIDE_GAP = 16;

interface Props {
  config: Pick<
    ComposerStudioOnboardingConfig,
    'ariaTitleKey' | 'titleKey' | 'subtitleKey' | 'slides' | 'headIcon'
  >;
  className?: string;
  footer?: ReactNode;
}

function slideStateClass(index: number, activeIndex: number): string {
  if (index === activeIndex) return 'is-active';
  if (index < activeIndex) return 'is-prev';
  return 'is-next';
}

function SlideImage({ src, title }: { src: string; title: string }) {
  return (
    <img
      src={src}
      alt=""
      className="composer-onboarding-slide-image"
      draggable={false}
      loading="lazy"
      title={title}
    />
  );
}

export default function StudioOnboardingCarousel({ config, className = '', footer }: Props) {
  const { t } = useLocale();
  const [slideIndex, setSlideIndex] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState({ stageWidth: 0, slideWidth: 0 });

  const HeadIcon = config.headIcon;
  const slides = config.slides;
  const slide = slides[slideIndex]!;
  const trackReady = metrics.stageWidth > 0 && metrics.slideWidth > 0;

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const measure = () => {
      const slideEl = stage.querySelector<HTMLElement>('.composer-onboarding-slide');
      if (!slideEl) return;
      setMetrics({
        stageWidth: stage.clientWidth,
        slideWidth: slideEl.offsetWidth,
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    const firstSlide = stage.querySelector('.composer-onboarding-slide');
    if (firstSlide) observer.observe(firstSlide);

    return () => observer.disconnect();
  }, []);

  const trackOffset = useMemo(() => {
    if (!trackReady) return 0;
    const step = metrics.slideWidth + SLIDE_GAP;
    return metrics.stageWidth / 2 - slideIndex * step - metrics.slideWidth / 2;
  }, [metrics, slideIndex, trackReady]);

  const goToSlide = (index: number) => {
    setSlideIndex(Math.max(0, Math.min(slides.length - 1, index)));
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (e.key === 'ArrowLeft') setSlideIndex((i) => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setSlideIndex((i) => Math.min(slides.length - 1, i + 1));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [slides.length]);

  return (
    <section
      className={`composer-onboarding-carousel${className ? ` ${className}` : ''}`}
      aria-label={t(config.ariaTitleKey)}
    >
      <div className="composer-onboarding-carousel-head">
        <div className="composer-onboarding-head-row">
          <span className="composer-onboarding-head-icon" aria-hidden>
            <HeadIcon size={18} strokeWidth={2} />
          </span>
          <h2 className="composer-onboarding-title">{t(config.titleKey)}</h2>
        </div>
        <p className="composer-onboarding-subtitle">{t(config.subtitleKey)}</p>
      </div>

      <div className="composer-onboarding-carousel-body">
        <div
          ref={stageRef}
          className={`composer-onboarding-stage${trackReady ? ' is-ready' : ''}`}
        >
          <div
            className="composer-onboarding-track"
            style={{
              gap: `${SLIDE_GAP}px`,
              transform: `translateX(${trackOffset}px)`,
            }}
          >
            {slides.map((s, i) => {
              const isActive = i === slideIndex;
              const stateClass = slideStateClass(i, slideIndex);

              return (
                <article
                  key={s.titleKey}
                  className={`composer-onboarding-slide ${stateClass}`}
                  aria-hidden={!isActive}
                  aria-current={isActive ? 'step' : undefined}
                  onClick={() => {
                    if (!isActive) goToSlide(i);
                  }}
                >
                  <div className="composer-onboarding-slide-card">
                    <div className="composer-onboarding-slide-visual">
                      <SlideImage src={s.image} title={t(s.titleKey)} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="composer-onboarding-slide-caption" aria-live="polite" key={slideIndex}>
          <h3>{t(slide.titleKey)}</h3>
          <p>{t(slide.bodyKey)}</p>
        </div>
      </div>

      <div className="composer-onboarding-carousel-foot">
        <div className="composer-onboarding-carousel-nav">
          <button
            type="button"
            className="composer-onboarding-icon-btn"
            aria-label={t('composer.onboarding.prev')}
            disabled={slideIndex === 0}
            onClick={() => goToSlide(slideIndex - 1)}
          >
            <ChevronLeft size={20} />
          </button>
          <span className="composer-onboarding-counter">
            {slideIndex + 1} / {slides.length}
          </span>
          <button
            type="button"
            className="composer-onboarding-icon-btn"
            aria-label={t('composer.onboarding.next')}
            disabled={slideIndex >= slides.length - 1}
            onClick={() => goToSlide(slideIndex + 1)}
          >
            <ChevronRight size={20} />
          </button>
        </div>
        {footer}
      </div>
    </section>
  );
}
