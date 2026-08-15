import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SITE_DISPLAY_NAME } from '../services/siteConfig';
import ChatAiModelPickerModal from '../components/ChatAiModelPickerModal';
import ChatSidebar from '../components/chat/ChatSidebar';
import ChatTopBar from '../components/chat/ChatTopBar';
import ChatHero from '../components/chat/ChatHero';
import ChatCompose, { type ChatAttachmentPreview } from '../components/chat/ChatCompose';
import ChatSuggestions from '../components/chat/ChatSuggestions';
import ChatMessageList from '../components/chat/ChatMessageList';
import ChatMarketplaceStrip from '../components/chat/ChatMarketplaceStrip';
import ChatMarketsModal from '../components/chat/ChatMarketsModal';
import { askGommo, isGommoChatConfigured, type ChatAttachment, type ChatTurn } from '../services/gommoChat';
import {
  loadChatPageModelId,
  resolveChatAiModel,
  saveChatPageModelId,
} from '../services/chatAiModels';
import {
  loadChatPageAgentId,
  resolveChatAgent,
} from '../services/chatAgents';
import { resolveQuickChatContext } from '../services/quickChatContext';
import {
  CHAT_STUDIO_PROMPT_KEY,
  MINI_APP_PROMPT_KEY,
  type ChatActionPill,
} from '../services/chatPageData';
import { fetchMiniAppInfo, type MarketplaceApp } from '../services/miniAppsApi';
import { uploadQuickImage } from '../services/quickCreate';
import { notifyCreditsUpdated, refreshSession } from '../services/authStore';
import {
  MOON_CHAT_AGENT_ID,
  MOON_CHAT_PROJECT_ID,
} from '../services/gommoChatConfig';
import {
  assignChatSession,
  getItemProjectId,
  removeItem,
  syncChatProjectItem,
} from '../services/projectStore';
import {
  deleteChatSession,
  deriveSessionTitle,
  listChatSessions,
  loadChatSession,
  newChatMessageId,
  newChatSessionId,
  onChatSessionsUpdated,
  saveChatSession,
  type ChatMessage,
  type ChatSessionSummary,
} from '../services/chatSessionsLocal';
import { useLocale } from '../i18n';
import {
  buildChatActionPills,
  buildChatSuggestions,
  displayChatSessionTitle,
  isNewChatSessionTitle,
} from '../lib/chatPageI18n';

type ChatView = 'landing' | 'thread';

type ChatProjectFilter = string | null;

export default function ChatPage() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const chatSuggestions = useMemo(() => buildChatSuggestions(t), [t]);
  const chatActionPills = useMemo(() => buildChatActionPills(t), [t]);

  const [sessions, setSessions] = useState<ChatSessionSummary[]>(() => listChatSessions());
  const [sessionId, setSessionId] = useState(() => newChatSessionId());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionTitle, setSessionTitle] = useState(() => t('chat.newSession'));
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<ChatAttachmentPreview | null>(null);
  const [thinking, setThinking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [modelId, setModelId] = useState(() => loadChatPageModelId());
  const [agentId] = useState(() => loadChatPageAgentId());
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [marketsOpen, setMarketsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<ChatProjectFilter>(null);

  const abortRef = useRef<AbortController | null>(null);
  const selectedModel = resolveChatAiModel(modelId);
  const selectedAgent = resolveChatAgent(agentId);
  const chatCtx = resolveQuickChatContext('/chat');
  const view: ChatView = messages.length === 0 ? 'landing' : 'thread';

  const refreshSessions = useCallback(() => {
    setSessions(listChatSessions());
  }, []);

  useEffect(() => {
    const shown = displayChatSessionTitle(sessionTitle, t);
    document.title = isNewChatSessionTitle(sessionTitle)
      ? `${t('chat.page.title')} · ${SITE_DISPLAY_NAME}`
      : `${shown} · ${t('chat.page.title')}`;
    return () => {
      document.title = SITE_DISPLAY_NAME;
    };
  }, [sessionTitle, t]);

  useEffect(() => onChatSessionsUpdated(refreshSessions), [refreshSessions]);

  const syncSessionUrl = useCallback(
    (id: string, replace = false) => {
      setSearchParams({ session: id }, { replace });
    },
    [setSearchParams],
  );

  const loadSessionById = useCallback(
    (id: string, pushUrl = true) => {
      abortRef.current?.abort();
      abortRef.current = null;
      const data = loadChatSession(id);
      if (!data) return false;
      setSessionId(data.sessionId);
      setMessages(data.messages);
      setSessionTitle(data.title);
      if (data.modelId) setModelId(data.modelId);
      setInput('');
      setAttachment(null);
      setErrorBanner(null);
      if (pushUrl) syncSessionUrl(id, true);
      return true;
    },
    [syncSessionUrl],
  );

  useEffect(() => {
    const urlSession = searchParams.get('session');
    if (urlSession) {
      loadSessionById(urlSession, false);
    } else {
      syncSessionUrl(sessionId, true);
    }
    const create = searchParams.get('create');
    if (create !== 'mini_app') return;
    try {
      const prompt = sessionStorage.getItem(MINI_APP_PROMPT_KEY);
      if (prompt) {
        setInput(prompt);
        sessionStorage.removeItem(MINI_APP_PROMPT_KEY);
      }
    } catch {
      /* ignore */
    }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('create');
      return next;
    }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const miniAppId = searchParams.get('mini_app')?.trim();
    if (!miniAppId) return;

    let cancelled = false;
    (async () => {
      try {
        const app = await fetchMiniAppInfo(miniAppId);
        if (cancelled) return;
        setInput(
          app.description
            ? t('chat.page.miniAppGuide', { name: app.name, description: app.description })
            : t('chat.page.miniAppGuideSimple', { name: app.name }),
        );
      } catch {
        if (!cancelled) setInput(t('chat.page.miniAppGuideFallback', { id: miniAppId }));
      }
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('mini_app');
        return next;
      }, { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    return () => {
      if (attachment?.url.startsWith('blob:')) URL.revokeObjectURL(attachment.url);
    };
  }, [attachment]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const persistSession = useCallback(
    (nextMessages: ChatMessage[], title?: string, midStream = false) => {
      const titleToUse = title ?? sessionTitle;
      const now = Date.now();
      saveChatSession({
        sessionId,
        title: titleToUse,
        updatedAt: now,
        messages: nextMessages,
        modelId,
        agentId,
      });
      const hasUserMsg = nextMessages.some((m) => m.role === 'user');
      if (hasUserMsg) {
        if (getItemProjectId(sessionId)) {
          syncChatProjectItem(sessionId, titleToUse, now);
        } else {
          assignChatSession(sessionId, titleToUse, {
            projectId: projectFilter && projectFilter !== '__unassigned__' ? projectFilter : null,
            updatedAt: now,
          });
        }
      }
      if (!midStream) refreshSessions();
    },
    [sessionId, sessionTitle, modelId, agentId, projectFilter, refreshSessions],
  );

  const startNewChat = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (attachment?.url.startsWith('blob:')) URL.revokeObjectURL(attachment.url);
    setAttachment(null);
    setInput('');
    setMessages([]);
    setSessionTitle(t('chat.newSession'));
    const id = newChatSessionId();
    setSessionId(id);
    setSidebarOpen(false);
    setErrorBanner(null);
    syncSessionUrl(id, true);
  }, [attachment, syncSessionUrl, t]);

  const handleDeleteSession = useCallback(
    (id: string) => {
      if (!window.confirm(t('chat.page.deleteConfirm'))) return;
      deleteChatSession(id);
      removeItem(id);
      if (id === sessionId) startNewChat();
    },
    [sessionId, startNewChat, t],
  );

  const patchAssistant = (id: string, content: string) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content } : m)));
  };

  const refreshCredits = async () => {
    try {
      await refreshSession();
      notifyCreditsUpdated();
    } catch {
      /* ignore */
    }
  };

  const sendMessage = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if ((!text && !attachment) || thinking || uploading) return;

    if (!isGommoChatConfigured()) {
      setErrorBanner(t('chat.page.loginRequired'));
      return;
    }

    setErrorBanner(null);
    setInput('');
    const previewUrl = attachment?.url;
    const userMsg: ChatMessage = {
      id: newChatMessageId(),
      role: 'user',
      content: text,
      imageUrl: previewUrl,
    };
    const assistantId = newChatMessageId();
    const isFirstTurn = messages.length === 0;
    const nextTitle = isFirstTurn
      ? deriveSessionTitle(text || attachment?.name || t('chat.newSession'))
      : sessionTitle;
    if (isFirstTurn) {
      setSessionTitle(nextTitle);
      syncSessionUrl(sessionId, true);
    }

    const history: ChatTurn[] = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      text: m.content,
      attachments: m.imageUrl && !m.imageUrl.startsWith('blob:')
        ? [{ type: 'image' as const, url: m.imageUrl }]
        : undefined,
    }));

    let apiAttachments: ChatAttachment[] | undefined;
    if (attachment?.file) {
      try {
        setUploading(true);
        const cdnUrl = await uploadQuickImage(attachment.file);
        if (!cdnUrl) throw new Error(t('chat.page.uploadFailed'));
        apiAttachments = [
          {
            type: 'image',
            url: cdnUrl,
            name: attachment.name,
            mime_type: attachment.file.type,
          },
        ];
        userMsg.imageUrl = cdnUrl;
      } catch (err) {
        setUploading(false);
        const msg = err instanceof Error ? err.message : String(err);
        setErrorBanner(t('chat.page.uploadError', { msg }));
        setInput(text);
        return;
      } finally {
        setUploading(false);
      }
    } else if (attachment?.url && !attachment.url.startsWith('blob:')) {
      apiAttachments = [{ type: 'image', url: attachment.url, name: attachment.name }];
    }

    const nextMessages: ChatMessage[] = [
      ...messages,
      userMsg,
      { id: assistantId, role: 'assistant', content: '' },
    ];
    setMessages(nextMessages);
    persistSession(nextMessages, nextTitle, true);

    if (attachment?.url.startsWith('blob:')) URL.revokeObjectURL(attachment.url);
    setAttachment(null);

    const ac = new AbortController();
    abortRef.current = ac;
    setThinking(true);

    let acc = '';
    try {
      acc = await askGommo(text || t('chat.page.describeImage'), {
        history,
        firstTurn: isFirstTurn,
        sessionId,
        attachments: apiAttachments,
        signal: ac.signal,
        config: {
          model: selectedModel.model,
          server: selectedModel.server,
          agentId: selectedAgent.agentId || MOON_CHAT_AGENT_ID,
          projectId: MOON_CHAT_PROJECT_ID,
          chatApiMode: apiAttachments?.length ? 'stream' : 'agent',
          systemPrompt: chatCtx.systemPrompt,
        },
        onDelta: (display) => {
          acc = display;
          patchAssistant(assistantId, display);
        },
      });
      patchAssistant(assistantId, acc);
      const finalMessages = nextMessages.map((m) =>
        m.id === assistantId ? { ...m, content: acc } : m,
      );
      persistSession(finalMessages, nextTitle);
      void refreshCredits();
    } catch (err) {
      if (ac.signal.aborted) {
        const partial = acc.trim() || t('chat.page.stopped');
        patchAssistant(assistantId, partial);
        persistSession(
          nextMessages.map((m) => (m.id === assistantId ? { ...m, content: partial } : m)),
          nextTitle,
        );
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        const errText = t('chat.page.error', { msg });
        patchAssistant(assistantId, errText);
        setErrorBanner(msg);
        persistSession(
          nextMessages.map((m) => (m.id === assistantId ? { ...m, content: errText } : m)),
          nextTitle,
        );
      }
    } finally {
      setThinking(false);
      abortRef.current = null;
    }
  };

  const onPickFile = (file: File | null) => {
    if (!file) return;
    if (attachment?.url.startsWith('blob:')) URL.revokeObjectURL(attachment.url);
    setAttachment({ url: URL.createObjectURL(file), name: file.name, file });
  };

  const onRemoveAttachment = () => {
    if (attachment?.url.startsWith('blob:')) URL.revokeObjectURL(attachment.url);
    setAttachment(null);
  };

  const onSelectModel = (id: string) => {
    setModelId(id);
    saveChatPageModelId(id);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/chat?session=${encodeURIComponent(sessionId)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: sessionTitle, url });
      } else {
        await navigator.clipboard.writeText(url);
        setErrorBanner(null);
        window.alert(t('chat.page.shareCopied'));
      }
    } catch {
      /* cancelled */
    }
  };

  const handleActionPill = (pill: ChatActionPill) => {
    const prompt = pill.prompt ?? '';
    if (pill.route) {
      try {
        sessionStorage.setItem(CHAT_STUDIO_PROMPT_KEY, input.trim() || prompt);
      } catch {
        /* ignore */
      }
      navigate(pill.route);
      return;
    }
    setInput(prompt + input);
    textareaFocus();
  };

  const textareaFocus = () => {
    requestAnimationFrame(() => {
      document.querySelector<HTMLTextAreaElement>('.chat-compose-input')?.focus();
    });
  };

  const handleMarketplaceApp = (app: MarketplaceApp) => {
    setInput(
      app.description
        ? t('chat.page.miniAppGuide', { name: app.title, description: app.description })
        : t('chat.page.miniAppGuideSimple', { name: app.title }),
    );
    textareaFocus();
  };

  return (
    <div className="chat-page">
      <ChatSidebar
        sessions={sessions}
        activeSessionId={sessionId}
        agentId={agentId}
        projectFilter={projectFilter}
        onProjectFilterChange={setProjectFilter}
        onSelectSession={(id) => loadSessionById(id)}
        onNewChat={startNewChat}
        onDeleteSession={handleDeleteSession}
        mobileOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
      />

      <div className="chat-main">
        <ChatTopBar
          model={selectedModel}
          agent={selectedAgent}
          sessionTitle={sessionTitle}
          onOpenModelPicker={() => setModelPickerOpen(true)}
          onNewChat={startNewChat}
          onOpenSidebar={() => setSidebarOpen(true)}
          onShare={handleShare}
        />

        {errorBanner && (
          <div className="chat-error-banner" role="alert">
            {errorBanner}
            <button type="button" onClick={() => setErrorBanner(null)} aria-label={t('chat.page.closeBanner')}>
              ×
            </button>
          </div>
        )}

        {view === 'landing' ? (
          <div className="chat-landing">
            <ChatHero model={selectedModel} />
            <ChatCompose
              value={input}
              onChange={setInput}
              attachment={attachment}
              onPickFile={onPickFile}
              onRemoveAttachment={onRemoveAttachment}
              onSend={() => void sendMessage()}
              onStop={() => abortRef.current?.abort()}
              onActionPill={handleActionPill}
              actionPills={chatActionPills}
              thinking={thinking}
              uploading={uploading}
            />
            <ChatSuggestions
              suggestions={chatSuggestions}
              onSelect={(prompt) => void sendMessage(prompt)}
              onFill={setInput}
              disabled={thinking || uploading}
            />
            <ChatMarketplaceStrip
              onOpenApp={handleMarketplaceApp}
              onViewAll={() => setMarketsOpen(true)}
            />
          </div>
        ) : (
          <div className="chat-thread">
            <ChatMessageList messages={messages} thinking={thinking} />
            <ChatCompose
              value={input}
              onChange={setInput}
              attachment={attachment}
              onPickFile={onPickFile}
              onRemoveAttachment={onRemoveAttachment}
              onSend={() => void sendMessage()}
              onStop={() => abortRef.current?.abort()}
              onActionPill={handleActionPill}
              actionPills={chatActionPills}
              thinking={thinking}
              uploading={uploading}
              compact
            />
          </div>
        )}
      </div>

      <ChatAiModelPickerModal
        open={modelPickerOpen}
        selectedId={modelId}
        onSelect={onSelectModel}
        onClose={() => setModelPickerOpen(false)}
      />

      <ChatMarketsModal
        open={marketsOpen}
        onClose={() => setMarketsOpen(false)}
        onOpenApp={handleMarketplaceApp}
      />
    </div>
  );
}
