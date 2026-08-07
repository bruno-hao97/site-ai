import { rebrandSiteText } from './siteConfig';

const TOOL_CALL_BLOCK_RE = /<\|tool_calls_begin\|>[\s\S]*?<\|tool_calls_end\|>/g;
const TOOL_CALL_PARTIAL_RE = /<\|tool_calls_begin\|>[\s\S]*$/;
const TOOL_CALL_MARKER_RE = /<\|tool_call[^|]*\|>/g;
const TOOL_SEP_RE = /<\|tool_sep\|>/g;

export function sanitizeChatStreamContent(raw: string, streaming = false): string {
  let out = raw.replace(TOOL_CALL_BLOCK_RE, '');
  if (streaming) out = out.replace(TOOL_CALL_PARTIAL_RE, '');
  return out.replace(TOOL_CALL_MARKER_RE, '').replace(TOOL_SEP_RE, '');
}

export function stripChatMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[-*]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '');
}

export function stripMoonVmediaBranding(text: string): string {
  return rebrandSiteText(text)
    .replace(/\bMoonix\b/gi, 'trợ lý AI')
    .replace(/\bMoon Agent\b/gi, 'trợ lý AI')
    .replace(/\bMoon\b/gi, 'trợ lý AI')
    .replace(/Mình là Moon[^.\n]*/gi, '')
    .replace(/trợ lý AI của VMedia[^.\n]*/gi, '');
}

export function stripChatDisplayText(text: string): string {
  return stripChatMarkdown(stripMoonVmediaBranding(text)).trim();
}

export function resolveChatAssistantContent(raw: string): string {
  const cleaned = stripChatDisplayText(sanitizeChatStreamContent(raw, false));
  if (cleaned) return cleaned;
  if (raw.includes('<|tool_calls_begin|>')) {
    return (
      'Model agent đang cố gọi tool (tra cứu web…) nhưng chat chưa hỗ trợ. ' +
      'Hãy đổi sang GPT-5.5 Cheap hoặc GLM-5.2 VIP, rồi hỏi lại.'
    );
  }
  return '(Không có nội dung trả lời.)';
}
