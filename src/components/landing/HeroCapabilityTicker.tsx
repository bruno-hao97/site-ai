import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MotionConfig, motion } from 'framer-motion';
import { useLocale } from '../../i18n';
import { getHeroCapabilities } from '../../lib/landingI18n';
import {
  HERO_CAPABILITY_ITEM_HEIGHT_PX,
  HERO_CAPABILITY_VIEWPORT_HEIGHT_PX,
} from '../../lib/heroCapabilities';

const STEP_MOVE_S = 0.48;
const STEP_HOLD_MS = 1400;
const MOVE_EASE = [0.22, 1, 0.36, 1] as const;

function itemOpacity(distance: number): number {
  if (distance === 0) return 1;
  if (distance === 1) return 0.36;
  return 0.2;
}

export default function HeroCapabilityTicker() {
  const { t } = useLocale();
  const capabilities = useMemo(() => getHeroCapabilities(t), [t]);
  const count = capabilities.length;
  const items = useMemo(() => [...capabilities, ...capabilities], [capabilities]);
  const centerOffset =
    (HERO_CAPABILITY_VIEWPORT_HEIGHT_PX - HERO_CAPABILITY_ITEM_HEIGHT_PX) / 2;

  const [index, setIndex] = useState(0);
  const [instant, setInstant] = useState(false);
  const holdTimerRef = useRef<number | undefined>(undefined);

  const y = centerOffset - index * HERO_CAPABILITY_ITEM_HEIGHT_PX;

  const advance = useCallback(() => {
    setIndex((prev) => {
      const next = prev + 1;
      if (next > count) {
        setInstant(true);
        return 0;
      }
      return next;
    });
  }, [count]);

  useEffect(() => {
    if (!instant) return;
    const id = requestAnimationFrame(() => setInstant(false));
    return () => cancelAnimationFrame(id);
  }, [instant]);

  useEffect(() => () => {
    if (holdTimerRef.current !== undefined) {
      window.clearTimeout(holdTimerRef.current);
    }
  }, []);

  const onMoveComplete = useCallback(() => {
    if (instant) return;
    if (holdTimerRef.current !== undefined) {
      window.clearTimeout(holdTimerRef.current);
    }
    holdTimerRef.current = window.setTimeout(advance, STEP_HOLD_MS);
  }, [advance, instant]);

  return (
    <MotionConfig reducedMotion="never">
      <div className="hero-capability-ticker" aria-hidden="true">
        <span className="hero-capability-pointer" />
        <div className="hero-capability-viewport">
          <motion.ul
            className="hero-capability-track"
            animate={{ y }}
            transition={{
              duration: instant ? 0 : STEP_MOVE_S,
              ease: MOVE_EASE,
            }}
            onAnimationComplete={onMoveComplete}
          >
            {items.map((label, i) => {
              const distance = Math.abs(i - index);
              return (
                <li
                  key={`${label}-${i}`}
                  className={`hero-capability-item${i === index ? ' is-active' : ''}`}
                  style={{ opacity: itemOpacity(distance) }}
                >
                  {label}
                </li>
              );
            })}
          </motion.ul>
        </div>
      </div>
    </MotionConfig>
  );
}
