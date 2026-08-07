import { loadAuth } from './authStore';
import { resolveChatAssistantContent, sanitizeChatStreamContent } from './chatSanitize';
import {
  buildMarketplaceDeviceInfo,
  platformDeviceFields,
  resolveBrowserDeviceId,
} from './gommoDevice';
import { DEFAULT_DOMAIN } from './settingsStore';
import { GOMMO_CHAT_CONFIG, type GommoChatConfig } from './gommoChatConfig';

export interface ChatAttachment {
  type: 'image';
  url: string;
  name?: string;
  mime_type?: string;
}

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
  attachments?: ChatAttachment[];
}

export interface AskOptions {
  /** Lịch sử hội thoại TRƯỚC lượt hiện tại (đã convert role user/model). */
  history: ChatTurn[];
  /** Là lượt đầu của phiên (để chèn system prompt). */
  firstTurn?: boolean;
  /** Id phiên dùng chung cho cả 3 API. */
  sessionId: string;
  /** Snapshot JSON graph hiện tại (gửi kèm cho model). */
  workflowSnapshot?: string;
  /** Ảnh đính kèm lượt hiện tại (CDN URL, không blob). */
  attachments?: ChatAttachment[];
  onDelta?: (chunk: string) => void;
  signal?: AbortSignal;
  config?: Partial<GommoChatConfig>;
}

/** Đã đăng nhập Gommo (có access_token) thì mới chat được. */
export function isGommoChatConfigured(): boolean {
  return Boolean(loadAuth()?.access_token?.trim());
}

export { resolveChatAssistantContent };

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function serializeAttachments(attachments?: ChatAttachment[]): ChatAttachment[] {
  if (!attachments?.length) return [];
  return attachments.map((a) => ({
    type: 'image' as const,
    url: a.url,
    ...(a.name ? { name: a.name } : {}),
    ...(a.mime_type ? { mime_type: a.mime_type } : {}),
  }));
}

function serializeMessages(history: ChatTurn[]): string {
  return JSON.stringify(
    history.map((t) => ({
      role: t.role,
      text: t.text,
      attachments: serializeAttachments(t.attachments),
    })),
  );
}

function resolveChatCredentials(auth: NonNullable<ReturnType<typeof loadAuth>>) {
  const accessToken = auth.access_token.trim();
  if (!accessToken) throw new Error('Chưa đăng nhập Gommo — không thể chat.');
  return {
    accessToken,
    domain: auth.domain || DEFAULT_DOMAIN,
  };
}

function buildVnTimestamp(): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date());
}

function buildSystemCustomPrompt(cfg: GommoChatConfig): string {
  const base = cfg.systemPrompt?.trim() ?? '';
  const timeLine = `Thời gian hiện tại (Việt Nam): ${buildVnTimestamp()}.`;
  if (!base) return timeLine;
  return `${base}\n\n${timeLine}`;
}

function resolveApiMode(cfg: GommoChatConfig, opts: AskOptions): GommoChatConfig['chatApiMode'] {
  if (cfg.chatApiMode) return cfg.chatApiMode;
  if (opts.attachments?.length || opts.workflowSnapshot) return 'stream';
  return 'agent';
}

function appendDeviceFields(form: URLSearchParams, cfg: GommoChatConfig): void {
  const runtime = platformDeviceFields();
  form.set('device_id', runtime.device_id || cfg.deviceId);
  form.set('device_name', runtime.device_name || cfg.deviceName);
  if (runtime.device_info) form.set('device_info', runtime.device_info);
  if (runtime.device_info) {
    form.set('debug_info', buildMarketplaceDeviceInfo(runtime.device_id || resolveBrowserDeviceId()));
  }
}

/** Best-effort — sync model trước action=chat. */
async function syncAgentChatModel(args: {
  cfg: GommoChatConfig;
  sessionId: string;
  accessToken: string;
  domain: string;
  signal?: AbortSignal;
}): Promise<void> {
  try {
    const form = new URLSearchParams();
    form.set('action', 'set_model');
    form.set('access_token', args.accessToken);
    form.set('domain', args.domain);
    form.set('chat_id', args.sessionId);
    form.set('agent_id', args.cfg.agentId);
    form.set('server', args.cfg.server);
    form.set('model', args.cfg.model);
    appendDeviceFields(form, args.cfg);
    await fetch(`${args.cfg.baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      signal: args.signal,
    });
  } catch (err) {
    console.warn('[gommoChat] set_model failed (bỏ qua):', err);
  }
}

function buildAgentChatForm(args: {
  cfg: GommoChatConfig;
  accessToken: string;
  domain: string;
  sessionId: string;
  query: string;
  messages: ChatTurn[];
}): URLSearchParams {
  const form = new URLSearchParams();
  form.set('action', 'chat');
  form.set('access_token', args.accessToken);
  form.set('domain', args.domain);
  form.set('agent_id', args.cfg.agentId);
  form.set('query', args.query);
  form.set('chat_id', args.sessionId);
  form.set('messages', serializeMessages(args.messages));
  form.set('source', args.cfg.chatSource);
  form.set('system_custom_prompt', buildSystemCustomPrompt(args.cfg));
  form.set('language', 'VI');
  appendDeviceFields(form, args.cfg);
  return form;
}

function buildStreamChatForm(args: {
  cfg: GommoChatConfig;
  accessToken: string;
  domain: string;
  sessionId: string;
  query: string;
  messages: ChatTurn[];
  userMessageId: string;
  assistantMessageId: string;
}): URLSearchParams {
  const form = new URLSearchParams();
  form.set('action', 'stream');
  form.set('access_token', args.accessToken);
  form.set('domain', args.domain);
  form.set('server', args.cfg.server);
  form.set('model', args.cfg.model);
  form.set('mode', args.cfg.model);
  form.set('body_type', 'chat_completions');
  form.set('agent_id', args.cfg.agentId);
  form.set('session_id', args.sessionId);
  form.set('project_id', args.cfg.projectId);
  form.set('query', args.query);
  form.set('user_message_id', args.userMessageId);
  form.set('assistant_message_id', args.assistantMessageId);
  form.set('messages', serializeMessages(args.messages));
  form.set('source', args.cfg.chatSource);
  form.set('language', 'VI');
  form.set('chat_tools', JSON.stringify({ web_search: false, web_fetch: false }));
  const systemPrompt = buildSystemCustomPrompt(args.cfg);
  if (systemPrompt) form.set('custom_system_prompt', systemPrompt);
  appendDeviceFields(form, args.cfg);
  return form;
}

function extractJsonChatError(text: string): Error | null {
  try {
    const j = JSON.parse(text) as { error?: number; message?: string };
    if (j.error != null && j.error !== 0) {
      return new Error(`${j.message ?? 'Gommo từ chối yêu cầu'} (error ${j.error})`);
    }
  } catch {
    /* not JSON */
  }
  return null;
}

function extractJsonChatContent(text: string): string | null {
  try {
    const j = JSON.parse(text) as {
      error?: number;
      message?: string;
      text?: string;
      content?: string;
      reply?: string;
    };
    if (j.error != null && j.error !== 0) {
      throw new Error(`${j.message ?? 'Gommo từ chối yêu cầu'} (error ${j.error})`);
    }
    return j.text ?? j.content ?? j.reply ?? null;
  } catch (err) {
    if (err instanceof Error && err.message.includes('error')) throw err;
    return null;
  }
}

function shouldSanitizeReply(cfg: GommoChatConfig, opts: AskOptions): boolean {
  if (cfg.sanitizeReply === false) return false;
  if (cfg.sanitizeReply === true) return true;
  return !opts.workflowSnapshot;
}

async function readChatStreamBody(
  res: Response,
  onDelta: ((cumulative: string) => void) | undefined,
  sanitizeDelta: boolean,
): Promise<string> {
  if (!res.body) throw new Error('Gommo không trả về luồng dữ liệu.');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let reply = '';

  const emitDelta = () => {
    if (!onDelta) return;
    onDelta(sanitizeDelta ? sanitizeChatStreamContent(reply, true) : reply);
  };

  const consumeLine = (line: string): boolean => {
    if (!line.startsWith('data:')) return false;
    const payload = line.slice(5).trim();
    if (payload === '[DONE]') return true;
    try {
      const json = JSON.parse(payload) as {
        choices?: { delta?: { content?: string | null } }[];
        error?: number;
        message?: string;
      };
      if (json.error != null && json.error !== 0) {
        throw new Error(`${json.message ?? 'Gommo từ chối yêu cầu'} (error ${json.error})`);
      }
      const content = json.choices?.[0]?.delta?.content;
      if (content) {
        reply += content;
        emitDelta();
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('error')) throw err;
    }
    return false;
  };

  let done = false;
  while (!done) {
    const { done: streamDone, value } = await reader.read();
    if (streamDone) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (consumeLine(line.trim())) {
        done = true;
        break;
      }
    }
  }
  if (!done && buffer.trim()) consumeLine(buffer.trim());

  return reply;
}

async function postChatAndReadReply(
  form: URLSearchParams,
  cfg: GommoChatConfig,
  signal: AbortSignal,
  sanitizeDelta: boolean,
  onDelta?: (cumulative: string) => void,
): Promise<string> {
  const res = await fetch(`${cfg.baseUrl}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
    signal,
  });

  if (!res.ok) {
    throw new Error(`Gommo chat lỗi HTTP ${res.status}`);
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const text = await res.text();
    const err = extractJsonChatError(text);
    if (err) throw err;
    const content = extractJsonChatContent(text);
    if (content != null) {
      const display = sanitizeDelta ? sanitizeChatStreamContent(content, false) : content;
      onDelta?.(display);
      return content;
    }
    throw new Error('Gommo trả về JSON không có nội dung.');
  }

  return readChatStreamBody(res, onDelta, sanitizeDelta);
}

/** API — lưu tin nhắn (best-effort, không chặn câu trả lời). */
async function saveMessage(
  cfg: GommoChatConfig,
  token: string,
  domain: string,
  args: {
    messageId: string;
    sessionId: string;
    role: 'user' | 'model';
    text: string;
    attachments?: ChatAttachment[];
    metadata: Record<string, unknown>;
  },
): Promise<void> {
  try {
    const form = new URLSearchParams();
    form.set('action', 'save_message');
    form.set('access_token', token);
    form.set('domain', domain);
    form.set('message_id', args.messageId);
    form.set('session_id', args.sessionId);
    form.set('role', args.role);
    form.set('text', args.text);
    form.set('attachments', JSON.stringify(serializeAttachments(args.attachments)));
    form.set('timestamp', String(Date.now()));
    form.set('metadata', JSON.stringify(args.metadata));
    appendDeviceFields(form, cfg);
    await fetch(`${cfg.baseUrl}/ai-chat-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
  } catch (err) {
    console.warn('[gommoChat] save_message failed (bỏ qua):', err);
  }
}

/**
 * Gửi 1 lượt chat tới Gommo (hybrid agent/stream), stream qua onDelta, trả câu trả lời đã sanitize.
 */
export async function askGommo(userText: string, opts: AskOptions): Promise<string> {
  const auth = loadAuth();
  if (!auth?.access_token) {
    throw new Error('Chưa đăng nhập Gommo — không thể chat.');
  }
  const cfg: GommoChatConfig = { ...GOMMO_CHAT_CONFIG, ...opts.config };
  const { accessToken, domain } = resolveChatCredentials(auth);
  const apiMode = resolveApiMode(cfg, opts);
  const sanitizeReply = shouldSanitizeReply(cfg, opts);

  const userMessageId = uuid();
  const assistantMessageId = uuid();
  const queryText = userText.trim() || 'Mô tả ảnh này giúp tôi.';

  const snapshotBlock = opts.workflowSnapshot
    ? `\n\n[Canvas hiện tại]\n${opts.workflowSnapshot}`
    : '';

  const userAttachments = serializeAttachments(opts.attachments);

  let agentMessages: ChatTurn[];
  let streamMessages: ChatTurn[];

  if (apiMode === 'agent') {
    agentMessages = [
      ...opts.history,
      {
        role: 'user',
        text: queryText,
        attachments: userAttachments.length ? userAttachments : undefined,
      },
    ];
    streamMessages = agentMessages;
  } else {
    const sendText =
      (opts.firstTurn && cfg.systemPrompt ? `${cfg.systemPrompt}\n\n` : '') +
      queryText +
      snapshotBlock;
    streamMessages = [
      ...opts.history,
      {
        role: 'user',
        text: sendText,
        attachments: userAttachments.length ? userAttachments : undefined,
      },
    ];
    agentMessages = streamMessages;
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), cfg.timeoutMs);
  const onExternalAbort = () => ac.abort();
  opts.signal?.addEventListener('abort', onExternalAbort);

  try {
    if (cfg.persistHistory) {
      await saveMessage(cfg, accessToken, domain, {
        messageId: userMessageId,
        sessionId: opts.sessionId,
        role: 'user',
        text: userText,
        attachments: userAttachments.length ? userAttachments : undefined,
        metadata: { version: 1 },
      });
    }

    let form: URLSearchParams;

    if (apiMode === 'agent') {
      await syncAgentChatModel({
        cfg,
        sessionId: opts.sessionId,
        accessToken,
        domain,
        signal: ac.signal,
      });
      form = buildAgentChatForm({
        cfg,
        accessToken,
        domain,
        sessionId: opts.sessionId,
        query: queryText,
        messages: agentMessages,
      });
    } else {
      form = buildStreamChatForm({
        cfg,
        accessToken,
        domain,
        sessionId: opts.sessionId,
        query: queryText,
        messages: streamMessages,
        userMessageId,
        assistantMessageId,
      });
    }

    const rawReply = await postChatAndReadReply(form, cfg, ac.signal, sanitizeReply, opts.onDelta);
    const reply = sanitizeReply ? resolveChatAssistantContent(rawReply) : rawReply.trim();
    if (sanitizeReply) opts.onDelta?.(reply);

    if (cfg.persistHistory) {
      await saveMessage(cfg, accessToken, domain, {
        messageId: assistantMessageId,
        sessionId: opts.sessionId,
        role: 'model',
        text: reply,
        metadata: {
          version: 1,
          agentId: cfg.agentId,
          model: cfg.model,
          server: cfg.server,
          chatApiMode: apiMode,
        },
      });
    }

    return reply;
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onExternalAbort);
  }
}
