import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Crown, Loader2, X } from 'lucide-react';
import { useLocale } from '../i18n';
import type { SubscriptionPlan, SubscriptionPlanModel } from '../services/subscriptionPlans';
import { SITE_SUPPORT_PHONE, SITE_SUPPORT_PHONE_LABEL } from '../services/siteConfig';

interface PlanHighlight {
  label: string;
  value: string;
}

interface Props {
  open: boolean;
  plan: SubscriptionPlan | null;
  confirming: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: (promoCode: string) => void;
}

function formatCurrencyVnd(value: string | undefined, t: (key: 'common.contactUs') => string): string {
  if (!value) return t('common.contactUs');
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  return `${amount.toLocaleString('vi-VN')}đ`;
}

function normalizeFieldValue(value?: string): string {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '0';
  if (/^unlimited$/i.test(trimmed)) return 'Unlimited';
  return trimmed;
}

function formatSavePercent(value: string | undefined, t: (key: 'subscription.confirm.savePercent', params?: Record<string, string | number>) => string): string | null {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  if (/giảm/i.test(trimmed)) return trimmed;
  const numeric = trimmed.replace(/%/g, '').trim();
  if (!numeric) return null;
  return t('subscription.confirm.savePercent', { percent: numeric });
}

function planHighlights(plan: SubscriptionPlan, t: ReturnType<typeof useLocale>['t']): PlanHighlight[] {
  const rows: Array<PlanHighlight | null> = [
    plan.video_month ? { label: t('subscription.confirm.highlight.videoMonth'), value: normalizeFieldValue(plan.video_month) } : null,
    plan.video_day ? { label: t('subscription.confirm.highlight.videoDay'), value: normalizeFieldValue(plan.video_day) } : null,
    plan.image_month ? { label: t('subscription.confirm.highlight.imageMonth'), value: normalizeFieldValue(plan.image_month) } : null,
    plan.image_day ? { label: t('subscription.confirm.highlight.imageDay'), value: normalizeFieldValue(plan.image_day) } : null,
    plan.concurrent ? { label: t('subscription.confirm.highlight.concurrent'), value: normalizeFieldValue(plan.concurrent) } : null,
    plan.queue ? { label: t('subscription.confirm.highlight.queue'), value: normalizeFieldValue(plan.queue) } : null,
    plan.storage ? { label: t('subscription.confirm.highlight.storage'), value: normalizeFieldValue(plan.storage) } : null,
  ];
  return rows.filter((row): row is PlanHighlight => row !== null && row.value !== '0');
}

function modelTags(model: SubscriptionPlanModel): string[] {
  const tags: string[] = [];
  const add = (items?: Array<{ name?: string; type?: string } | string>) => {
    for (const item of items || []) {
      if (typeof item === 'string') {
        if (item.trim()) tags.push(item.trim());
        continue;
      }
      const label = item.name || item.type || '';
      if (label.trim()) tags.push(label.trim());
    }
  };
  add(model.modes);
  add(model.resolutions);
  add(model.durations);
  add(model.ratios);
  return tags;
}

export default function SubscriptionConfirmModal({
  open,
  plan,
  confirming,
  error,
  onClose,
  onConfirm,
}: Props) {
  const { t } = useLocale();
  const [promoCode, setPromoCode] = useState('');

  useEffect(() => {
    if (open) setPromoCode('');
  }, [open, plan?.id_base]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !confirming) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, confirming, onClose]);

  const models = useMemo(() => plan?.models || [], [plan]);
  const highlights = useMemo(() => (plan ? planHighlights(plan, t) : []), [plan, t]);
  const saveLabel = formatSavePercent(plan?.save_percent, t);

  if (!open || !plan) return null;

  return createPortal(
    <div className="pricing-confirm-backdrop" onClick={confirming ? undefined : onClose}>
      <div
        className="pricing-confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pricing-confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pricing-confirm-head">
          <div>
            <h2 id="pricing-confirm-title">
              <Crown size={18} />
              {t('subscription.confirm.title')}
            </h2>
            <p>{t('subscription.confirm.question')}</p>
          </div>
          <button
            type="button"
            className="pricing-confirm-close"
            aria-label={t('pricing.confirm.closeAria')}
            onClick={onClose}
            disabled={confirming}
          >
            <X size={18} />
          </button>
        </div>

        <div className="pricing-confirm-body">
          <section className="pricing-confirm-summary">
            <div className="pricing-confirm-plan-row">
              <span className="pricing-confirm-label">{t('subscription.confirm.plan')}</span>
              <div className="pricing-confirm-plan-name">
                <strong>{plan.name}</strong>
                {saveLabel ? <span className="pricing-confirm-save">{saveLabel}</span> : null}
              </div>
            </div>

            <div className="pricing-confirm-plan-row">
              <span className="pricing-confirm-label">{t('subscription.confirm.price')}</span>
              <strong className="pricing-confirm-price">{formatCurrencyVnd(plan.price, t)}</strong>
            </div>

            <p className="pricing-confirm-note warn">{t('subscription.confirm.noAutoRenew')}</p>

            <ul className="pricing-confirm-highlights">
              {highlights.map((item) => (
                <li key={item.label}>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="pricing-confirm-details">
            <p className="pricing-confirm-note box">{t('subscription.confirm.modelsNote')}</p>

            <div className="pricing-confirm-models">
              <p className="pricing-confirm-models-title">
                {t('subscription.confirm.modelsTitle', { count: models.length })}
              </p>
              <div className="pricing-confirm-models-list">
                {models.map((model, idx) => {
                  const tags = modelTags(model);
                  return (
                    <article key={`${plan.id_base}-${model.model || model.name || idx}`} className="pricing-confirm-model">
                      <strong>{model.name || model.model || t('common.unknownModel')}</strong>
                      {tags.length > 0 ? (
                        <div className="pricing-confirm-model-tags">
                          {tags.map((tag) => (
                            <span key={`${model.model || model.name}-${tag}`}>{tag}</span>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
                {models.length === 0 ? <p className="muted">{t('subscription.confirm.noModels')}</p> : null}
              </div>
            </div>

            <p className="pricing-confirm-policy">{t('subscription.confirm.policy')}</p>

            <div className="pricing-confirm-support">
              <p>
                {t('subscription.confirm.support')}{' '}
                <a href={`tel:${SITE_SUPPORT_PHONE}`}>{SITE_SUPPORT_PHONE_LABEL}</a>
              </p>
              <p>{t('subscription.confirm.community')}</p>
            </div>

            <label className="pricing-confirm-promo">
              <span>{t('subscription.confirm.promoLabel')}</span>
              <input
                value={promoCode}
                placeholder={t('subscription.confirm.promoPlaceholder')}
                onChange={(e) => setPromoCode(e.target.value)}
                disabled={confirming}
              />
            </label>
          </section>
        </div>

        {error ? <p className="pricing-confirm-error">{error}</p> : null}

        <div className="pricing-confirm-actions">
          <button type="button" className="pricing-confirm-cancel" onClick={onClose} disabled={confirming}>
            {t('pricing.confirm.cancel')}
          </button>
          <button
            type="button"
            className="pricing-confirm-submit"
            onClick={() => onConfirm(promoCode.trim())}
            disabled={confirming}
          >
            {confirming ? <Loader2 size={16} className="spin" /> : null}
            {confirming
              ? t('subscription.confirm.creatingLink')
              : error
                ? t('pricing.retry')
                : t('pricing.confirm.submit')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
