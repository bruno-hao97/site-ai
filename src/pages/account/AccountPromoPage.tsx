import { useLocale } from '../../i18n';

export default function AccountPromoPage() {
  const { t } = useLocale();

  return (
    <div className="account-settings">
      <h1 className="account-content-title">{t('account.promo.title')}</h1>
      <section className="panel account-card">
        <p className="muted">{t('account.promo.desc')}</p>
        <form className="form account-form" onSubmit={(e) => e.preventDefault()}>
          <label className="field">
            <span className="label">{t('account.promo.codeLabel')}</span>
            <input placeholder={t('account.promo.placeholder')} />
          </label>
          <button type="submit" className="btn account-teal-btn" disabled>
            {t('account.promo.applySoon')}
          </button>
        </form>
      </section>
    </div>
  );
}
