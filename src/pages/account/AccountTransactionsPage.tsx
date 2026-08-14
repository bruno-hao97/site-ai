import { Link } from 'react-router-dom';
import { useLocale } from '../../i18n';

export default function AccountTransactionsPage() {
  const { t } = useLocale();

  return (
    <div className="account-settings">
      <h1 className="account-content-title">{t('account.transactions.title')}</h1>
      <section className="panel account-card">
        <p className="muted">{t('account.transactions.desc')}</p>
        <Link to="/usage-history" className="btn secondary sm">
          {t('account.transactions.viewUsage')}
        </Link>
        <p className="muted" style={{ marginTop: '1rem' }}>
          {t('account.transactions.pending')}
        </p>
      </section>
    </div>
  );
}
