import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Coins, Loader2, X } from 'lucide-react';
import type { CreditPackage } from '../services/topupApi';
import { useLocale } from '../i18n';
import type { AppLocale } from '../i18n/types';

interface Props {
  open: boolean;
  creditPackage: CreditPackage | null;
  confirming: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: () => void;
}

function numberLocale(locale: AppLocale): string {
  return locale === 'vi' ? 'vi-VN' : 'en-US';
}

function formatVnd(value: number, locale: AppLocale): string {
  return `${value.toLocaleString(numberLocale(locale))}đ`;
}

export default function CreditConfirmModal({
  open,
  creditPackage,
  confirming,
  error,
  onClose,
  onConfirm,
}: Props) {
  const { t, locale } = useLocale();
  const fmt = numberLocale(locale);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !confirming) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, confirming, onClose]);

  if (!open || !creditPackage) return null;

  return createPortal(
    <div className="pricing-confirm-backdrop" onClick={confirming ? undefined : onClose}>
      <div
        className="pricing-credit-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="credit-confirm-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="pricing-confirm-close"
          aria-label={t('pricing.confirm.closeAria')}
          onClick={onClose}
          disabled={confirming}
        >
          <X size={18} />
        </button>

        <div className="pricing-credit-confirm-icon">
          <Coins size={28} />
        </div>
        <h2 id="credit-confirm-title">{t('pricing.confirm.title')}</h2>
        <p className="muted">{t('pricing.confirm.question')}</p>

        <div className="pricing-credit-confirm-summary">
          <div>
            <span>{t('pricing.confirm.package')}</span>
            <strong>{creditPackage.name}</strong>
          </div>
          <div>
            <span>{t('pricing.confirm.price')}</span>
            <strong>{formatVnd(creditPackage.amountVnd, locale)}</strong>
          </div>
          <div>
            <span>{t('pricing.confirm.creditsReceived')}</span>
            <strong className="accent">{creditPackage.credits.toLocaleString(fmt)} Credits</strong>
          </div>
        </div>

        <p className="pricing-credit-expiry-note">{t('pricing.confirm.expiry')}</p>

        {error ? <p className="pricing-confirm-error">{error}</p> : null}

        <div className="pricing-confirm-actions">
          <button type="button" className="pricing-confirm-cancel" onClick={onClose} disabled={confirming}>
            {t('pricing.confirm.cancel')}
          </button>
          <button type="button" className="pricing-confirm-submit" onClick={onConfirm} disabled={confirming}>
            {confirming ? <Loader2 size={16} className="spin" /> : null}
            {confirming ? t('pricing.confirm.creating') : error ? t('pricing.retry') : t('pricing.confirm.submit')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
