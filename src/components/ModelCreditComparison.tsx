import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import type { GommoModel, JobType } from '../services/api';
import type { CreditPackage } from '../services/topupApi';
import { fetchModelCatalog } from '../services/modelCatalog';
import { useLocale } from '../i18n';
import type { AppLocale, TranslationKey } from '../i18n/types';
import type { TranslateFn } from '../i18n/LanguageProvider';

interface Props {
  creditPackages: CreditPackage[];
  variant?: 'app' | 'magnific';
}

interface ModelCategory {
  type: JobType;
  label: string;
  models: GommoModel[];
}

interface PriceRow {
  key: string;
  modelName: string;
  variant: string;
  credits: number;
  originalCredits?: number;
}

const CATEGORY_TYPES = [
  'image',
  'video',
  'tts',
  'music',
  'avatar-lipsync',
  'image-upscale',
  'video-upscale',
  'video-vfx',
] as const satisfies readonly JobType[];

type CompareJobType = (typeof CATEGORY_TYPES)[number];

const CATEGORY_LABEL_KEYS: Record<CompareJobType, TranslationKey> = {
  image: 'pricing.compare.category.image',
  video: 'pricing.compare.category.video',
  tts: 'pricing.compare.category.tts',
  music: 'pricing.compare.category.music',
  'avatar-lipsync': 'pricing.compare.category.avatar-lipsync',
  'image-upscale': 'pricing.compare.category.image-upscale',
  'video-upscale': 'pricing.compare.category.video-upscale',
  'video-vfx': 'pricing.compare.category.video-vfx',
};

function numberLocale(locale: AppLocale): string {
  return locale === 'vi' ? 'vi-VN' : 'en-US';
}

function modelLabel(model: GommoModel): string {
  return model.name || model.model || model.slug || model.model_id || model.id || 'Model';
}

function priceRows(models: GommoModel[], t: TranslateFn): PriceRow[] {
  return models.flatMap((model, modelIndex) => {
    const name = modelLabel(model);
    const prices = Array.isArray(model.prices) ? model.prices : [];
    if (!prices.length) {
      const credits = Number(model.price || 0);
      if (credits <= 0) return [];
      return [{
        key: `${name}-${modelIndex}`,
        modelName: name,
        variant: model.rate_type === 'per_second' ? t('pricing.compare.perSecond') : t('pricing.compare.default'),
        credits,
      }];
    }

    return prices.flatMap((price, priceIndex) => {
      const credits = Number(price.price || 0);
      if (credits <= 0) return [];
      const original = Number(
        price.price_default || price.original_price || price.price_original || price.list_price || 0,
      );
      const variant = [price.mode, price.resolution].filter(Boolean).join(' · ') || t('pricing.compare.default');
      return [{
        key: `${name}-${modelIndex}-${priceIndex}`,
        modelName: name,
        variant,
        credits,
        originalCredits: original > credits ? original : undefined,
      }];
    });
  });
}

function formatCredits(value: number, locale: AppLocale): string {
  return `${value.toLocaleString(numberLocale(locale), { maximumFractionDigits: 2 })} c`;
}

function formatEquivalentVnd(credits: number, creditPackage: CreditPackage, locale: AppLocale): string {
  const fmt = numberLocale(locale);
  const value = credits * (creditPackage.amountVnd / creditPackage.credits);
  if (value < 1) {
    return `${value.toLocaleString(fmt, { maximumFractionDigits: 2 })}đ`;
  }
  return `${Math.round(value).toLocaleString(fmt)}đ`;
}

export default function ModelCreditComparison({ creditPackages, variant = 'app' }: Props) {
  const { t, locale } = useLocale();
  const [categories, setCategories] = useState<ModelCategory[]>([]);
  const [openTypes, setOpenTypes] = useState<Set<JobType>>(new Set(['image']));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    void fetchModelCatalog([...CATEGORY_TYPES])
      .then((catalog) => {
        if (!active) return;
        const byType = new Map<JobType, GommoModel[]>();
        for (const entry of catalog) {
          const list = byType.get(entry.jobType) ?? [];
          list.push(entry.model);
          byType.set(entry.jobType, list);
        }
        const loaded = CATEGORY_TYPES.flatMap((type) => {
          const models = byType.get(type) ?? [];
          if (!models.length) return [];
          return [{ type, label: t(CATEGORY_LABEL_KEYS[type]), models }];
        });
        setCategories(loaded);
        if (!loaded.length) setError(t('pricing.compare.noData'));
      })
      .catch((err) => {
        if (!active) return;
        setCategories([]);
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [t]);

  const packageColumns = useMemo(
    () => [...creditPackages].sort((a, b) => a.amountVnd - b.amountVnd),
    [creditPackages],
  );

  function toggle(type: JobType): void {
    setOpenTypes((current) => {
      const next = new Set(current);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  const isMagnific = variant === 'magnific';
  const fmt = numberLocale(locale);

  return (
    <section className={`pricing-model-compare${isMagnific ? ' pricing-model-compare--magnific' : ''}`}>
      <div className="pricing-model-compare-head">
        <div>
          {!isMagnific ? <p className="kicker">Model Pricing</p> : null}
          <h2>{t('pricing.compare.title')}</h2>
        </div>
        <p>{t('pricing.compare.subtitle')}</p>
      </div>

      {loading ? (
        <div className="pricing-loading">
          <Loader2 size={16} className="spin" />
          <span>{t('pricing.compare.loading')}</span>
        </div>
      ) : null}
      {!loading && error ? <p className="muted">{error}</p> : null}

      {!loading && !error ? (
        <div className="pricing-model-groups">
          {categories.map((category) => {
            const rows = priceRows(category.models, t);
            const open = openTypes.has(category.type);
            if (!rows.length) return null;
            return (
              <article key={category.type} className={`pricing-model-group${open ? ' open' : ''}`}>
                <button
                  type="button"
                  className="pricing-model-group-toggle"
                  aria-expanded={open}
                  onClick={() => toggle(category.type)}
                >
                  <span>
                    <strong>{category.label}</strong>
                    <small>{t('pricing.compare.priceLevels', { count: rows.length })}</small>
                  </span>
                  <ChevronDown size={18} />
                </button>

                {open ? (
                  <div className="pricing-model-table-wrap">
                    <table className="pricing-model-table">
                      <thead>
                        <tr>
                          <th>{t('pricing.compare.modelCol')}</th>
                          <th>{t('pricing.compare.modeCol')}</th>
                          <th>{t('pricing.compare.creditCol')}</th>
                          {packageColumns.map((creditPackage) => (
                            <th
                              key={creditPackage.id}
                              className={creditPackage.featured ? 'featured-col' : undefined}
                            >
                              <span>{creditPackage.name}</span>
                              <small>{creditPackage.credits.toLocaleString(fmt)} c</small>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr key={row.key}>
                            <td><strong>{row.modelName}</strong></td>
                            <td>{row.variant}</td>
                            <td>
                              {row.originalCredits ? <del>{formatCredits(row.originalCredits, locale)}</del> : null}
                              <strong>{formatCredits(row.credits, locale)}</strong>
                            </td>
                            {packageColumns.map((creditPackage) => (
                              <td
                                key={`${row.key}-${creditPackage.id}`}
                                className={creditPackage.featured ? 'featured' : ''}
                              >
                                {formatEquivalentVnd(row.credits, creditPackage, locale)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
