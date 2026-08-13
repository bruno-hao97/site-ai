import { useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import LegalDocument from '../components/legal/LegalDocument';
import { SITE_BRAND_LABEL, SITE_DISPLAY_NAME } from '../services/siteConfig';

export default function PrivacyPage() {
  useEffect(() => {
    document.title = `Chính sách bảo mật · ${SITE_DISPLAY_NAME}`;
    return () => {
      document.title = SITE_DISPLAY_NAME;
    };
  }, []);

  return (
    <LegalDocument title="Chính sách bảo mật" icon={ShieldCheck}>
      <section className="legal-section">
        <h2>1. Dữ liệu chúng tôi thu thập</h2>
        <p>
          {SITE_DISPLAY_NAME} ({SITE_BRAND_LABEL}) có thể thu thập thông tin tài khoản (email, tên
          hiển thị), dữ liệu sử dụng dịch vụ (prompt, lịch sử tạo nội dung, credits) và thông tin kỹ
          thuật (thiết bị, IP, log truy cập) nhằm vận hành nền tảng an toàn.
        </p>
      </section>

      <section className="legal-section">
        <h2>2. Cách chúng tôi sử dụng dữ liệu</h2>
        <ul>
          <li>Cung cấp và duy trì dịch vụ AI (ảnh, video, giọng nói, chat, API).</li>
          <li>Cải thiện trải nghiệm, hỗ trợ kỹ thuật và liên hệ khi cần thiết.</li>
          <li>Phát hiện gian lận, lạm dụng hoặc vi phạm điều khoản sử dụng.</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>3. Bảo mật dữ liệu</h2>
        <p>
          Chúng tôi áp dụng biện pháp bảo mật phù hợp (mã hóa truyền tải SSL/TLS, kiểm soát truy
          cập) và cam kết không bán dữ liệu cá nhân của bạn cho bên thứ ba vì mục đích marketing.
        </p>
      </section>

      <section className="legal-section">
        <h2>4. Dịch vụ bên thứ ba</h2>
        <p>
          Để tạo nội dung AI, yêu cầu của bạn có thể được xử lý qua các nhà cung cấp upstream (ví dụ
          Google Gemini, OpenAI, Anthropic và các model khác trên catalog). Chúng tôi chỉ truyền
          dữ liệu cần thiết để thực hiện tác vụ bạn yêu cầu, tuân theo chính sách của từng nhà
          cung cấp.
        </p>
      </section>
    </LegalDocument>
  );
}
