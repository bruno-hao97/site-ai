import { Link } from 'react-router-dom';
import { getCreditsAi, getUpstreamMe } from '../../services/authStore';
import { useLocale } from '../../i18n';

export default function AccountSubscriptionPage() {
  const { t, locale } = useLocale();
  const me = getUpstreamMe();
  const credits = getCreditsAi();
  const active = me?.userInfo?.activate === 1;
  const localeTag = locale === 'vi' ? 'vi-VN' : 'en-US';

  return (
    <div className="account-settings">
      <h1 className="account-content-title">{t('account.subscription.title')}</h1>
      <section className="panel account-card">
        <div className="account-detail-row-inline">
          <span>{t('account.subscription.statusLabel')}</span>
          <span className={`profile-plan-badge ${active ? 'active' : ''}`}>
            {active ? t('account.subscription.statusActive') : t('account.subscription.statusFree')}
          </span>
        </div>
        <div className="account-detail-row-inline">
          <span>{t('account.subscription.creditsLabel')}</span>
          <strong>{credits.toLocaleString(localeTag)}</strong>
        </div>
        <Link to="/pricing" className="btn primary profile-upgrade-btn" style={{ marginTop: '1rem' }}>
          {t('account.subscription.upgrade')}
        </Link>
      </section>
    </div>
  );
}
