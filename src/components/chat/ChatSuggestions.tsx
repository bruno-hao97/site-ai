import type { ChatSuggestion } from '../../services/chatPageData';

interface Props {
  suggestions: ChatSuggestion[];
  onSelect: (prompt: string) => void;
  onFill?: (prompt: string) => void;
  disabled?: boolean;
}

export default function ChatSuggestions({ suggestions, onSelect, onFill, disabled }: Props) {
  return (
    <section className="chat-suggestions-section">
      <h2 className="chat-suggestions-heading">GỢI Ý CHO BẠN</h2>
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
            title="Nhấp để gửi · Chuột phải để điền vào ô nhập"
          >
            <span className="chat-suggestion-card-label">{s.label}</span>
            <span className="chat-suggestion-card-prompt">{s.prompt}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
