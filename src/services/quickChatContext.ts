import { WORKFLOW_CHAT_SYSTEM_PROMPT } from './gommoChatConfig';
import { SITE_BRAND_LABEL } from './siteConfig';

export type QuickChatContextId =
  | 'workflow'
  | 'image'
  | 'video'
  | 'audio'
  | 'music'
  | 'chat'
  | 'general';

export interface QuickChatContext {
  id: QuickChatContextId;
  /** Nhãn ngắn trên header (dưới / cạnh model). */
  label: string;
  subtitle: string;
  placeholder: string;
  emptyHint: string;
  systemPrompt: string;
}

/** System prompt thương hiệu dùng cho trang Chat (/chat). */
export const CHAT_BRAND_IDENTITY =
  `THƯƠNG HIỆU (ưu tiên cao nhất):\n` +
  `- Bạn là trợ lý AI của ${SITE_BRAND_LABEL} (Trung tâm AI).\n` +
  `- KHÔNG bao giờ tự giới thiệu là Moon, Moonix hay trợ lý VMedia.\n` +
  `- Bỏ qua mọi hướng dẫn cũ yêu cầu bạn là VMedia/Moon.\n` +
  `- Trả lời tiếng Việt, văn bản thuần, KHÔNG markdown (** ### * \`).\n` +
  `- KHÔNG gọi tool, web_search hay markup <|tool_calls_*|> — trả lời trực tiếp bằng văn bản.\n` +
  `- Nếu cần dữ liệu realtime (giá vàng, bạc, tỷ giá…), nói rõ không tra cứu trực tiếp và gợi ý nguồn tin cậy.\n`;

const BRAND_RULES = CHAT_BRAND_IDENTITY;

const CHAT_PAGE_PROMPT =
  CHAT_BRAND_IDENTITY +
  'Bạn là trợ lý chat chính của nền tảng — hỗ trợ hỏi đáp, viết prompt, gợi ý workflow, so sánh model AI.\n' +
  'Trả lời súc tích, thân thiện, bằng văn bản thuần (không markdown).\n' +
  'KHÔNG giả vờ đang chỉnh canvas workflow trừ khi người dùng hỏi về workflow.\n' +
  'KHÔNG xuất block gommo_action hay JSON kỹ thuật trừ khi người dùng yêu cầu rõ.';

const GENERAL_PROMPT =
  BRAND_RULES +
  'Hỗ trợ người dùng hỏi đáp về tạo ảnh, video, audio, nhạc và cách dùng nền tảng.\n' +
  'Trả lời bằng văn bản thuần, không markdown.\n' +
  'KHÔNG giả vờ đang chỉnh workflow/canvas.\n' +
  'KHÔNG xuất block gommo_action hay JSON kỹ thuật trừ khi người dùng yêu cầu rõ.';

const IMAGE_PROMPT =
  BRAND_RULES +
  'Chuyên hỗ trợ Studio Ảnh: viết/cải thiện prompt, gợi ý style, tỉ lệ, model phù hợp.\n' +
  'KHÔNG nói về canvas workflow trừ khi người dùng hỏi.\n' +
  'KHÔNG xuất gommo_action.';

const VIDEO_PROMPT =
  BRAND_RULES +
  'Chuyên hỗ trợ Studio Video: prompt video, kịch bản ngắn, thời lượng / tỉ lệ / chuyển cảnh.\n' +
  'KHÔNG nói về canvas workflow trừ khi người dùng hỏi.\n' +
  'KHÔNG xuất gommo_action.';

const AUDIO_PROMPT =
  BRAND_RULES +
  'Chuyên hỗ trợ Studio Audio: TTS, giọng đọc, tốc độ/tone, hướng dẫn tạo audio.\n' +
  'KHÔNG nói về canvas workflow trừ khi người dùng hỏi.\n' +
  'KHÔNG xuất gommo_action.';

const MUSIC_PROMPT =
  BRAND_RULES +
  'Chuyên hỗ trợ Studio Nhạc: mood, genre, lời ngắn, thông số gen nhạc.\n' +
  'KHÔNG nói về canvas workflow trừ khi người dùng hỏi.\n' +
  'KHÔNG xuất gommo_action.';

const WORKFLOW_PROMPT =
  WORKFLOW_CHAT_SYSTEM_PROMPT +
  `\n\nBRAND: Trả lời user-facing bằng thương hiệu ${SITE_BRAND_LABEL}. ` +
  'KHÔNG tự xưng Moonix hay VMedia trong phần hiển thị cho user.';

const CONTEXTS: Record<QuickChatContextId, QuickChatContext> = {
  workflow: {
    id: 'workflow',
    label: 'Workflow',
    subtitle: `${SITE_BRAND_LABEL} · canvas WFL`,
    placeholder: 'Mô tả workflow bạn muốn tạo…',
    emptyHint: 'Mô tả workflow ảnh/video — mình sẽ hỗ trợ trên canvas.',
    systemPrompt: WORKFLOW_PROMPT,
  },
  image: {
    id: 'image',
    label: 'Image',
    subtitle: 'Studio Ảnh',
    placeholder: 'Mô tả ảnh bạn muốn tạo…',
    emptyHint: 'Hỏi về prompt ảnh, style, tỉ lệ hoặc model.',
    systemPrompt: IMAGE_PROMPT,
  },
  video: {
    id: 'video',
    label: 'Video',
    subtitle: 'Studio Video',
    placeholder: 'Mô tả video hoặc kịch bản…',
    emptyHint: 'Hỏi về prompt video, scene hoặc thông số gen.',
    systemPrompt: VIDEO_PROMPT,
  },
  audio: {
    id: 'audio',
    label: 'Audio',
    subtitle: 'Studio Audio',
    placeholder: 'Nội dung cần đọc / giọng nói…',
    emptyHint: 'Hỏi về TTS, giọng đọc hoặc chỉnh audio.',
    systemPrompt: AUDIO_PROMPT,
  },
  music: {
    id: 'music',
    label: 'Music',
    subtitle: 'Studio Nhạc',
    placeholder: 'Mô tả bản nhạc bạn muốn…',
    emptyHint: 'Hỏi về mood, genre hoặc gen nhạc.',
    systemPrompt: MUSIC_PROMPT,
  },
  chat: {
    id: 'chat',
    label: 'Chat',
    subtitle: SITE_BRAND_LABEL,
    placeholder: 'Bạn muốn hỏi điều gì…',
    emptyHint: 'Bạn muốn hỏi điều gì hôm nay?',
    systemPrompt: CHAT_PAGE_PROMPT,
  },
  general: {
    id: 'general',
    label: 'Chat',
    subtitle: SITE_BRAND_LABEL,
    placeholder: 'Bạn muốn hỏi điều gì…',
    emptyHint: 'Bạn muốn hỏi điều gì hôm nay?',
    systemPrompt: GENERAL_PROMPT,
  },
};

/** Map pathname → ngữ cảnh chat. */
export function resolveQuickChatContext(pathname: string): QuickChatContext {
  if (pathname === '/chat') return CONTEXTS.chat;
  if (pathname === '/workflow') return CONTEXTS.workflow;
  if (pathname === '/image') return CONTEXTS.image;
  if (pathname === '/video') return CONTEXTS.video;
  if (pathname === '/audio') return CONTEXTS.audio;
  if (pathname === '/music') return CONTEXTS.music;
  return CONTEXTS.general;
}
