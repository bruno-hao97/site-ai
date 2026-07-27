# SPEC-SITE-AI

Tài liệu spec đầy đủ cho repo **site-ai** — merge theo TOC chuẩn. Mỗi chủ đề xuất hiện **một lần**; cross-link `→ chi tiết §X` thay vì lặp nội dung.

**Nguồn:** đọc trực tiếp codebase (`AGENTS.md`, `.env.example`, `src/`, `server/`).  
**Cập nhật:** 2026-07-27

---

## §1 Overview & stack

| Thành phần | Công nghệ / deploy |
|-----------|-------------------|
| Frontend | Vite + React 19 + React Router → **Vercel** (`trungtamai.vn`) |
| Backend | Express (TypeScript) → **Railway** (`api.trungtamai.vn`) |
| Upstream AI/media | **Gommo** (`vmedia.ai`, `api.gommo.net`, `v2.api.gommo.net`) qua proxy |
| Thanh toán nạp credit | **PayOS** → webhook → `sendBalances` (Gommo merchant) |
| Push (optional) | OneSignal — setup từ `upstream_me.domainInfo` sau login |

**Entry points:**

- FE: `src/main.tsx` → `src/App.tsx`
- BE: `server/index.ts`

**Tham chiếu nhanh:** `AGENTS.md`, `.cursor/rules/gommo-mcp.mdc`

---

## §2 Hai lớp: Cursor MCP vs Site runtime

### Lớp A — Cursor MCP (IDE only)

- MCP server: **`user-79ai`** (UI hiện `79ai`)
- Dùng khi dev trong Cursor: `gommo_account_info`, `gommo_credit_balance`, `gommo_models_list`, `gommo_image_create`, `gommo_video_create`, `gommo_image_status`, `gommo_video_status`, `gommo_task_stream`, `gommo_notify_send`
- Gen media **trừ credit** → cần duyệt trước khi create
- **Không** nhúng MCP vào browser runtime

### Lớp B — Site runtime (browser + Express)

- FE: `GommoClient` (`src/services/api.ts`), `askGommo` chat → §7
- BE proxy: `/v2`, `/ai`, `/api/v2`, `/api/apps/go-mmo` → §4
- Site-owned: PayOS topup, Telegram bot admin, ops status

### Phân biệt bắt buộc

| | Cursor GenerateImage | MCP `gommo_*_create` | `askGommo` chat |
|--|---------------------|----------------------|-----------------|
| Môi trường | Cursor IDE | Cursor IDE | Browser |
| Mục đích | Asset nội bộ IDE | Gen media Gommo (trừ credit) | Chat / agent / prompt AI |
| Proxy site | Không | Không | `/api/v2/chat` |

Telegram **site bot** (`TELEGRAM_*`) ≠ Gommo `gommo_notify_send` (cần link Telegram trên tài khoản Gommo).

---

## §3 Surfaces (FE routes & layout)

Nguồn: `src/App.tsx`

### Routes

| Path | Page | Ghi chú |
|------|------|---------|
| `/` | LandingPage | Public |
| `/login`, `/register` | LoginPage, RegisterPage | Redirect `/home` nếu đã login |
| `/home` | HomePage | Protected |
| `/explore` | ExplorePage | Protected |
| `/projects` | ProjectsPage | Protected |
| `/workflow` | WorkflowPage | Protected; full-bleed; ẩn header |
| `/audio` | AudioPage | Protected; full-bleed |
| `/image`, `/video`, `/music` | StudioPage (`layout="composer"`) | Protected; full-bleed |
| `/app` | Redirect → `/image` | |
| `/profile` | ProfilePage | Protected |
| `/playground` | ApiPlaygroundPage | Protected |
| `/settings`, `/settings/tokens` | SettingsPage, SettingsTokensPage | Protected |
| `/usage-history`, `/usage-history/:type` | UsageHistoryPage | Protected |
| `/studio-history`, `/studio-history/:type` | StudioHistoryPage | Protected |
| `/history`, `/history/:type` | Redirect → studio-history | |
| `/account`, `/account/promo`, `/account/subscription`, `/account/transfer`, `/account/transactions` | AccountLayout + subpages | Protected |
| `/account/topup` | Redirect → `/pricing` | |
| `/dashboard` | DashboardPage | Protected |
| `/wallet` | WalletPage | Protected |
| `/pricing` | PricingPage | Protected (topup PayOS) |
| `*` | Redirect → `/` | |

**Main nav** (logged in): `/home`, `/explore`, `/projects`, `/image`, `/video`, `/audio`, `/music`, `/workflow`

### Layout flags (`AppShell`)

| Flag | Điều kiện | Hiệu ứng |
|------|-----------|----------|
| `isBarePage` | `/`, `/login`, `/register` | Không wrapper `.app`, không header |
| `isWorkflow` | `/workflow` | `hideHeader`, class `app-main-workflow` |
| `isFullBleed` | studio paths, `/audio`, `/workflow` | `app-main-full` |
| `hideHeader` | bare hoặc workflow | Không render `AppHeader` |
| `showQuickChat` | logged in && !bare && !`/workflow` | Mount `QuickChatWidget` FAB |

### Global widgets

- **`AppHeader`**: nav, locale, credits, link pricing, `UserMenuDropdown`
- **`QuickChatWidget`**: FAB chat toàn site — chi tiết API → §7
- **`ProtectedRoute`**: gate routes cần login

### Surfaces theo domain (link chi tiết)

| Surface | File chính | Spec |
|---------|-----------|------|
| Studio composer | `src/pages/StudioPage.tsx` | §8 (media), §7 (Video Agent, Prompt AI) |
| Workflow canvas | `src/pages/WorkflowPage.tsx` | §9, §7 (Workflow Agent) |
| Pricing / topup | `src/pages/PricingPage.tsx` | §10 |
| Auth | `LoginPage`, `RegisterPage`, `authStore` | §6 |

---

## §4 Proxy & routing (dev vs prod)

**Chat contract (payload/response): → chi tiết §7**

### Dev — Vite (`vite.config.ts`, port 5173)

Thứ tự rule proxy **quan trọng** (specific trước catch-all):

| Path FE | Target | Ghi chú |
|---------|--------|---------|
| `/api/apps/go-mmo` | `https://api.gommo.net` | Auth upstream thẳng |
| `/api/v2` | `https://api.gommo.net` | **Chat dev không qua Express** |
| `/api/auth`, `/api/payos`, `/api/telegram`, `/api/ops` | `http://localhost:3001` | Site API |
| `/api` (catch-all) | `http://localhost:3001` | |
| `/ai`, `/v2` | `http://localhost:3001` | Media proxy qua Express local |

### Prod — Express (`server/routes/gommoProxy.ts`)

Mount **trước** `express.json` — raw body `50mb` (`express.raw`).

| Mount path | Upstream env | Strip prefix |
|------------|--------------|--------------|
| `/v2` | `GOMMO_API_BASE_URL` (default `https://v2.api.gommo.net`) | `/v2` |
| `/ai` | `GOMMO_AUTH_BASE_URL` (default `https://api.gommo.net`) | — |
| `/api/v2` | `GOMMO_AUTH_BASE_URL` | — |
| `GOMMO_AUTH_PATH` (default `/api/apps/go-mmo`) | `GOMMO_AUTH_BASE_URL` | — |

**Stream rule:** `shouldStreamResponse()` → pipe khi URL chứa `/chat` hoặc `content-type: text/event-stream`. Không buffer body.

**Request headers:** bỏ hop-by-hop; force `accept-encoding: identity` upstream.

### BE routes KHÔNG proxy (site-owned)

| Route | File |
|-------|------|
| `GET /api/health` | `server/index.ts` |
| `/api/auth/*` | `server/routes/auth.ts` |
| `/api/payos/*` | `server/routes/payos.ts` |
| `/api/telegram/*` | `server/routes/telegram.ts` |
| `/api/ops/*` | `server/routes/ops.ts` |

### FE path summary

| FE path | Dev target | Prod target | Mục đích |
|---------|------------|-------------|----------|
| `/v2/*` | Express :3001 → v2.api | Express → v2.api | `GommoClient` media |
| `/api/v2/*` | api.gommo.net trực tiếp | Express → api.gommo.net | Chat, ai-chat-sessions |
| `/api/apps/go-mmo/*` | api.gommo.net trực tiếp | Express → api.gommo.net | Login/me upstream |

---

## §5 Environment

Nguồn: `.env.example` → `server/config.ts`. FE runtime **không** đọc `.env` — auth `localStorage`, chat config hardcode `src/services/gommoChatConfig.ts`.

### Gommo upstream

| Biến | Default (config.ts) | Consumer |
|------|---------------------|----------|
| `GOMMO_API_BASE_URL` | `https://v2.api.gommo.net` | Proxy `/v2` |
| `GOMMO_AUTH_BASE_URL` | `https://api.gommo.net` | Proxy `/ai`, `/api/v2`, auth path |
| `GOMMO_AUTH_PATH` | `/api/apps/go-mmo` | Proxy auth |
| `GOMMO_ACCESS_TOKEN` | — | Merchant `sendBalances`, register, balance check |
| `GOMMO_API_DOMAIN` | `vmedia.ai` | Merchant API calls |
| `GOMMO_MANAGER_ID` | `c8f06b2317880f42` | Register user mới |
| `GOMMO_REGISTER_EXPIRED_TIME` | `999` | Payload register |

Helper: `isGommoMerchantConfigured()`, `isGommoRegisterConfigured()`

### Server

| Biến | Default | Consumer |
|------|---------|----------|
| `PORT` | `3001` | Express listen |
| `APP_URL` | `http://localhost:5173` | PayOS return/cancel URLs |

### Topup

| Biến | Default | Consumer |
|------|---------|----------|
| `TOPUP_MIN_VND` | `10000` | Validation |
| `TOPUP_MAX_VND` | `20000000` | Validation |
| `TOPUP_CREDITS_PER_VND` | `1` | `vndToCredits()` |
| `TOPUP_MERCHANT_BUFFER_CREDITS` | `300000` | Check trước tạo đơn PayOS |
| `TOPUP_ORDERS_FILE` | `data/topup-orders.json` | Persist đơn pending |

**Rule Gommo merchant:** sau `sendBalances` số dư còn **> 500.000** (`GOMMO_MIN_REMAINING_AFTER_SEND` trong `gommoMerchantBalance.ts`).

### PayOS

| Biến | Consumer |
|------|----------|
| `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` | `isPayOsConfigured()` |
| `PAYOS_WEBHOOK_URL` | Webhook công khai Railway |

### Telegram (site bot)

| Biến | Consumer |
|------|----------|
| `TELEGRAM_BOT_TOKEN` | `isTelegramConfigured()` |
| `TELEGRAM_WEBHOOK_URL` | setWebhook |
| `TELEGRAM_WEBHOOK_SECRET` | Verify webhook + ops key fallback |
| `TELEGRAM_NOTIFY_CHAT_IDS` | Admin alerts (comma-separated) |

### Ops & alerts

| Biến | Consumer |
|------|----------|
| `OPS_STATUS_KEY` | Header `x-ops-key` cho `GET /api/ops/status` chi tiết |
| `MERCHANT_LOW_BALANCE_POLL_MS` | Poller (default 30 phút) |
| `MERCHANT_LOW_BALANCE_ALERT_COOLDOWN_MS` | Cooldown Telegram (default 6h) |
| `MERCHANT_LOW_BALANCE_ALERT_FILE` | State file alert |

---

## §6 Auth & session

### FE session

- **Storage key:** `gommo_session` (`localStorage`)
- **Shape:** `AuthState { access_token, domain, projectId, upstream_me }`
- **Login:** `loginWithGommoToken()` → `fetchUpstreamMe()` → `saveAuth()`
- **Refresh:** `refreshSession()` — cập nhật `upstream_me`, credits header
- **Gate:** `isLoggedIn()` = có `access_token`
- **Client media:** `getGommoClient()` → `GommoClient` với token/domain/projectId
- **User key localStorage:** `authUserKey()` từ `upstream_me.userInfo.id_base` hoặc email

### project_id resolution

Chain `resolveProjectId()`: override → auth.projectId → settings.projectId → `GOMMO_CHAT_CONFIG.projectId` → `'default'`

Tránh gửi literal `'default'` lên API cần project thật (audio, v.v.).

### Upstream me

- **FE:** `POST /api/apps/go-mmo/ai/me` (relative, qua proxy)
- **Body:** `access_token`, `domain` (form-urlencoded)
- **Response:** `userInfo`, `balancesInfo.credits_ai`, `domainInfo` (OneSignal)

### Register (site proxy)

- **Route:** `POST /api/auth/register` (`server/routes/auth.ts`)
- Server gắn `GOMMO_MANAGER_ID` + merchant `GOMMO_ACCESS_TOKEN` qua `registerGommoUser()`
- **Status:** `GET /api/auth/register/status` → `{ configured: isGommoRegisterConfigured() }`
- FE nhận `access_token` → login flow

### Chat auth gate

`isGommoChatConfigured()` = có `access_token` → §7

---

## §7 AI Chat — deep-dive (nguyên văn spec)

### Nguyên tắc

- Mọi chat browser → duy nhất **`askGommo()`** (`src/services/gommoChat.ts`). Component/wrapper **KHÔNG** fetch `/chat` trực tiếp.
- Auth: `loadAuth()` → `{ access_token, domain, projectId }`. Gate: `isGommoChatConfigured()` = có `access_token`.
- Config tĩnh: `src/services/gommoChatConfig.ts` (`GOMMO_CHAT_CONFIG`). Override per-call qua `opts.config`.
- Proxy: FE gọi relative `/api/v2/*` → dev Vite proxy → `https://api.gommo.net`; prod Express `server/routes/gommoProxy.ts` mountProxy('/api/v2', authBaseUrl), stream pipe khi URL chứa `/chat`.

---

### CORE API (implement trong gommoChat.ts)

#### A) Stream chat — POST {baseUrl}/chat

- baseUrl mặc định: `/api/v2` → upstream `https://api.gommo.net/chat`
- Method: POST
- Content-Type: application/x-www-form-urlencoded
- Body (URLSearchParams):

| Field | Nguồn | Ghi chú |
|-------|-------|---------|
| action | `stream` | cố định |
| access_token | auth.access_token | bắt buộc |
| domain | auth.domain \|\| DEFAULT_DOMAIN | |
| server | cfg.server | vd `cheap`, `cursorai`, `openai` |
| model | cfg.model | vd `gpt-5.5::cheap`, `composer-2.5-fast` |
| mode | cfg.model | trùng model |
| body_type | `chat_completions` | cố định |
| agent_id | cfg.agentId | default `d234b19ae119f741696eafa913d246cc` |
| session_id | opts.sessionId | UUID phiên |
| project_id | cfg.projectId | default `55004151b482b646` |
| user_message_id | uuid() mới mỗi lượt | |
| assistant_message_id | uuid() mới mỗi lượt | |
| messages | JSON string | xem format bên dưới |
| device_id | cfg.deviceId | |
| device_name | cfg.deviceName | default `AICenter` |

**Format `messages` (serializeMessages):**

```json
[
  { "role": "user"|"model", "text": "...", "attachments": [] },
  ...
]
```

- `history` trong AskOptions = các turn TRƯỚC lượt hiện tại (UI map assistant→model).
- Lượt gửi thực tế: `fullHistory = [...history, { role:"user", text: sendText }]`.
- `sendText` = (firstTurn && systemPrompt ? systemPrompt+"\n\n" : "") + userText + (workflowSnapshot ? "\n\n[Canvas hiện tại]\n"+snapshot : "").
- Lưu ý: save_message lưu userText GỐC (không system/snapshot); messages gửi stream có đủ sendText.

**Response thành công — SSE stream:**

- Content-Type KHÔNG phải application/json
- Dòng SSE: bỏ qua `event: usage`; chỉ parse dòng `data: {...}`
- `data: [DONE]` → kết thúc
- Payload JSON: `{ choices: [{ delta: { content: string|null } }] }` → append delta.content, gọi onDelta(chunk)
- Return: chuỗi reply đầy đủ

**Response lỗi:**

- HTTP !== 200 → throw `Gommo chat lỗi HTTP {status}`
- HTTP 200 + content-type application/json → lỗi mềm: `{ error?: number, message?: string }` → throw message
- Không có body → throw
- Timeout: AbortController cfg.timeoutMs (default 120000), link opts.signal

#### B) Persist message — POST {baseUrl}/ai-chat-sessions

- Chỉ khi cfg.persistHistory === true (best-effort, fail không chặn chat)
- action=save_message
- Fields: access_token, domain, message_id, session_id, role (`user`|`model`), text, attachments=`[]`, timestamp=Date.now(), metadata=JSON, device_id, device_name
- User metadata: `{ version: 1 }`
- Model metadata: `{ version: 1, agentId, model, server }`

#### C) askGommo signature

```ts
askGommo(userText: string, opts: {
  history: { role:'user'|'model', text:string }[];
  firstTurn?: boolean;
  sessionId: string;
  workflowSnapshot?: string;
  onDelta?: (chunk:string)=>void;
  signal?: AbortSignal;
  config?: Partial<GommoChatConfig>; // model, server, systemPrompt, persistHistory, timeoutMs, ...
}): Promise<string>
```

#### D) GOMMO_CHAT_CONFIG default

```
baseUrl: /api/v2
server: cheap
model: gpt-5.5::cheap
agentId: d234b19ae119f741696eafa913d246cc
projectId: 55004151b482b646
deviceId: d991c6e9-5f3a-4d52-8065-728e3c260e11
deviceName: AICenter
persistHistory: true
timeoutMs: 120000
systemPrompt: Moon Agent (workflow canvas, tiếng Việt, prose ngắn + block ```gommo_action capabilityId workflow.edit)
```

---

### 4 KÊNH CHAT (UI → askGommo)

| # | Kênh | File UI | File service | persistHistory | systemPrompt | Post-process |
|---|------|---------|--------------|----------------|--------------|--------------|
| 1 | Quick Chat FAB | QuickChatWidget.tsx, mount App.tsx | gommoChat default | true | Moon Agent | none |
| 2 | Workflow Agent | WorkflowAgentPanel.tsx trên /workflow | workflowAgentStore.ts + workflowAgentActions.ts + agentDisplayContent.ts | true | Moon Agent | parse gommo_action → apply canvas |
| 3 | Video Agent | ComposerVideoAgentChat.tsx trên StudioPage | videoAgentChat.ts | false | VIDEO_AGENT_SYSTEM | parseVideoAgentScript → prompt/shots |
| 4 | Prompt AI | StudioPage nút enhance/normalize/shots | composerPromptAi.ts | false | ENHANCE/NORMALIZE/SHOTS | stripAiReply |

#### Workflow Agent chi tiết

- State localStorage `ai_wf_agent:{authUserKey}` — sessions[], activeSessionId, autoMode, chatModelId, directCreate
- Model picker `AGENT_CHAT_MODELS` (workflowAgentStore.ts):

| id | server | model |
|----|--------|-------|
| composer-2.5-standard | cursorai | composer-2.5 |
| composer-2.5-fast | cursorai | composer-2.5-fast |
| gpt-5.5-cheap | openai | gpt-5.5-cheap |
| deepseek-v4-pro | deepseek | deepseek-v4-pro |
| glm-5.2-vip | zhipu | glm-5.2-vip |

- Mỗi lượt: `buildWorkflowSnapshot(tab, nodes, edges)` → JSON `{ tab, nodeTypes[], nodes[{id,type,x,y,data}], edges[] }`
- Sau stream: `parseAgentActions(raw, userText, nodes)` → nếu autoMode: `applyWorkflowActions()` → `onApplyGraph`
- Bubble render: `formatAgentDisplayContent(raw)` ẩn ``` fences, Add/Connect lines, JSON kỹ thuật; giữ raw trong message.content cho parser
- Node canvas type `agent` (WorkflowPage ~2886): askGommo trực tiếp, sessionId `wf-node-{nodeId}`, firstTurn true, history []

#### gommo_action format model phải trả (Workflow)

```json
{
  "capabilityId": "workflow.edit",
  "input": {
    "actions": [
      { "type": "add_node", "node": { "id": "...", "type": "image|start|output|...", "data": { "prompt": "..." } } },
      { "type": "connect", "source": "...", "target": "..." },
      { "type": "update_node", "nodeId": "...", "data": {} },
      { "type": "delete_all" }
    ]
  }
}
```

Hoặc bọc `{ "gommo_action": { ... } }`. Parser: `workflowAgentActions.ts` — aliases node type (generate-image→image), text lines Add/Connect, fallback `buildImageWorkflowFallback`.

#### Video Agent output mong đợi

- 1 cảnh: fenced ` ```prompt ... ``` ` hoặc paragraph
- N cảnh: JSON `[{"prompt":"..."},...]` 2–6 items
- `parseVideoAgentScript()` → `onScriptParsed({ prompt } | { shots: ComposerShot[] })`

#### Prompt AI

- `history=[]`, `firstTurn=true`, `sessionId` random UUID mỗi call
- timeout 90s (120s shots)
- Functions: `enhancePromptWithAi`, `normalizePromptWithAi`, `generateShotsWithAi`

---

### UI STREAMING PATTERN (copy khi thêm chat)

1. Check `isGommoChatConfigured()`
2. Push user msg + assistant msg content=''
3. history = prior messages (assistant→model)
4. firstTurn = history.length===0
5. askGommo(..., onDelta accumulate → patch assistant bubble)
6. catch → `⚠️ Lỗi: {message}`

**Known gap:** QuickChat có UI attach ảnh local nhưng **chưa gửi attachments** lên API (attachments luôn `[]` trong messages).

---

### FILE MAP (chat)

`gommoChat.ts` | `gommoChatConfig.ts` | `authStore.ts` | `QuickChatWidget.tsx` | `App.tsx` | `WorkflowAgentPanel.tsx` | `WorkflowAgentChatSettingsModal.tsx` | `workflowAgentStore.ts` | `workflowAgentActions.ts` | `agentDisplayContent.ts` | `videoAgentChat.ts` | `ComposerVideoAgentChat.tsx` | `composerPromptAi.ts` | `composerShots.ts` | `WorkflowPage.tsx` | `StudioPage.tsx` | `server/routes/gommoProxy.ts` | `vite.config.ts`

---

### QUY TẮC SỬA CHAT

1. Không client chat thứ 2 — wrap askGommo
2. Không bịa model/server/enum — dùng GOMMO_CHAT_CONFIG hoặc AGENT_CHAT_MODELS
3. Đổi format agent reply → sửa CẢ systemPrompt (gommoChatConfig) VÀ parser (workflowAgentActions)
4. raw content cho parser; formatAgentDisplayContent chỉ render
5. Không commit .env/token

---

## §8 Media / Studio (non-chat)

### GommoClient

- File: `src/services/api.ts`
- **Base URL:** `BASE_URL = '/v2'` → prod/dev qua Express proxy → `v2.api.gommo.net`
- Auth: Bearer header + form fields `access_token`, `domain`, `project_id`
- Methods: `request`, `postForm`, `postJson`, `uploadImage`, `uploadVideo`, `fetchModels(type)`, job create via `buildJobPayload` + polling

### Studio composer

- **Page:** `StudioPage.tsx` — routes `/image`, `/video`, `/music` (`STUDIO_NAV`)
- **Model picker:** `fetchModelsForType()` → `modelSchema.ts` (ratio, mode, resolution, duration — lấy từ catalog, không bịa)
- **Submit:** `createJobAndPoll()` (`polling.ts`) → poll status đến done
- **Composer modes:** auto, multi, ai (Video Agent tab → §7)
- **Prompt AI buttons:** enhance / normalize / generate shots → §7 (`composerPromptAi.ts`)

### Audio

- **Page:** `AudioPage.tsx` — TTS/music riêng, không dùng StudioPage composer layout

### Phân biệt

Site `GommoClient` create job ≠ MCP `gommo_image_create` / `gommo_video_create` (IDE) ≠ Cursor GenerateImage.

---

## §9 Workflow canvas

### Core files

| File | Vai trò |
|------|---------|
| `WorkflowPage.tsx` | React Flow canvas, run workflow, node execution |
| `workflowStore.ts` / `workflowTabsStore.ts` | Persist tabs/graph |
| `workflowEngine.ts` | `fetchModelsForType`, `runNodeJob` — bridge tới GommoClient |
| `workflowAgentActions.ts` | Snapshot, parse/apply agent actions |
| `workflowAgentStore.ts` | Agent chat sessions (localStorage) |
| `WorkflowAgentPanel.tsx` | Moon Agent UI → §7 |
| `wflImport.ts` | Import/export WFL |
| `WORKFLOW_DUMP.md` | Reference dump node system (generated) |

### Node types (VALID_NODE_TYPES excerpt)

`start`, `text`, `image`, `video`, `tts`, `music`, `api`, `condition`, `delay`, `loop`, `clone`, `notify`, `note`, `output`, `end`, `input-image`, `input-video`, `render`, `upscale-image`, `lipsync`, `merge`, `extract-media`, `agent`, `remove-bg`, `upscale-video`, `vfx`, `subtitle`, `cut`, `kols`, `data-table`

### Node type `agent`

- Execute trong WorkflowPage: gọi `askGommo` với `workflowSnapshot`, model từ node `modelId` → `resolveAgentChatModel()` → §7
- Output: text hiển thị qua `formatAgentDisplayContent`

### Agent auto-apply

- `autoMode` (workflowAgentStore): parse actions → `applyWorkflowActions` → update React Flow graph
- Display: ẩn block kỹ thuật qua `agentDisplayContent.ts`

---

## §10 Topup PayOS

### Flow

```
User /pricing → POST /api/payos/topup-requests
  → verifyPaymentIdentity (Bearer user token)
  → assertMerchantCanCover (merchant balance - reserved >= credits + buffer)
  → createTopupPayOsPayment + createTopupOrder (data/topup-orders.json)
  → User thanh toán PayOS
  → POST /api/payos/webhook
  → fulfillTopupFromWebhook
  → merchantSendBalances(username, credits)
  → updateTopupOrder status credited
  → notifyTelegramAdmins (nếu cấu hình)
```

### Routes (`server/routes/payos.ts`)

| Method | Path | Mục đích |
|--------|------|----------|
| GET | `/api/payos/status` | PayOS + merchant + topup config |
| GET | `/api/payos/credit-packages` | Danh sách gói |
| POST | `/api/payos/topup-requests` | Tạo đơn topup |
| GET | `/api/payos/topup-orders/:orderCode` | Tra cứu đơn |
| GET/POST | `/api/payos/webhook` | PayOS callback |
| POST | `/api/payos/payment-requests` | Gói subscription (plan) |

### Fail modes (thường gặp)

1. **MerchantBalanceError** lúc tạo đơn — merchant khả dụng < required (credits + buffer + rule 500k)
2. **sendBalances fail** sau webhook PAID → đơn `failed` + Telegram admin
3. **Mất `data/topup-orders.json`** trên Railway → webhook không map đơn → credit không cộng
4. **Amount mismatch** PayOS vs đơn pending → đơn failed

### Merchant balance logic

- `fetchMerchantCreditsAi()` — POST merchant `/api/apps/go-mmo/ai/me`
- `requiredMerchantCredits()` — max(send+buffer, send+500001)
- `assertMerchantCanCover()` — available = balance - reserved pending orders

Chi tiết: `server/services/gommoMerchantBalance.ts`, `topupFulfillment.ts`, `topupOrders.ts`

---

## §11 Telegram & ops

### Telegram site bot

- **Config:** `TELEGRAM_*` → §5
- **Routes:** `server/routes/telegram.ts`
  - `GET /api/telegram/status`
  - `POST /api/telegram/setup-webhook` (header `x-telegram-setup-key`)
  - `POST /api/telegram/webhook` (verify `x-telegram-bot-api-secret-token`)
- **Commands:** `/chatid` — lấy chat id admin (xem `server/services/telegram.ts`)
- **Alerts:** topup fail, merchant low balance, webhook orphan order
- **≠** Gommo MCP `gommo_notify_send`

### Merchant low balance poller

- `startMerchantLowBalancePoller()` on server boot
- `checkAndNotifyMerchantLowBalance()` — available < safe threshold → Telegram (cooldown 6h default)

### Ops status

- **Route:** `GET /api/ops/status` (`server/routes/ops.ts`)
- Public: payos/merchant/telegram configured flags
- **Chi tiết** (balance, packages, webhook info): cần header `x-ops-key` = `OPS_STATUS_KEY` hoặc `TELEGRAM_WEBHOOK_SECRET`
- Response includes MCP hint (cursorServer: user-79ai) — IDE only note

---

## §12 Quy tắc agent / không làm

### Làm

- Đọc spec section liên quan trước khi sửa
- Chat/media: dùng client có sẵn (`askGommo`, `GommoClient`)
- Model enum: lấy từ catalog / `AGENT_CHAT_MODELS` / MCP `gommo_models_list`
- Topup/merchant/Telegram: sửa code `server/`, không thay bằng MCP

### Không làm

- Commit `.env`, token MCP, PayOS keys
- Force-push `main`
- Đoán `ratio` / `resolution` / `duration` / `mode` khi gọi API
- Tạo chat client thứ 2 ngoài `askGommo`
- Nhầm GenerateImage Cursor / MCP create / askGommo

---

## Appendix A — File map theo domain

| Domain | Files |
|--------|-------|
| **Chat** | `src/services/gommoChat.ts`, `gommoChatConfig.ts`, `QuickChatWidget.tsx`, `WorkflowAgentPanel.tsx`, `workflowAgentStore.ts`, `workflowAgentActions.ts`, `agentDisplayContent.ts`, `videoAgentChat.ts`, `ComposerVideoAgentChat.tsx`, `composerPromptAi.ts` |
| **Auth** | `src/services/authStore.ts`, `upstreamMe.ts`, `server/routes/auth.ts`, `server/services/gommoRegister.ts` |
| **Proxy** | `server/routes/gommoProxy.ts`, `vite.config.ts` |
| **Media** | `src/services/api.ts`, `polling.ts`, `modelSchema.ts`, `workflowEngine.ts`, `StudioPage.tsx` |
| **Workflow** | `WorkflowPage.tsx`, `workflowStore.ts`, `workflowTabsStore.ts`, `wflImport.ts` |
| **PayOS** | `server/routes/payos.ts`, `server/services/payos.ts`, `topupFulfillment.ts`, `topupOrders.ts`, `creditPackages.ts`, `gommoSendBalances.ts`, `gommoMerchantBalance.ts` |
| **Telegram** | `server/routes/telegram.ts`, `server/services/telegram.ts`, `merchantLowBalanceAlert.ts` |
| **Ops** | `server/routes/ops.ts`, `server/config.ts` |
| **Config/docs** | `.env.example`, `AGENTS.md`, `.cursor/rules/gommo-mcp.mdc` |

---

## Appendix B — Checklist doc đủ

- [x] Dev chat bypass Express (`/api/v2` thẳng Gommo) documented
- [x] Prod stream `/chat` documented
- [x] MCP vs runtime vs askGommo phân tách
- [x] 4 kênh chat + API contract đầy đủ (chỉ §7)
- [x] Env map đủ `.env.example`
- [x] Surfaces/routes đủ `App.tsx`
- [x] PayOS + topup fail modes
- [x] Không đoạn nào lặp bảng payload chat ngoài §7
- [x] Auth/session + register flow
- [x] GommoClient media path (`/v2`) vs chat path (`/api/v2`)
- [ ] Chi tiết từng Gommo media API endpoint (create/poll) — chỉ tóm tắt §8
- [ ] LoginPage upstream login flow từng field — §6 tóm tắt

---

## Gap Report

| # | Mục | Trạng thái | Ghi chú |
|---|-----|------------|---------|
| 1 | `toc-site-ai` file gốc ngoài repo | N/A | Không tìm thấy trong repo; spec merge theo TOC thống nhất từ conversation |
| 2 | QuickChat image attachment | Known gap | UI có attach local; API luôn `attachments: []` — §7 documented |
| 3 | `mockAgentReply()` | Legacy | Còn trong `workflowAgentStore.ts`; panel thật dùng `askGommo` |
| 4 | Gommo media API endpoint catalog | Partial | `GommoClient` + `polling.ts` — chưa liệt kê từng path upstream trong doc |
| 5 | Login flow chi tiết | Partial | `LoginPage` gọi upstream qua proxy — chưa dump form fields; §6 cover session shape |
| 6 | `docs/` folder | Không tồn tại | File đặt tại repo root `SPEC-SITE-AI.md` |
| 7 | Subscription `payment-requests` | Mentioned §10 | Flow song song topup; chưa chi tiết plan fulfillment |

**Cần owner xác nhận:** có cần bổ sung appendix riêng cho từng Gommo `/v2` media endpoint và LoginPage form contract không?

---

*End of SPEC-SITE-AI.md*
