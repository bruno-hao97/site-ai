import { ChevronDown, Menu, Moon, Plus, Share2 } from 'lucide-react';
import type { ChatAiModel, ChatAiModelTag } from '../../services/chatAiModels';
import type { ChatAgent } from '../../services/chatAgents';

interface Props {
  model: ChatAiModel;
  agent: ChatAgent;
  sessionTitle?: string;
  onOpenModelPicker: () => void;
  onNewChat: () => void;
  onOpenSidebar: () => void;
  onShare?: () => void;
}

function ModelTag({ tags }: { tags?: ChatAiModelTag[] }) {
  const tag = tags?.[0];
  if (!tag) return null;
  return (
    <span className={`chat-topbar-tag chat-topbar-tag--${tag.toLowerCase()}`}>{tag}</span>
  );
}

export default function ChatTopBar({
  model,
  agent,
  sessionTitle,
  onOpenModelPicker,
  onNewChat,
  onOpenSidebar,
  onShare,
}: Props) {
  return (
    <header className="chat-topbar">
      <div className="chat-topbar-left">
        <button
          type="button"
          className="chat-topbar-menu"
          aria-label="Mở menu"
          onClick={onOpenSidebar}
        >
          <Menu size={18} />
        </button>
        <button
          type="button"
          className="chat-topbar-model"
          onClick={onOpenModelPicker}
          title="Chọn model Chat AI"
        >
          <span>{model.name}</span>
          <ModelTag tags={model.tags} />
          <ChevronDown size={14} />
        </button>
        <span className="chat-topbar-agent" title={agent.description}>
          <Moon size={14} />
          {agent.name}
        </span>
        {sessionTitle && sessionTitle !== 'Chat mới' && (
          <span className="chat-topbar-session" title={sessionTitle}>
            {sessionTitle}
          </span>
        )}
      </div>
      <div className="chat-topbar-actions">
        <button type="button" className="chat-topbar-share" onClick={onShare}>
          <Share2 size={15} />
          Chia sẻ
        </button>
        <button
          type="button"
          className="chat-topbar-action"
          title="Chat mới"
          aria-label="Chat mới"
          onClick={onNewChat}
        >
          <Plus size={16} />
        </button>
      </div>
    </header>
  );
}
