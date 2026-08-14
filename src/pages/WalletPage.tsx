import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchGommoDashboardStats } from '../services/gommoDashboard';
import type { CreditTransaction } from '../services/dashboardTypes';
import { getCreditsAi } from '../services/authStore';
import { useLocale, type TranslationKey } from '../i18n';
import type { AppLocale } from '../i18n/types';

const TX_KEYS: Record<string, TranslationKey> = {
  signup_bonus: 'wallet.tx.signup_bonus',
  job_charge: 'wallet.tx.job_charge',
  job_refund: 'wallet.tx.job_refund',
  topup: 'wallet.tx.topup',
  promotion: 'wallet.tx.promotion',
};

function dateLocale(locale: AppLocale): string {
  return locale === 'vi' ? 'vi-VN' : 'en-US';
}

function formatDate(iso: string, localeTag: string) {
  try {
    return new Date(iso).toLocaleString(localeTag, { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export default function WalletPage() {
  const { t, locale } = useLocale();
  const localeTag = dateLocale(locale);
  const [balance, setBalance] = useState(getCreditsAi());
  const [consumed, setConsumed] = useState(0);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const stats = await fetchGommoDashboardStats('all');
      setBalance(stats.balance);
      setConsumed(stats.credits.consumed_net);
      setTransactions(stats.recent_transactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function txLabel(type: string): string {
    const key = TX_KEYS[type];
    return key ? t(key) : type;
  }

  return (
    <div className="page wallet-page">
      <div className="page-head">
        <p className="kicker">{t('wallet.kicker')}</p>
        <h1>{t('wallet.title')}</h1>
        <p className="lead">
          {t('wallet.balance', { count: balance })}
          {' · '}
          {t('wallet.consumed', { count: consumed })}
        </p>
      </div>

      <div className="banner warn">{t('wallet.banner')}</div>

      {loading && <p className="muted">{t('wallet.loading')}</p>}
      {error && <p className="error">{error}</p>}

      <div className="tables-grid wallet-tables">
        <section className="panel">
          <div className="panel-head">
            <h2>{t('wallet.historyTitle')}</h2>
            <Link to="/dashboard" className="btn ghost sm">{t('wallet.dashboardLink')}</Link>
          </div>
          {transactions.length === 0 ? (
            <p className="muted">{t('wallet.empty')}</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('wallet.colType')}</th>
                  <th>{t('wallet.colAmount')}</th>
                  <th>{t('wallet.colDesc')}</th>
                  <th>{t('wallet.colTime')}</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{txLabel(tx.type)}</td>
                    <td className={tx.amount >= 0 ? 'amount-plus' : 'amount-minus'}>
                      {tx.amount >= 0 ? '+' : ''}{tx.amount}
                    </td>
                    <td className="muted-cell">{tx.description || '—'}</td>
                    <td>{formatDate(tx.created_at, localeTag)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
