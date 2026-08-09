import { HOME_NOTIF_CONTACT, SITE_BRAND_LABEL } from '../../services/siteConfig';

interface LandingHomeNotifFallbackProps {
  onClose?: () => void;
}

const font =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", Arial, sans-serif';

export default function LandingHomeNotifFallback({ onClose }: LandingHomeNotifFallbackProps) {
  return (
    <>
      <header
        className="vm-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '0 14px 0 16px',
          background: 'rgba(7, 12, 20, 0.92)',
          borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
          color: '#f8fafc',
          fontFamily: font,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div
            style={{
              width: 32,
              height: 32,
              display: 'grid',
              placeItems: 'center',
              color: '#031018',
              fontSize: 15,
              fontWeight: 950,
              background: 'linear-gradient(135deg, #67e8f9, #0ea5e9)',
              borderRadius: 10,
              boxShadow: '0 0 18px rgba(34, 211, 238, 0.22)',
            }}
          >
            T
          </div>
          <div style={{ minWidth: 0 }}>
            <span
              style={{
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: '#fff',
                fontSize: 13,
                fontWeight: 850,
                lineHeight: 1.15,
              }}
            >
              Thông báo từ {SITE_BRAND_LABEL}
            </span>
            <span
              style={{
                display: 'block',
                marginTop: 2,
                color: '#7f8da1',
                fontSize: 9,
                fontWeight: 600,
              }}
            >
              Kênh liên hệ chính thức &amp; quy định sử dụng
            </span>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            className="vm-close"
            aria-label="Đóng thông báo"
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.055)',
              color: '#cbd5e1',
              fontSize: 22,
              lineHeight: 1,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        )}
      </header>

      <main
        className="vm-main"
        style={{
          display: 'grid',
          gridTemplateRows: 'auto minmax(0,1.55fr) minmax(0,0.85fr) auto',
          gap: 8,
          padding: '10px 12px',
          overflow: 'hidden',
          color: '#f8fafc',
          fontFamily: font,
          background: 'rgba(2, 6, 15, 0.84)',
        }}
      >
        <section
          className="vm-intro"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '9px 11px',
            background: 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(139,92,246,0.075))',
            border: '1px solid rgba(56,217,255,0.18)',
            borderRadius: 13,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, color: '#fff', fontSize: 16, fontWeight: 900, lineHeight: 1.13 }}>
              Kết nối nhanh, sử dụng AI an toàn
            </h2>
            <p style={{ margin: '4px 0 0', color: '#aeb9c8', fontSize: 9.5, lineHeight: 1.2 }}>
              Hỗ trợ, cộng đồng, bảng giá và tài liệu API.
            </p>
          </div>
          <span
            style={{
              flexShrink: 0,
              padding: '5px 8px',
              color: '#67e8f9',
              fontSize: 8,
              fontWeight: 900,
              letterSpacing: 0.55,
              textTransform: 'uppercase',
              background: 'rgba(34,211,238,0.08)',
              border: '1px solid rgba(34,211,238,0.22)',
              borderRadius: 999,
            }}
          >
            {SITE_BRAND_LABEL}
          </span>
        </section>

        <nav
          className="vm-actions"
          aria-label={`Liên hệ và tiện ích ${SITE_BRAND_LABEL}`}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gridTemplateRows: 'repeat(3, minmax(0, 1fr))',
            gap: 7,
            minHeight: 0,
          }}
        >
          <ActionTile
            href={HOME_NOTIF_CONTACT.zaloGroup}
            name="Nhóm Zalo"
            sub="Cộng đồng hỗ trợ"
            tone="zalo"
          />
          <ActionTile
            href={HOME_NOTIF_CONTACT.zaloSupport}
            name="Zalo hỗ trợ"
            sub={HOME_NOTIF_CONTACT.zaloSupportLabel}
            tone="help"
          />
          <ActionTile
            href={HOME_NOTIF_CONTACT.facebook}
            name="Fanpage"
            sub="Tin tức & cập nhật"
            tone="facebook"
          />
          <ActionTile href="/pricing" name="Nạp tiền & bảng giá" sub="Gói dịch vụ & số dư" tone="price" />
          <ActionTile
            href="#features"
            name="Kết nối API"
            sub="Tài liệu dành cho nhà phát triển"
            tone="api"
            full
          />
        </nav>

        <section
          className="vm-rules"
          aria-label="Nội dung nghiêm cấm"
          style={{
            display: 'grid',
            gridTemplateRows: 'auto minmax(0, 1fr)',
            gap: 5,
            padding: 7,
            background: 'linear-gradient(135deg, rgba(127,29,29,0.17), rgba(76,5,25,0.09))',
            border: '1px solid rgba(255,102,120,0.28)',
            borderRadius: 12,
            minHeight: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              color: '#ff9aaa',
              fontSize: 10.5,
              fontWeight: 950,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>⚠ NGHIÊM CẤM VI PHẠM</span>
            <small style={{ color: '#9f6d78', fontSize: 7, letterSpacing: 0.55, textTransform: 'uppercase' }}>
              Bắt buộc tuân thủ
            </small>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gridTemplateRows: 'repeat(3, minmax(0, 1fr))',
              gap: 4,
              minHeight: 0,
            }}
          >
            {[
              'Nội dung 18+ và nhạy cảm',
              'Cờ bạc, cá cược, lô đề',
              'CCCD, giấy tờ, giả mạo',
              'Tin giả, gây hoang mang',
              'Cơ quan chức năng sai mục đích',
              'Kích động, thù địch, chia rẽ',
            ].map((rule) => (
              <div
                key={rule}
                className="vm-rule"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px 6px',
                  color: '#e8edf4',
                  fontSize: 8.5,
                  fontWeight: 750,
                  lineHeight: 1.14,
                  background: 'rgba(255,255,255,0.027)',
                  border: '1px solid rgba(255,102,120,0.12)',
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                {rule}
              </div>
            ))}
          </div>
        </section>

        <div
          className="vm-alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '6px 8px',
            color: '#ffd1d7',
            fontSize: 8.8,
            fontWeight: 750,
            lineHeight: 1.2,
            background: 'rgba(225,29,72,0.1)',
            border: '1px solid rgba(255,102,120,0.2)',
            borderRadius: 10,
          }}
        >
          <span style={{ color: '#ff8e9e' }}>
            Vi phạm: khóa tài khoản vĩnh viễn.{' '}
            <span style={{ color: '#ffd1d7' }}>Dữ liệu có thể được cung cấp theo yêu cầu hợp pháp.</span>
          </span>
        </div>
      </main>
    </>
  );
}

function ActionTile({
  href,
  name,
  sub,
  tone,
  full,
}: {
  href: string;
  name: string;
  sub: string;
  tone: 'zalo' | 'help' | 'facebook' | 'price' | 'api';
  full?: boolean;
}) {
  const tones = {
    zalo: {
      bg: 'linear-gradient(135deg, rgba(14,165,233,0.13), rgba(14,165,233,0.035))',
      border: 'rgba(14,165,233,0.35)',
      iconBg: 'rgba(14,165,233,0.16)',
      iconColor: '#62d7ff',
    },
    help: {
      bg: 'linear-gradient(135deg, rgba(16,185,129,0.13), rgba(16,185,129,0.035))',
      border: 'rgba(16,185,129,0.35)',
      iconBg: 'rgba(16,185,129,0.16)',
      iconColor: '#72edbd',
    },
    facebook: {
      bg: 'linear-gradient(135deg, rgba(139,92,246,0.14), rgba(139,92,246,0.035))',
      border: 'rgba(139,92,246,0.36)',
      iconBg: 'rgba(139,92,246,0.17)',
      iconColor: '#c4b5fd',
    },
    price: {
      bg: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.04))',
      border: 'rgba(245,158,11,0.4)',
      iconBg: 'rgba(245,158,11,0.17)',
      iconColor: '#ffd068',
    },
    api: {
      bg: 'linear-gradient(135deg, rgba(20,184,166,0.15), rgba(14,165,233,0.043))',
      border: 'rgba(45,212,191,0.37)',
      iconBg: 'rgba(20,184,166,0.17)',
      iconColor: '#5eead4',
    },
  }[tone];

  return (
    <a
      className={`vm-action vm-${tone}${full ? ' vm-full' : ''}`}
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '8px 10px',
        overflow: 'hidden',
        background: tones.bg,
        border: `1px solid ${tones.border}`,
        borderRadius: 13,
        color: '#fff',
        textDecoration: 'none',
        gridColumn: full ? '1 / -1' : undefined,
        minHeight: 0,
      }}
    >
      <span
        aria-hidden
        style={{
          flexShrink: 0,
          width: 38,
          height: 38,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 11,
          color: tones.iconColor,
          background: tones.iconBg,
          fontWeight: tone === 'facebook' ? 900 : 700,
          fontSize: tone === 'facebook' ? 23 : 14,
        }}
      >
        {tone === 'facebook' ? 'f' : tone === 'api' ? '</>' : '●'}
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 850, lineHeight: 1.2 }}>{name}</span>
        <span
          style={{
            display: 'block',
            marginTop: 4,
            color: '#9ca9ba',
            fontSize: 9,
            lineHeight: 1.18,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {sub}
        </span>
      </span>
    </a>
  );
}
