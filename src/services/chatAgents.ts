import { authUserKey } from './authStore';
import { GOMMO_CHAT_CONFIG } from './gommoChatConfig';

export interface ChatAgent {
  id: string;
  name: string;
  agentId: string;
  description: string;
}

/** Agent chat mặc định — khớp Moon trên mockup. */
export const CHAT_AGENTS: ChatAgent[] = [
  {
    id: 'moon',
    name: 'Moon',
    agentId: GOMMO_CHAT_CONFIG.agentId,
    description: 'Trợ lý AI đa năng',
  },
];

export const DEFAULT_CHAT_AGENT_ID = 'moon';

export function resolveChatAgent(agentId?: string | null): ChatAgent {
  return CHAT_AGENTS.find((a) => a.id === agentId) ?? CHAT_AGENTS[0];
}

function agentStorageKey(): string {
  return `chat_page_agent:${authUserKey()}`;
}

export function loadChatPageAgentId(): string {
  try {
    const raw = localStorage.getItem(agentStorageKey());
    if (raw && CHAT_AGENTS.some((a) => a.id === raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_CHAT_AGENT_ID;
}

export function saveChatPageAgentId(agentId: string): void {
  try {
    if (!CHAT_AGENTS.some((a) => a.id === agentId)) return;
    localStorage.setItem(agentStorageKey(), agentId);
  } catch {
    /* ignore */
  }
}
