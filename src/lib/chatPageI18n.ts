import type { AppLocale, TranslationKey } from '../i18n/types';
import type { TranslateFn } from '../i18n';
import type { ChatActionPill, ChatSuggestion } from '../services/chatPageData';

export const CHAT_NEW_SESSION_MARKERS = ['Chat mới', 'New chat'] as const;

export function isNewChatSessionTitle(title: string): boolean {
  return (CHAT_NEW_SESSION_MARKERS as readonly string[]).includes(title);
}

export function displayChatSessionTitle(title: string, t: TranslateFn): string {
  return isNewChatSessionTitle(title) ? t('chat.newSession') : title;
}

function dateLocale(locale: AppLocale): string {
  return locale === 'vi' ? 'vi-VN' : 'en-US';
}

export function formatChatSessionTime(ts: number, locale: AppLocale, t: TranslateFn): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return t('chat.sessionTime.justNow');
  if (mins < 60) return t('chat.sessionTime.minutes', { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('chat.sessionTime.hours', { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t('chat.sessionTime.days', { count: days });
  return new Date(ts).toLocaleDateString(dateLocale(locale));
}

export function buildChatSuggestions(t: TranslateFn): ChatSuggestion[] {
  const items: { id: string; labelKey: TranslationKey; promptKey: TranslationKey }[] = [
    {
      id: 'chatbot-script',
      labelKey: 'chat.suggestion.chatbotScript.label',
      promptKey: 'chat.suggestion.chatbotScript.prompt',
    },
    {
      id: 'moodboard',
      labelKey: 'chat.suggestion.moodboard.label',
      promptKey: 'chat.suggestion.moodboard.prompt',
    },
    {
      id: 'landing-copy',
      labelKey: 'chat.suggestion.landingCopy.label',
      promptKey: 'chat.suggestion.landingCopy.prompt',
    },
    {
      id: 'video-hook',
      labelKey: 'chat.suggestion.videoHook.label',
      promptKey: 'chat.suggestion.videoHook.prompt',
    },
  ];
  return items.map(({ id, labelKey, promptKey }) => ({
    id,
    label: t(labelKey),
    prompt: t(promptKey),
  }));
}

export function buildChatActionPills(t: TranslateFn): ChatActionPill[] {
  return [
    {
      id: 'image',
      label: t('chat.pill.image'),
      route: '/image',
      prompt: t('chat.pill.imagePrompt'),
    },
    {
      id: 'video',
      label: t('chat.pill.video'),
      route: '/video',
      prompt: t('chat.pill.videoPrompt'),
    },
    {
      id: 'workflow',
      label: t('chat.pill.workflow'),
      route: '/workflow',
      prompt: t('chat.pill.workflowPrompt'),
    },
    {
      id: 'code',
      label: t('chat.pill.code'),
      prompt: t('chat.pill.codePrompt'),
    },
    {
      id: 'design',
      label: t('chat.pill.design'),
      prompt: t('chat.pill.designPrompt'),
    },
  ];
}
