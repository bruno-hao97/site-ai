import { useEffect } from 'react';
import { ScrollText } from 'lucide-react';
import LegalDocument from '../components/legal/LegalDocument';
import { SITE_BRAND_LABEL, SITE_DISPLAY_NAME } from '../services/siteConfig';

export default function TermsPage() {
  useEffect(() => {
    document.title = `Điều khoản dịch vụ · ${SITE_DISPLAY_NAME}`;
    return () => {
      document.title = SITE_DISPLAY_NAME;
    };
  }, []);

  return (
    <LegalDocument title="Điều khoản dịch vụ" icon={ScrollText}>
      <section className="legal-section">
        <h2>1. Chấp nhận điều khoản</h2>
        <p>
          Khi đăng ký hoặc sử dụng {SITE_DISPLAY_NAME} tại {SITE_BRAND_LABEL}, bạn đồng ý tuân thủ
          các điều khoản này và chính sách bảo mật. Nếu không đồng ý, vui lòng ngừng sử dụng dịch
          vụ.
        </p>
      </section>

      <section className="legal-section">
        <h2>2. Dịch vụ &amp; credits</h2>
        <ul>
          <li>Dịch vụ tính theo credits hoặc gói đăng ký như mô tả trên bảng giá.</li>
          <li>Giá model và hạn mức có thể thay đổi; thông báo trên website khi có cập nhật quan trọng.</li>
          <li>Credit đã sử dụng cho tác vụ AI không hoàn lại trừ khi lỗi hệ thống được xác nhận.</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>3. Nội dung bị nghiêm cấm</h2>
        <p>Bạn không được tạo, tải lên hoặc phát tán nội dung:</p>
        <ul>
          <li>18+, khiêu dâm hoặc nhạy cảm trái pháp luật Việt Nam.</li>
          <li>Cờ bạc, lô đề, giả mạo giấy tờ, CCCD hoặc danh tính.</li>
          <li>Tin giả, kích động thù hận, lạm dụng hình ảnh cơ quan nhà nước.</li>
          <li>Vi phạm bản quyền, thương hiệu hoặc quyền riêng tư của bên thứ ba.</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>4. Trách nhiệm &amp; chấm dứt</h2>
        <p>
          Bạn chịu trách nhiệm về nội dung tạo ra từ tài khoản của mình. {SITE_DISPLAY_NAME} có
          quyền tạm khóa hoặc chấm dứt tài khoản vi phạm mà không hoàn credits. Dữ liệu có thể được
          cung cấp cho cơ quan có thẩm quyền theo quy định pháp luật.
        </p>
      </section>
    </LegalDocument>
  );
}
