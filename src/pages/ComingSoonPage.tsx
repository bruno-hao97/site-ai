import { useLocale } from '../i18n';

export default function ComingSoonPage({ title }: { title: string }) {
  const { t } = useLocale();

  return (
    <div className="coming-soon">
      <h1>{title}</h1>
      <p>{t('comingSoon.message')}</p>
    </div>
  );
}
