import type { ChatSuggestion } from '../../services/chatPageData';
import { useLocale } from '../../i18n';

interface Props {
  suggestions: ChatSuggestion[];
  onSelect: (prompt: string) => void;
  onFill?: (prompt: string) => void;
  disabled?: boolean;
}

export default function ChatSuggestions({ suggestions, onSelect, onFill, disabled }: Props) {
  const { t } = useLocale();

  return (
    <section className="chat-suggestions-section">
      <h2 className="chat-suggestions-heading">{t('chat.suggestions.heading')}</h2>
      <div className="chat-suggestions-grid">
        {suggestions.map((s) => (
          <button
            key={s.id}
            type="button"
            className="chat-suggestion-card"
            disabled={disabled}
            onClick={() => onSelect(s.prompt)}
            onContextMenu={(e) => {
              e.preventDefault();
              onFill?.(s.prompt);
            }}
            title={t('chat.suggestions.title')}
          >
            <span className="chat-suggestion-card-label">{s.label}</span>
            <span className="chat-suggestion-card-prompt">{s.prompt}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
