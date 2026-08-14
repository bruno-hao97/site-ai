import { FormEvent, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeftRight, Coins, MessageSquare, User } from 'lucide-react';
import { useLocale } from '../../i18n';
import type { TranslationKey } from '../../i18n/types';
import { notifyCreditsUpdated, refreshSession } from '../../services/authStore';
import {
  MAX_TRANSFER_CREDIT,
  MIN_TRANSFER_CREDIT,
  sendBalances,
} from '../../services/transferBalances';

export default function AccountTransferPage() {
  const { t, locale } = useLocale();
  const localeTag = locale === 'vi' ? 'vi-VN' : 'en-US';
  const limitParams = useMemo(
    () => ({
      min: MIN_TRANSFER_CREDIT.toLocaleString(localeTag),
      max: MAX_TRANSFER_CREDIT.toLocaleString(localeTag),
    }),
    [localeTag],
  );

  const safetyRules = useMemo(
    (): TranslationKey[] => [
      'account.transfer.warning1',
      'account.transfer.warning2',
      'account.transfer.warning3',
      'account.transfer.warning4',
    ],
    [],
  );

  const [username, setUsername] = useState('');
  const [value, setValue] = useState('10000');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const result = await sendBalances({
        username,
        value: Number(value),
        message,
      });
      await refreshSession();
      notifyCreditsUpdated();
      setSuccess(result.message || t('account.transfer.successFallback'));
      setUsername('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="account-settings">
      <h1 className="account-content-title">{t('account.transfer.title')}</h1>

      <div className="account-transfer-grid">
        <section className="panel account-card account-transfer-form-card">
          <form className="form account-form account-transfer-form" onSubmit={handleSubmit}>
            <label className="field">
              <span className="label">
                <User size={14} aria-hidden />
                {t('account.transfer.recipientLabel')}
              </span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('account.transfer.recipientPlaceholder')}
                autoComplete="off"
                disabled={loading}
              />
            </label>

            <label className="field">
              <span className="label">
                <Coins size={14} aria-hidden />
                {t('account.transfer.amountLabel')}
              </span>
              <input
                type="number"
                min={MIN_TRANSFER_CREDIT}
                max={MAX_TRANSFER_CREDIT}
                step={1000}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={String(MIN_TRANSFER_CREDIT)}
                disabled={loading}
              />
              <p className="account-transfer-limits">{t('account.transfer.limits', limitParams)}</p>
            </label>

            <label className="field">
              <span className="label">
                <MessageSquare size={14} aria-hidden />
                {t('account.transfer.messageLabel')}
              </span>
              <textarea
                className="account-transfer-message"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('account.transfer.messagePlaceholder')}
                disabled={loading}
              />
            </label>

            {error ? <p className="account-transfer-feedback error">{error}</p> : null}
            {success ? <p className="account-transfer-feedback success">{success}</p> : null}

            <button type="submit" className="btn account-transfer-submit" disabled={loading}>
              <ArrowLeftRight size={16} aria-hidden />
              {loading ? t('account.transfer.submitting') : t('account.transfer.submit')}
            </button>
          </form>
        </section>

        <aside className="account-transfer-warnings panel">
          <h2>
            <AlertTriangle size={16} aria-hidden />
            {t('account.transfer.warningsTitle')}
          </h2>
          <ul>
            {safetyRules.map((key) => (
              <li key={key}>
                {key === 'account.transfer.warning4'
                  ? t(key, limitParams)
                  : t(key)}
              </li>
            ))}
          </ul>
          <p className="account-transfer-warnings-foot">{t('account.transfer.warningsFoot')}</p>
        </aside>
      </div>
    </div>
  );
}
