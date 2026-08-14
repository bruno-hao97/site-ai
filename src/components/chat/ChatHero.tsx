import { Bot, Code2, Image, Music, Palette, Video } from 'lucide-react';
import type { ChatAiModel } from '../../services/chatAiModels';
import { useLocale } from '../../i18n';

interface Props {
  model: ChatAiModel;
}

const ICONS = [
  { Icon: Image, color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
  { Icon: Video, color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
  { Icon: Code2, color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
  { Icon: Palette, color: '#f472b6', bg: 'rgba(244,114,182,0.15)' },
  { Icon: Music, color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
  { Icon: Bot, color: '#53eb67', bg: 'rgba(83,235,103,0.12)' },
];

export default function ChatHero({ model }: Props) {
  const { t } = useLocale();

  return (
    <section className="chat-hero">
      <div className="chat-hero-icons" aria-hidden="true">
        {ICONS.map(({ Icon, color, bg }, i) => (
          <span key={i} style={{ color, background: bg }}>
            <Icon size={18} />
          </span>
        ))}
      </div>
      <p className="chat-hero-kicker">{t('chat.hero.kicker')}</p>
      <h1 className="chat-hero-title">
        {t('chat.hero.titleLine1')}
        <br />
        {t('chat.hero.titleLine2')}
      </h1>
      <p className="chat-hero-sub">{t('chat.hero.sub', { model: model.name })}</p>
    </section>
  );
}
