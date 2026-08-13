import {
  Code2,
  GitBranch,
  Image as ImageIcon,
  MessageSquare,
  Mic,
  Music,
  Video,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface ProductFeature {
  title: string;
  desc: string;
}

export interface ProductTab {
  id: string;
  label: string;
  kicker: string;
  headline: string;
  lead: string;
  icon: LucideIcon;
  features: ProductFeature[];
  mockLabel: string;
  badge?: string;
}

export const PRODUCT_TABS: ProductTab[] = [
  {
    id: 'chat',
    label: 'Chat',
    kicker: 'AI Chat & Assistant',
    headline: 'Hỏi, viết, code — một cửa sổ',
    lead: 'Trợ lý đa model — ảnh, code, suy luận trong một chat.',
    icon: MessageSquare,
    mockLabel: 'Chat studio',
    features: [
      { title: 'Chat đa model', desc: 'GPT, Claude, DeepSeek — đổi model một cú click.' },
      { title: 'Phân tích hình ảnh', desc: 'Đính kèm ảnh — nhận diện, mô tả và trích thông tin.' },
      { title: 'Viết code', desc: 'Draft nhanh, giải thích logic — đa ngôn ngữ lập trình.' },
      { title: 'Suy luận sâu', desc: 'Model reasoning — phân tích phức tạp, từng bước.' },
    ],
  },
  {
    id: 'image',
    label: 'Ảnh',
    kicker: 'Thiết kế & Tạo ảnh',
    headline: 'Ảnh đẹp, chỉnh được',
    lead: 'Sinh ảnh, sửa thông minh, poster và lookbook — một studio.',
    icon: ImageIcon,
    mockLabel: 'Image studio',
    features: [
      { title: 'Tạo Ảnh AI', desc: 'FLUX, Imagen-class — photorealistic từ một dòng mô tả.' },
      { title: 'Chỉnh Sửa Ảnh', desc: 'Inpaint, thay nền, style transfer — giữ layout gốc.' },
      { title: 'Poster Marketing', desc: 'Banner, poster, visual social — typography có sẵn.' },
      { title: 'Thời Trang Ảo', desc: 'Lookbook, try-on — cho e-commerce & brand.' },
    ],
  },
  {
    id: 'video',
    label: 'Video',
    kicker: 'AI Video Studio',
    headline: 'Video trong vài phút',
    lead: 'Từ prompt hoặc ảnh tĩnh — avatar, upscale, xuất 1080p.',
    icon: Video,
    mockLabel: 'Video studio',
    features: [
      { title: 'Text-to-Video', desc: 'Prompt → video 1080p. Kling, Luma, Hailuo.' },
      { title: 'Image-to-Video', desc: 'Ảnh tĩnh thành chuyển động — giữ nhân vật, giữ bối cảnh.' },
      { title: 'Avatar Lipsync', desc: 'Ảnh + audio → avatar nói, đa ngôn ngữ.' },
      { title: 'Video Upscale', desc: 'Nâng lên 4K, khôi phục chi tiết.' },
    ],
  },
  {
    id: 'audio',
    label: 'Âm thanh',
    kicker: 'Âm nhạc & Giọng nói',
    headline: 'Giọng nói và nhạc hoàn chỉnh',
    lead: 'TTS tự nhiên, nhạc theo mood — gắn thẳng vào video.',
    icon: Mic,
    mockLabel: 'Audio studio',
    features: [
      { title: 'Text-to-Speech', desc: 'Giọng tự nhiên, đa ngôn ngữ — gắn thẳng vào video.' },
      { title: 'Tạo Nhạc AI', desc: 'Nhạc nền, jingle, soundtrack theo mood bạn chọn.' },
    ],
  },
  {
    id: 'workflow',
    label: 'Workflow',
    badge: 'New',
    kicker: 'Workflow & Tự động hóa',
    headline: 'Chuỗi tác vụ AI liên kết',
    lead: 'Nối ảnh → video → giọng nói trong một flow — không cần chuyển app.',
    icon: GitBranch,
    mockLabel: 'Workflow builder',
    features: [
      { title: 'Node canvas', desc: 'Kéo thả bước xử lý — preview từng output.' },
      { title: 'Đa model', desc: 'Chọn model khác nhau cho từng bước trong pipeline.' },
      { title: 'Tái sử dụng', desc: 'Lưu template workflow — chạy lại với prompt mới.' },
    ],
  },
];

export const CATEGORY_ITEMS = [
  { id: 'image', label: 'Ảnh', icon: ImageIcon, types: ['image'] as const },
  { id: 'video', label: 'Video', icon: Video, types: ['video', 'avatar-lipsync'] as const },
  { id: 'tts', label: 'Giọng nói', icon: Mic, types: ['tts'] as const },
  { id: 'music', label: 'Nhạc', icon: Music, types: ['music'] as const },
  { id: 'chat', label: 'Chat', icon: MessageSquare, types: [] as const },
  { id: 'workflow', label: 'Workflow', icon: Code2, types: [] as const },
];
