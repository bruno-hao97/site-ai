import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import type { GommoModel, JobType } from '../services/api';
import type { CreditPackage } from '../services/topupApi';
import { fetchModelCatalog } from '../services/modelCatalog';

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

const CATEGORIES: Array<{ type: JobType; label: string }> = [
  { type: 'image', label: 'Tạo hình ảnh' },
  { type: 'video', label: 'Tạo video' },
  { type: 'tts', label: 'Giọng nói (TTS)' },
  { type: 'music', label: 'Tạo nhạc' },
  { type: 'avatar-lipsync', label: 'Avatar & Lip sync' },
  { type: 'image-upscale', label: 'Nâng cấp hình ảnh' },
  { type: 'video-upscale', label: 'Nâng cấp video' },
  { type: 'video-vfx', label: 'Hiệu ứng video' },
];

function modelLabel(model: GommoModel): string {
  return model.name || model.model || model.slug || model.model_id || model.id || 'Model';
}

function priceRows(models: GommoModel[]): PriceRow[] {
  return models.flatMap((model, modelIndex) => {
    const name = modelLabel(model);
    const prices = Array.isArray(model.prices) ? model.prices : [];
    if (!prices.length) {
      const credits = Number(model.price || 0);
      if (credits <= 0) return [];
      return [{
        key: `${name}-${modelIndex}`,
        modelName: name,
        variant: model.rate_type === 'per_second' ? 'Mỗi giây' : 'Mặc định',
        credits,
      }];
    }

    return prices.flatMap((price, priceIndex) => {
      const credits = Number(price.price || 0);
      if (credits <= 0) return [];
      const original = Number(
        price.price_default || price.original_price || price.price_original || price.list_price || 0,
      );
      const variant = [price.mode, price.resolution].filter(Boolean).join(' · ') || 'Mặc định';
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

function formatCredits(value: number): string {
  return `${value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} c`;
}

function formatEquivalentVnd(credits: number, creditPackage: CreditPackage): string {
  const value = credits * (creditPackage.amountVnd / creditPackage.credits);
  if (value < 1) {
    return `${value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}đ`;
  }
  return `${Math.round(value).toLocaleString('vi-VN')}đ`;
}

export default function ModelCreditComparison({ creditPackages, variant = 'app' }: Props) {
  const [categories, setCategories] = useState<ModelCategory[]>([]);
  const [openTypes, setOpenTypes] = useState<Set<JobType>>(new Set(['image']));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    void fetchModelCatalog(CATEGORIES.map((c) => c.type))
      .then((catalog) => {
        if (!active) return;
        const byType = new Map<JobType, GommoModel[]>();
        for (const entry of catalog) {
          const list = byType.get(entry.jobType) ?? [];
          list.push(entry.model);
          byType.set(entry.jobType, list);
        }
        const loaded = CATEGORIES.flatMap((category) => {
          const models = byType.get(category.type) ?? [];
          return models.length ? [{ ...category, models }] : [];
        });
        setCategories(loaded);
        if (!loaded.length) setError('Chưa có dữ liệu giá model.');
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
  }, []);

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

  return (
    <section className={`pricing-model-compare${isMagnific ? ' pricing-model-compare--magnific' : ''}`}>
      <div className="pricing-model-compare-head">
        <div>
          {!isMagnific ? <p className="kicker">Model Pricing</p> : null}
          <h2>
            {isMagnific
              ? 'So sánh chi phí theo gói credit'
              : 'So sánh giá Model theo gói Credit'}
          </h2>
        </div>
        <p>Chi phí quy đổi dựa trên số credit nhận được của từng gói.</p>
      </div>

      {loading ? (
        <div className="pricing-loading">
          <Loader2 size={16} className="spin" />
          <span>Đang tải bảng giá model...</span>
        </div>
      ) : null}
      {!loading && error ? <p className="muted">{error}</p> : null}

      {!loading && !error ? (
        <div className="pricing-model-groups">
          {categories.map((category) => {
            const rows = priceRows(category.models);
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
                    <small>{rows.length} mức giá</small>
                  </span>
                  <ChevronDown size={18} />
                </button>

                {open ? (
                  <div className="pricing-model-table-wrap">
                    <table className="pricing-model-table">
                      <thead>
                        <tr>
                          <th>Model</th>
                          <th>Chế độ</th>
                          <th>Giá Credit</th>
                          {packageColumns.map((creditPackage) => (
                            <th
                              key={creditPackage.id}
                              className={creditPackage.featured ? 'featured-col' : undefined}
                            >
                              <span>{creditPackage.name}</span>
                              <small>{creditPackage.credits.toLocaleString('vi-VN')} c</small>
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
                              {row.originalCredits ? <del>{formatCredits(row.originalCredits)}</del> : null}
                              <strong>{formatCredits(row.credits)}</strong>
                            </td>
                            {packageColumns.map((creditPackage) => (
                              <td
                                key={`${row.key}-${creditPackage.id}`}
                                className={creditPackage.featured ? 'featured' : ''}
                              >
                                {formatEquivalentVnd(row.credits, creditPackage)}
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
