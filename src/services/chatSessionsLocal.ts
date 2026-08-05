import { authUserKey } from './authStore';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
}

export interface ChatSessionSummary {
  sessionId: string;
  title: string;
  updatedAt: number;
}

export interface ChatSessionData extends ChatSessionSummary {
  messages: ChatMessage[];
  modelId?: string;
  agentId?: string;
}

interface SessionsIndex {
  sessions: ChatSessionSummary[];
}

const INDEX_SUFFIX = ':index';
const SESSION_PREFIX = ':session:';
const MAX_SESSIONS = 80;

function indexKey(): string {
  return `chat_sessions:${authUserKey()}${INDEX_SUFFIX}`;
}

function sessionKey(sessionId: string): string {
  return `chat_sessions:${authUserKey()}${SESSION_PREFIX}${sessionId}`;
}

function readIndex(): SessionsIndex {
  try {
    const raw = localStorage.getItem(indexKey());
    if (!raw) return { sessions: [] };
    const parsed = JSON.parse(raw) as SessionsIndex;
    return { sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [] };
  } catch {
    return { sessions: [] };
  }
}

function writeIndex(index: SessionsIndex): void {
  localStorage.setItem(indexKey(), JSON.stringify(index));
}

function notifyUpdated(): void {
  document.dispatchEvent(new CustomEvent('chat-sessions:updated'));
}

function pruneSessions(index: SessionsIndex): SessionsIndex {
  if (index.sessions.length <= MAX_SESSIONS) return index;
  const sorted = [...index.sessions].sort((a, b) => b.updatedAt - a.updatedAt);
  const keep = sorted.slice(0, MAX_SESSIONS);
  const drop = sorted.slice(MAX_SESSIONS);
  for (const s of drop) localStorage.removeItem(sessionKey(s.sessionId));
  return { sessions: keep };
}

export function listChatSessions(): ChatSessionSummary[] {
  return readIndex().sessions.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function loadChatSession(sessionId: string): ChatSessionData | null {
  try {
    const raw = localStorage.getItem(sessionKey(sessionId));
    if (!raw) return null;
    return JSON.parse(raw) as ChatSessionData;
  } catch {
    return null;
  }
}

export function saveChatSession(data: ChatSessionData): void {
  let index = readIndex();
  const summary: ChatSessionSummary = {
    sessionId: data.sessionId,
    title: data.title,
    updatedAt: data.updatedAt,
  };
  const existing = index.sessions.findIndex((s) => s.sessionId === data.sessionId);
  if (existing >= 0) index.sessions[existing] = summary;
  else index.sessions.unshift(summary);
  index = pruneSessions(index);
  writeIndex(index);
  localStorage.setItem(sessionKey(data.sessionId), JSON.stringify(data));
  notifyUpdated();
}

export function deleteChatSession(sessionId: string): void {
  const index = readIndex();
  index.sessions = index.sessions.filter((s) => s.sessionId !== sessionId);
  writeIndex(index);
  localStorage.removeItem(sessionKey(sessionId));
  notifyUpdated();
}

export function onChatSessionsUpdated(cb: () => void): () => void {
  const handler = () => cb();
  document.addEventListener('chat-sessions:updated', handler);
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith(`chat_sessions:${authUserKey()}`)) cb();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    document.removeEventListener('chat-sessions:updated', handler);
    window.removeEventListener('storage', onStorage);
  };
}

export function deriveSessionTitle(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (!trimmed) return 'Chat mới';
  return trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed;
}

export function formatSessionTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày`;
  return new Date(ts).toLocaleDateString('vi-VN');
}

export function newChatSessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `chat_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function newChatMessageId(): string {
  return `msg_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
