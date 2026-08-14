import { motion, useInView } from 'framer-motion';
import { useMemo, useRef } from 'react';
import { Code2, Image, MessageSquare, Mic, Music, Video } from 'lucide-react';
import { useLocale } from '../../i18n';
import type { TranslationKey } from '../../i18n/types';

const CAPABILITY_DEFS = [
  { id: 'image', icon: Image, wrap: 'cap-icon-blue', modelsKey: 'landing.multimodal.cap.imageModels' },
  { id: 'video', icon: Video, wrap: 'cap-icon-purple', modelsKey: 'landing.multimodal.cap.videoModels' },
  { id: 'voice', icon: Mic, wrap: 'cap-icon-orange', modelsKey: 'landing.multimodal.cap.voiceModels' },
  { id: 'music', icon: Music, wrap: 'cap-icon-pink', modelsKey: 'landing.multimodal.cap.musicModels' },
  { id: 'chat', icon: MessageSquare, wrap: 'cap-icon-green', modelsKey: 'landing.multimodal.cap.chatModels' },
  { id: 'code', icon: Code2, wrap: 'cap-icon-yellow', modelsKey: 'landing.multimodal.cap.codeModels' },
] as const satisfies Array<{
  id: string;
  icon: typeof Image;
  wrap: string;
  modelsKey: TranslationKey;
}>;

const FLOW_DEFS: TranslationKey[][] = [
  ['landing.multimodal.flow.text', 'landing.multimodal.flow.image', 'landing.multimodal.flow.video'],
  ['landing.multimodal.flow.image', 'landing.multimodal.flow.video'],
  ['landing.multimodal.flow.text', 'landing.multimodal.flow.speech'],
  ['landing.multimodal.flow.audio', 'landing.multimodal.flow.text'],
  ['landing.multimodal.flow.text', 'landing.multimodal.flow.code'],
];

const STAT_DEFS = [
  { numKey: 'landing.multimodal.stat.models.num', labelKey: 'landing.multimodal.stat.models.label' },
  { numKey: 'landing.multimodal.stat.content.num', labelKey: 'landing.multimodal.stat.content.label' },
  { numKey: 'landing.multimodal.stat.uptime.num', labelKey: 'landing.multimodal.stat.uptime.label' },
  { numKey: 'landing.multimodal.stat.latency.num', labelKey: 'landing.multimodal.stat.latency.label' },
] as const;

const CAPABILITY_LABEL_KEYS: Record<(typeof CAPABILITY_DEFS)[number]['id'], TranslationKey> = {
  image: 'landing.multimodal.cap.image',
  video: 'landing.multimodal.cap.video',
  voice: 'landing.multimodal.cap.voice',
  music: 'landing.multimodal.cap.music',
  chat: 'landing.multimodal.cap.chat',
  code: 'landing.multimodal.cap.code',
};

export default function MultimodalSection() {
  const { t } = useLocale();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  const capabilities = useMemo(
    () =>
      CAPABILITY_DEFS.map((cap) => ({
        ...cap,
        label: t(CAPABILITY_LABEL_KEYS[cap.id]),
        models: t(cap.modelsKey),
      })),
    [t],
  );

  const flows = useMemo(
    () => FLOW_DEFS.map((parts) => parts.map((key) => t(key))),
    [t],
  );

  const stats = useMemo(
    () => STAT_DEFS.map((stat) => ({ num: t(stat.numKey), label: t(stat.labelKey) })),
    [t],
  );

  return (
    <section id="multimodal" className="multimodal-section" ref={ref}>
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="multimodal-card"
        >
          <span className="multimodal-badge">{t('landing.multimodal.badge')}</span>
          <h2>{t('landing.multimodal.title')}</h2>
          <p className="multimodal-desc">{t('landing.multimodal.desc')}</p>

          <div className="conversion-row">
            {flows.map((parts, i) => (
              <span key={i} className="conv-group">
                {parts.map((part, j) => (
                  <span key={`${i}-${part}`} className="conv-cell">
                    {j > 0 && <span className="conv-arrow">→</span>}
                    <span className="conv-pill">{part}</span>
                  </span>
                ))}
              </span>
            ))}
          </div>

          <div className="capability-grid">
            {capabilities.map((cap) => (
              <div key={cap.id} className="cap-item">
                <div className={`cap-icon-wrap ${cap.wrap}`}>
                  <cap.icon size={22} />
                </div>
                <span className="cap-label">{cap.label}</span>
                <span className="cap-models">{cap.models}</span>
              </div>
            ))}
          </div>

          <div className="stats-row">
            {stats.map((s) => (
              <div key={s.label} className="stat-item">
                <div className="stat-num">{s.num}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
