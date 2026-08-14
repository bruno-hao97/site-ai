/** Layout constants for the hero capability ticker. */
export const HERO_CAPABILITY_ITEM_HEIGHT_PX = 64;
export const HERO_CAPABILITY_VIEWPORT_HEIGHT_PX = 280;

/** @deprecated Use getHeroCapabilities() from landingI18n.ts — labels are locale-aware. */
export const HERO_CAPABILITIES = [
  'Tạo ảnh AI',
  'Chỉnh sửa ảnh',
  'Text-to-video',
  'Image-to-video',
  'Avatar lipsync',
  'Upscale lên 4K',
  'Giọng nói TTS',
  'Tạo nhạc AI',
  'Xây workflow',
  'Chat đa model',
  'Phân tích hình ảnh',
  'Xóa nền ảnh',
] as const;
