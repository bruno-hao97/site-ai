import { useEffect, useRef } from 'react';
import { Bot } from 'lucide-react';
import type { ChatMessage } from '../../services/chatSessionsLocal';
import { stripChatDisplayText } from '../../services/chatSanitize';
import { useLocale } from '../../i18n';

interface Props {
  messages: ChatMessage[];
  thinking: boolean;
}

export default function ChatMessageList({ messages, thinking }: Props) {
  const { t } = useLocale();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  return (
    <div className="chat-message-list" ref={listRef}>
      {messages.map((m) => {
        const shown =
          m.role === 'assistant' ? stripChatDisplayText(m.content) : m.content;
        const streaming = m.role === 'assistant' && !m.content && thinking;
        return (
          <div key={m.id} className={`chat-message chat-message--${m.role}`}>
            {m.role === 'assistant' && (
              <span className="chat-message-avatar">
                <Bot size={14} />
              </span>
            )}
            <div className="chat-message-bubble">
              {m.imageUrl && (
                <img className="chat-message-img" src={m.imageUrl} alt={t('chat.message.attachmentAlt')} />
              )}
              {streaming ? (
                <span className="chat-message-typing">
                  <span />
                  <span />
                  <span />
                </span>
              ) : (
                <span className="chat-message-text">
                  {shown.split('\n').map((line, i, arr) => (
                    <span key={i}>
                      {line}
                      {i < arr.length - 1 && <br />}
                    </span>
                  ))}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
