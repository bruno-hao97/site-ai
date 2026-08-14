import { useEffect } from 'react';
import { ScrollText } from 'lucide-react';
import LegalDocument from '../components/legal/LegalDocument';
import { SITE_BRAND_LABEL, SITE_DISPLAY_NAME } from '../services/siteConfig';
import { useLocale } from '../i18n';

export default function TermsPage() {
  const { t } = useLocale();
  const legalParams = { siteName: SITE_DISPLAY_NAME, brand: SITE_BRAND_LABEL };

  useEffect(() => {
    document.title = `${t('legal.terms.pageTitle')} · ${SITE_DISPLAY_NAME}`;
    return () => {
      document.title = SITE_DISPLAY_NAME;
    };
  }, [t]);

  return (
    <LegalDocument title={t('legal.terms.title')} icon={ScrollText}>
      <section className="legal-section">
        <h2>{t('legal.terms.s1.title')}</h2>
        <p>{t('legal.terms.s1.body', legalParams)}</p>
      </section>

      <section className="legal-section">
        <h2>{t('legal.terms.s2.title')}</h2>
        <ul>
          <li>{t('legal.terms.s2.item1')}</li>
          <li>{t('legal.terms.s2.item2')}</li>
          <li>{t('legal.terms.s2.item3')}</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>{t('legal.terms.s3.title')}</h2>
        <p>{t('legal.terms.s3.lead')}</p>
        <ul>
          <li>{t('legal.terms.s3.item1')}</li>
          <li>{t('legal.terms.s3.item2')}</li>
          <li>{t('legal.terms.s3.item3')}</li>
          <li>{t('legal.terms.s3.item4')}</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2>{t('legal.terms.s4.title')}</h2>
        <p>{t('legal.terms.s4.body', legalParams)}</p>
      </section>
    </LegalDocument>
  );
}
