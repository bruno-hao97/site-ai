# AGENTS.md — site-ai

## Stack nhanh

- FE: Vite + React 19 + React Router — Vercel
- BE: Express — Railway (`api.trungtamai.vn`)
- Upstream AI: **Gommo** (`vmedia.ai`) qua proxy
- Thanh toán nạp credit: **PayOS** → webhook → `sendBalances`

## Cursor MCP (lớp A)

Server `user-79ai` / UI `79ai`. Rule: `.cursor/rules/gommo-mcp.mdc`.

Ưu tiên tool Gommo khi gen media / check credit / ping Telegram (nếu đã link). Không nhầm với GenerateImage nội bộ Cursor.

## Site runtime (lớp B)

| Path | Việc |
|------|------|
| `/api/payos/*` | Topup + webhook |
| `/api/telegram/*` | Bot admin (cảnh báo topup) |
| `/api/ops/status` | Health PayOS / merchant / Telegram |
| `/v2`, `/ai`, `/api/apps/go-mmo` | Proxy Gommo |

Env: xem `.env.example`. Merchant phải giữ đủ credit (rule Gommo: sau chuyển còn > 500k) — `TOPUP_MERCHANT_BUFFER_CREDITS` + check trước tạo đơn.

## Topup fail thường gặp

1. Merchant thiếu buffer → `MerchantBalanceError` lúc tạo đơn
2. `sendBalances` fail → đơn `failed` + Telegram admin (nếu cấu hình)
3. Mất `data/topup-orders.json` trên Railway → webhook không map đơn

## Không làm

- Commit `.env` / token MCP / PayOS keys
- Force-push main
- Đoán enum model khi gọi MCP create
