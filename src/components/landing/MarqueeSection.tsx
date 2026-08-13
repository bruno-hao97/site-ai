import { useMemo } from 'react';
import { useModelCatalog } from '../../hooks/useModelCatalog';
import { modelLabel } from '../../services/modelCatalogDisplay';
import { modelSlug } from '../../services/modelSchema';

export default function MarqueeSection() {
  const { available, loading, count } = useModelCatalog();

  const models = useMemo(() => {
    if (!available.length) return [];
    const seen = new Set<string>();
    const rows: { id: string; name: string }[] = [];
    for (const entry of available) {
      const slug = modelSlug(entry.model);
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      rows.push({ id: slug, name: modelLabel(entry.model) });
    }
    return rows;
  }, [available]);

  const items = models.length ? [...models, ...models] : [];

  return (
    <section className="landing-section landing-section-light marquee-section">
      <p className="marquee-label">
        {loading
          ? 'Đang tải model…'
          : count
            ? `Hơn ${count}+ model AI được hỗ trợ`
            : 'Model AI được hỗ trợ'}
      </p>

      {loading ? (
        <div className="marquee-track marquee-track-skeleton" aria-hidden="true">
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} className="marquee-pill marquee-pill-skeleton" />
          ))}
        </div>
      ) : items.length ? (
        <div className="marquee-track" aria-label="Danh sách model AI">
          {items.map((m, i) => (
            <span key={`${m.id}-${i}`} className="marquee-pill" title={m.name}>
              {m.name}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
