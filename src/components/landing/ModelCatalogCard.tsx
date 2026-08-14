import { ArrowRight } from 'lucide-react';
import { useLocale } from '../../i18n';
import type { CatalogModel } from '../../services/modelCatalog';
import {
  modelCapabilityTags,
  modelLabel,
  modelOnSale,
  modelPriceLabel,
  modelProvider,
  modelSalePercent,
} from '../../services/modelCatalogDisplay';
import { modelSlug } from '../../services/modelSchema';

interface Props {
  entry: CatalogModel;
  isNew?: boolean;
  onCreate: (entry: CatalogModel) => void;
}

export default function ModelCatalogCard({ entry, isNew, onCreate }: Props) {
  const { t } = useLocale();
  const { model, jobType } = entry;
  const name = modelLabel(model);
  const price = modelPriceLabel(model);
  const tags = modelCapabilityTags(model, jobType);
  const sale = modelOnSale(model) ? modelSalePercent(model) : null;
  const provider = modelProvider(model);

  return (
    <article className="model-dir-card">
      <div className="model-dir-card-top">
        <span className="model-dir-provider">{provider}</span>
        {isNew ? <span className="model-dir-badge new">{t('landing.modelCard.new')}</span> : null}
        {sale ? <span className="model-dir-badge sale">-{sale}%</span> : null}
      </div>
      <h3 className="model-dir-name">{name}</h3>
      <p className="model-dir-desc">
        {model.description?.trim() ||
          t('landing.modelCard.fallbackDesc', { jobType, provider })}
      </p>
      {tags.length ? (
        <div className="model-dir-tags">
          {tags.map((tag) => (
            <span key={tag} className="model-dir-tag">
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      <div className="model-dir-foot">
        <div className="model-dir-price">
          {price ? (
            <>
              <strong>{price}</strong>
              <span>{t('landing.modelCard.creditsSuffix')}</span>
            </>
          ) : (
            <span className="model-dir-price-muted">{t('landing.modelCard.contact')}</span>
          )}
        </div>
        <button type="button" className="model-dir-cta" onClick={() => onCreate(entry)}>
          {t('landing.modelCard.create')}
          <ArrowRight size={14} />
        </button>
      </div>
      <span className="sr-only">{modelSlug(model)}</span>
    </article>
  );
}
