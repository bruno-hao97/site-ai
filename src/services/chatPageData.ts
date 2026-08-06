export interface ChatSuggestion {
  id: string;
  label: string;
  prompt: string;
}

export interface ChatActionPill {
  id: string;
  label: string;
  /** Route navigate hoặc null = fill prompt */
  route?: string;
  prompt?: string;
}

export const CHAT_SUGGESTIONS: ChatSuggestion[] = [
  {
    id: 'chatbot-script',
    label: 'Viết kịch bản chatbot',
    prompt:
      'Viết kịch bản chatbot chăm sóc khách hàng cho shop thời trang online, tone thân thiện, 5–7 lượt hội thoại mẫu.',
  },
  {
    id: 'moodboard',
    label: 'Tạo moodboard visual',
    prompt:
      'Gợi ý moodboard visual cho thương hiệu cà phê specialty: palette màu, typography, texture, 5 keyword style.',
  },
  {
    id: 'landing-copy',
    label: 'Copy landing page SaaS',
    prompt:
      'Viết hero + 3 benefit + CTA cho landing page SaaS quản lý dự án AI, đối tượng startup Việt Nam.',
  },
  {
    id: 'video-hook',
    label: 'Hook video TikTok',
    prompt:
      'Viết 5 hook mở đầu video TikTok 15 giây quảng cáo khóa học lập trình, gây tò mò, có emoji gợi ý.',
  },
];

export const CHAT_ACTION_PILLS: ChatActionPill[] = [
  { id: 'image', label: 'Tạo Ảnh', route: '/image', prompt: 'Tôi muốn tạo ảnh: ' },
  { id: 'video', label: 'Tạo video', route: '/video', prompt: 'Tôi muốn tạo video: ' },
  { id: 'workflow', label: 'Workflow', route: '/workflow', prompt: 'Tạo workflow: ' },
  { id: 'code', label: 'Code', prompt: 'Giúp tôi viết code: ' },
  { id: 'design', label: 'Design', prompt: 'Gợi ý thiết kế UI/UX: ' },
];

/** Key sessionStorage cho deep link ?create=mini_app */
export const MINI_APP_PROMPT_KEY = 'chat_mini_app_prompt';

/** Key sessionStorage chuyển prompt sang studio/workflow */
export const CHAT_STUDIO_PROMPT_KEY = 'chat_studio_prompt';

export function consumeChatStudioPrompt(): string | null {
  try {
    const raw = sessionStorage.getItem(CHAT_STUDIO_PROMPT_KEY);
    if (raw) {
      sessionStorage.removeItem(CHAT_STUDIO_PROMPT_KEY);
      return raw;
    }
  } catch {
    /* ignore */
  }
  return null;
}
