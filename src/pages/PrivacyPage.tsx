import { useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import LegalDocument from '../components/legal/LegalDocument';
import { SITE_BRAND_LABEL, SITE_DISPLAY_NAME } from '../services/siteConfig';
import { useLocale } from '../i18n';

export default function PrivacyPage() {
  const { t } = useLocale();
  const legalParams = { siteName: SITE_DISPLAY_NAME, brand: SITE_BRAND_LABEL };

  useEffect(() => {
    document.title = `${t('legal.privacy.pageTitle')} · ${SITE_DISPLAY_NAME}`;
    return () => {
      document.title = SITE_DISPLAY_NAME;
    };
  }, [t]);

  return (
    <LegalDocument title={t('legal.privacy.title')} icon={ShieldCheck}>
      <section className="legal-section">
        <h2>{t('legal.privacy.s1.title')}</h2>
        <p>{t('legal.privacy.s1.body', legalParams)}</p>
      </section>

      <section className="legal-section">
        <h2>{t('legal.privacy.s2.title')}</h2>
        <ul>
          <li>{t('legal.privacy.s2.item1')}</li>
          <li>{t('legal.privacy.s2.item2')}</li>
          <li>{t('legal.privacy.s2.item3')}</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>{t('legal.privacy.s3.title')}</h2>
        <p>{t('legal.privacy.s3.body')}</p>
      </section>

      <section className="legal-section">
        <h2>{t('legal.privacy.s4.title')}</h2>
        <p>{t('legal.privacy.s4.body')}</p>
      </section>
    </LegalDocument>
  );
}
