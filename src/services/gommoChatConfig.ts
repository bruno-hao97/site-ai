/** Cấu hình tĩnh cho chat agent Gommo. Token/domain lấy runtime từ authStore. */
export type GommoChatApiMode = 'agent' | 'stream';

export const MOON_CHAT_AGENT_ID = '560ee19d40623da6851a1bd0af0930dd';
export const WORKFLOW_CHAT_AGENT_ID = 'd234b19ae119f741696eafa913d246cc';
export const WORKFLOW_CHAT_PROJECT_ID = '55004151b482b646';
export const MOON_CHAT_PROJECT_ID = 'default';

/** System prompt workflow canvas — dùng khi chatApiMode = stream. */
export const WORKFLOW_CHAT_SYSTEM_PROMPT =
  'Bạn là trợ lý chỉnh workflow tạo ảnh/video trên canvas.\n' +
  'Trả lời bằng tiếng Việt.\n\n' +
  'PHẦN HIỂN THỊ CHO USER (bắt buộc, ngắn gọn):\n' +
  '- Chỉ 2–4 câu tóm tắt: đã làm gì trên canvas (vd: Start → Tạo ảnh prompt X → Output).\n' +
  '- KHÔNG dùng heading ##, KHÔNG liệt kê "Action dự kiến", KHÔNG lặp lại Add/Connect trong prose.\n' +
  '- KHÔNG giải thích dài, KHÔNG ghi chú kỹ thuật.\n\n' +
  'PHẦN KỸ THUẬT (cuối câu trả lời, UI sẽ ẩn):\n' +
  '- Một block ```gommo_action với capabilityId "workflow.edit", input.actions[] (add_node với node{id,type,data}, connect, update_node).\n' +
  '- Map generate-image → type "image". Node: start, image, output, end.\n' +
  '- Tạo WFL ảnh: Start → Image (data.prompt) → Output, nối tuần tự.\n' +
  '- Xóa hết node: delete_all hoặc layout [].';

export interface GommoChatConfig {
  baseUrl: string;
  server: string;
  model: string;
  agentId: string;
  projectId: string;
  chatApiMode: GommoChatApiMode;
  chatSource: string;
  /** false = giữ raw reply (workflow gommo_action, composer JSON). */
  sanitizeReply?: boolean;
  deviceId: string;
  deviceName: string;
  persistHistory: boolean;
  timeoutMs: number;
  systemPrompt?: string;
}

/** Mặc định trang /chat — Moon agent + action=chat. Workflow override chatApiMode + agent. */
export const GOMMO_CHAT_CONFIG: GommoChatConfig = {
  baseUrl: '/api/v2',
  server: 'cheap',
  model: 'gpt-5.5::cheap',
  agentId: MOON_CHAT_AGENT_ID,
  projectId: MOON_CHAT_PROJECT_ID,
  chatApiMode: 'agent',
  chatSource: 'vmedia',
  deviceId: 'd991c6e9-5f3a-4d52-8065-728e3c260e11',
  deviceName: 'AICenter',
  persistHistory: true,
  timeoutMs: 120_000,
};

/** Override cho workflow / composer — stream + workflow agent. */
export const WORKFLOW_CHAT_CONFIG: Partial<GommoChatConfig> = {
  agentId: WORKFLOW_CHAT_AGENT_ID,
  projectId: WORKFLOW_CHAT_PROJECT_ID,
  chatApiMode: 'stream',
  systemPrompt: WORKFLOW_CHAT_SYSTEM_PROMPT,
  sanitizeReply: false,
};
