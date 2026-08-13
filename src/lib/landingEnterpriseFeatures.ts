import { GitBranch, Headphones, Layers, Plug, Shield, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface EnterpriseFeature {
  icon: LucideIcon;
  title: string;
  desc: string;
}

export const ENTERPRISE_FEATURES: EnterpriseFeature[] = [
  {
    icon: Zap,
    title: 'Credits minh bạch',
    desc: 'Trả theo lần gen — không phí thuê bao, không phí ẩn.',
  },
  {
    icon: Layers,
    title: 'Studio đa model',
    desc: 'Ảnh, video, TTS, nhạc và chat trong một giao diện.',
  },
  {
    icon: GitBranch,
    title: 'Workflow',
    desc: 'Nối nhiều bước AI trên canvas — chạy lại với prompt mới.',
  },
  {
    icon: Plug,
    title: 'API thống nhất',
    desc: 'Một cổng cho text, ảnh và video — tích hợp vào app của bạn.',
  },
  {
    icon: Shield,
    title: 'Thanh toán PayOS',
    desc: 'Nạp credit an toàn — webhook xác nhận và cộng credit tự động.',
  },
  {
    icon: Headphones,
    title: 'Hỗ trợ 24/7',
    desc: 'Hotline, Zalo và email — phản hồi nhanh khi cần trợ giúp.',
  },
];
