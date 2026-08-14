import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import SubscriptionPaymentModal from '../components/SubscriptionPaymentModal';
import CreditConfirmModal from '../components/CreditConfirmModal';
import ModelCreditComparison from '../components/ModelCreditComparison';
import FaqSection from '../components/landing/FaqSection';
import { loginPathWithNext } from '../lib/landingConfig';
import { getEnterpriseFeatures } from '../lib/landingEnterpriseFeatures';
import { getDisplayUser, isLoggedIn, notifyCreditsUpdated, refreshSession } from '../services/authStore';
import {
  createTopupRequest,
  fetchCreditPackages,
  fetchTopupOrder,
  type CreditPackage,
} from '../services/topupApi';
import type { SubscriptionPaymentResult } from '../services/subscriptionPlans';
import { HOME_NOTIF_CONTACT } from '../services/siteConfig';
import { useLocale } from '../i18n';
import type { AppLocale, TranslationKey } from '../i18n/types';
import type { TranslateFn } from '../i18n/LanguageProvider';

const PRIMARY_TIER_COUNT = 3;

const PLAN_DESC_KEYS: Record<string, TranslationKey> = {
  'basic-member': 'pricing.planDesc.basic-member',
  'vip-member': 'pricing.planDesc.vip-member',
  'ultra-member': 'pricing.planDesc.ultra-member',
  'infinity-member': 'pricing.planDesc.infinity-member',
  'agency-pro': 'pricing.planDesc.agency-pro',
  'master-agency': 'pricing.planDesc.master-agency',
};

function numberLocale(locale: AppLocale): string {
  return locale === 'vi' ? 'vi-VN' : 'en-US';
}

function creditRate(pkg: CreditPackage): number {
  return Math.round((pkg.credits / pkg.amountVnd) * 1000);
}

function planDescription(t: TranslateFn, pkg: CreditPackage): string {
  const key = PLAN_DESC_KEYS[pkg.id];
  return key ? t(key) : t('pricing.planDesc.fallback');
}

interface CreditCardProps {
  pkg: CreditPackage;
  disabled: boolean;
  blocked: boolean;
  locale: AppLocale;
  t: TranslateFn;
  onBuy: (pkg: CreditPackage) => void;
}

function MagnificCreditCard({ pkg, disabled, blocked, locale, t, onBuy }: CreditCardProps) {
  const fmt = numberLocale(locale);
  const rate = creditRate(pkg);
  const addons: string[] = [];
  if (pkg.bonusPercent > 0) addons.push(t('pricing.addon.bonus', { percent: pkg.bonusPercent }));
  if (pkg.prioritySupport) addons.push(t('pricing.addon.prioritySupport'));
  addons.push(t('pricing.addon.rate', { rate: rate.toLocaleString(fmt) }));

  return (
    <article className={`pricing-magnific-card${pkg.featured ? ' featured' : ''}`}>
      {pkg.featured ? <span className="pricing-magnific-badge">{t('pricing.popular')}</span> : null}
      <h3 className="pricing-magnific-plan-name">{pkg.name}</h3>
      <p className="pricing-magnific-plan-desc">{planDescription(t, pkg)}</p>

      <div className="pricing-magnific-price-block">
        <div className="pricing-magnific-price">
          {pkg.credits > pkg.amountVnd ? (
            <span className="pricing-magnific-price-old">{pkg.credits.toLocaleString(fmt)}đ</span>
          ) : null}
          <span>{pkg.amountVnd.toLocaleString(fmt)}đ</span>
        </div>
        <span className="pricing-magnific-price-note">
          {t('pricing.priceNote', { credits: pkg.credits.toLocaleString(fmt) })}
        </span>
      </div>

      <button
        type="button"
        className="pricing-magnific-cta"
        onClick={() => onBuy(pkg)}
        disabled={disabled}
      >
        {blocked ? t('pricing.retry') : t('pricing.buyPlan')}
      </button>

      <ul className="pricing-magnific-features">
        <li>{t('pricing.feature.allModels')}</li>
        {pkg.bonusPercent > 0 ? (
          <li>{t('pricing.feature.bonus', { percent: pkg.bonusPercent })}</li>
        ) : null}
        {pkg.prioritySupport ? <li>{t('pricing.feature.prioritySupport')}</li> : null}
      </ul>

      <div className="pricing-magnific-addon">
        <p className="pricing-magnific-addon-title">{t('pricing.addonTitle')}</p>
        <div className="pricing-magnific-addon-tags">
          {addons.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </div>
    </article>
  );
}

export default function PricingPage() {
  const { t, locale } = useLocale();
  const fmt = numberLocale(locale);
  const navigate = useNavigate();
  const benefitFeatures = useMemo(() => getEnterpriseFeatures(t).slice(0, 3), [t]);
  const [creditPackages, setCreditPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payingPlanId, setPayingPlanId] = useState('');
  const [payError, setPayError] = useState('');
  const [paymentPlanName, setPaymentPlanName] = useState('');
  const [paymentPlanPrice, setPaymentPlanPrice] = useState('');
  const [paymentResult, setPaymentResult] = useState<SubscriptionPaymentResult | null>(null);
  const [confirmCreditPackage, setConfirmCreditPackage] = useState<CreditPackage | null>(null);
  const [creditOrderCode, setCreditOrderCode] = useState<number | null>(null);
  const [creditOrderStatus, setCreditOrderStatus] = useState('');
  const [blockedCreditPackageIds, setBlockedCreditPackageIds] = useState<string[]>([]);
  const username = getDisplayUser().username || '';

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setPayError('');
    setPayingPlanId('');
    setConfirmCreditPackage(null);
    setPaymentResult(null);
    setPaymentPlanName('');
    setPaymentPlanPrice('');
    setBlockedCreditPackageIds([]);

    fetchCreditPackages()
      .then((rows) => {
        if (active) setCreditPackages(rows);
      })
      .catch((err) => {
        if (!active) return;
        setCreditPackages([]);
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!creditOrderCode) return;
    let stopped = false;

    const poll = async () => {
      if (stopped) return;
      try {
        const order = await fetchTopupOrder(creditOrderCode);
        if (stopped) return;
        setCreditOrderStatus(order.status);
        if (order.status === 'credited') {
          await refreshSession();
          notifyCreditsUpdated();
          return;
        }
        if (order.status === 'failed') {
          setPayError(order.error || t('pricing.payFailed'));
          return;
        }
      } catch {
        // Lỗi mạng tạm thời: tiếp tục kiểm tra đơn.
      }
      if (!stopped) window.setTimeout(poll, 3000);
    };

    void poll();
    return () => {
      stopped = true;
    };
  }, [creditOrderCode, t]);

  const sortedPackages = useMemo(
    () => [...creditPackages].sort((a, b) => a.amountVnd - b.amountVnd),
    [creditPackages],
  );

  const primaryTiers = useMemo(() => sortedPackages.slice(0, PRIMARY_TIER_COUNT), [sortedPackages]);
  const enterpriseTiers = useMemo(() => sortedPackages.slice(PRIMARY_TIER_COUNT), [sortedPackages]);

  const purchaseDisabled = !!payingPlanId || !!confirmCreditPackage || !!paymentResult;

  function openCreditModal(creditPackage: CreditPackage): void {
    if (!isLoggedIn()) {
      navigate(loginPathWithNext('/pricing'));
      return;
    }
    setPayError('');
    setConfirmCreditPackage(creditPackage);
  }

  function closeCreditModal(): void {
    if (payingPlanId) return;
    setConfirmCreditPackage(null);
    if (!blockedCreditPackageIds.length) setPayError('');
  }

  function closePaymentModal(): void {
    setPaymentResult(null);
    setPaymentPlanName('');
    setPaymentPlanPrice('');
    setPayingPlanId('');
    setPayError('');
    setCreditOrderCode(null);
    setCreditOrderStatus('');
  }

  async function handleConfirmCredit(): Promise<void> {
    if (!confirmCreditPackage) return;
    if (!username) {
      setPayError(t('pricing.noUsername'));
      return;
    }

    setPayError('');
    setPayingPlanId(confirmCreditPackage.id);
    const packageId = confirmCreditPackage.id;
    try {
      const topup = await createTopupRequest(username, packageId);
      setBlockedCreditPackageIds((ids) => ids.filter((id) => id !== packageId));
      setPaymentPlanName(`${confirmCreditPackage.name} · ${topup.credits.toLocaleString(fmt)} Credits`);
      setPaymentPlanPrice(String(confirmCreditPackage.amountVnd));
      setPaymentResult({
        status: topup.status,
        url: topup.url,
        urlEmbedded: topup.urlEmbedded,
        qrImage: topup.qrImage,
        bankTransfer: topup.bankTransfer,
      });
      setCreditOrderCode(topup.orderCode);
      setCreditOrderStatus('pending');
      setConfirmCreditPackage(null);
      setPayError('');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const code = err && typeof err === 'object' && 'code' in err ? String((err as { code?: string }).code || '') : '';
      const isBalanceBlock =
        code === 'MERCHANT_BALANCE' ||
        /tạm dừng nhận thanh toán|tạm dừng nhận nạp|hạn mức nạp|không đọc được số dư merchant/i.test(
          message,
        );
      setPayError(message);
      if (isBalanceBlock) {
        setBlockedCreditPackageIds((ids) => (ids.includes(packageId) ? ids : [...ids, packageId]));
      }
    } finally {
      setPayingPlanId('');
    }
  }

  return (
    <div className="pricing-page-magnific">
      <section className="pricing-magnific-hero" id="pricing">
        <div className="pricing-magnific-container">
          <h1>{t('pricing.hero.title')}</h1>
          <p>{t('pricing.hero.subtitle')}</p>
        </div>
      </section>

      <section className="pricing-magnific-plans" aria-label={t('pricing.plansAria')}>
        <div className="pricing-magnific-container">
          {loading ? (
            <div className="pricing-magnific-loading">
              <Loader2 size={20} className="spin" />
              <span>{t('pricing.loading')}</span>
            </div>
          ) : null}

          {!loading && error ? <p className="pricing-magnific-error">{error}</p> : null}

          {!loading && !error ? (
            <>
              {!!payError && !confirmCreditPackage ? (
                <div className="pricing-magnific-alert" role="alert">
                  {payError}
                </div>
              ) : null}

              <div className="pricing-magnific-expiry">
                <span>☆</span>
                <strong>{t('pricing.expiry')}</strong>
              </div>

              {primaryTiers.length ? (
                <div className="pricing-magnific-grid">
                  {primaryTiers.map((pkg) => (
                    <MagnificCreditCard
                      key={pkg.id}
                      pkg={pkg}
                      disabled={purchaseDisabled}
                      blocked={blockedCreditPackageIds.includes(pkg.id)}
                      locale={locale}
                      t={t}
                      onBuy={openCreditModal}
                    />
                  ))}
                </div>
              ) : null}

              {enterpriseTiers.length ? (
                <>
                  <h2 className="pricing-magnific-subhead" style={{ marginTop: '3rem' }}>
                    {t('pricing.enterpriseTitle')}
                  </h2>
                  <div className={`pricing-magnific-grid${enterpriseTiers.length === 2 ? ' cols-2' : ''}`}>
                    {enterpriseTiers.map((pkg) => (
                      <MagnificCreditCard
                        key={pkg.id}
                        pkg={pkg}
                        disabled={purchaseDisabled}
                        blocked={blockedCreditPackageIds.includes(pkg.id)}
                        locale={locale}
                        t={t}
                        onBuy={openCreditModal}
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </>
          ) : null}
        </div>
      </section>

      {!loading && !error && creditPackages.length ? (
        <div className="pricing-magnific-container">
          <ModelCreditComparison creditPackages={creditPackages} variant="magnific" />
        </div>
      ) : null}

      <section className="pricing-magnific-benefits" aria-label={t('pricing.benefitsAria')}>
        <div className="pricing-magnific-container">
          <div className="pricing-magnific-benefits-grid">
            {benefitFeatures.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="pricing-magnific-benefit">
                  <span className="pricing-magnific-benefit-icon" aria-hidden>
                    <Icon size={22} strokeWidth={1.75} />
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <FaqSection />

      <section className="pricing-magnific-help" aria-label={t('pricing.helpAria')}>
        <div className="pricing-magnific-container">
          <div className="pricing-magnific-help-card">
            <h2>{t('pricing.help.title')}</h2>
            <p>{t('pricing.help.desc')}</p>
            <a
              href={HOME_NOTIF_CONTACT.zaloSupport}
              target="_blank"
              rel="noreferrer"
              className="pricing-magnific-help-btn"
            >
              {t('pricing.help.cta')}
            </a>
          </div>
        </div>
      </section>

      <CreditConfirmModal
        open={!!confirmCreditPackage}
        creditPackage={confirmCreditPackage}
        confirming={!!payingPlanId}
        error={payError}
        onClose={closeCreditModal}
        onConfirm={() => void handleConfirmCredit()}
      />

      <SubscriptionPaymentModal
        open={!!paymentResult}
        planName={paymentPlanName}
        planPrice={paymentPlanPrice}
        payment={paymentResult}
        statusMessage={
          creditOrderStatus === 'credited'
            ? t('pricing.paymentSuccess')
            : creditOrderCode
              ? t('pricing.paymentPending')
              : undefined
        }
        onClose={closePaymentModal}
      />
    </div>
  );
}
