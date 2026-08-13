import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import '../styles/landing.css';
import LandingLayout, { useLandingCta } from '../components/landing/LandingLayout';
import ModelCatalogCard from '../components/landing/ModelCatalogCard';
import { useModelCatalog } from '../hooks/useModelCatalog';
import {
  catalogByJobTypes,
  MODEL_FILTER_GROUPS,
  type CatalogModel,
} from '../services/modelCatalog';
import { buildNewModelChecker, modelLabel, modelProvider } from '../services/modelCatalogDisplay';
import { modelSlug } from '../services/modelSchema';
import { studioRouteForType } from '../constants/studioTypes';

export default function ModelsPage() {
  const { available, loading, error, count } = useModelCatalog();
  const cta = useLandingCta();
  const [query, setQuery] = useState('');
  const [filterId, setFilterId] = useState('all');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = 'Danh sách Model AI · trungtamai.vn';
    return () => {
      document.title = 'AI Center';
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filterGroup = MODEL_FILTER_GROUPS.find((g) => g.id === filterId) ?? MODEL_FILTER_GROUPS[0]!;
  const isNew = useMemo(() => buildNewModelChecker(available.map((e) => e.model)), [available]);

  const filtered = useMemo(() => {
    const list = catalogByJobTypes(available, filterGroup.types);
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(({ model, jobType }) => {
      const hay = [
        modelLabel(model),
        model.description,
        modelProvider(model),
        modelSlug(model),
        jobType,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [available, filterGroup.types, query]);

  function handleCreate(entry: CatalogModel) {
    const route = studioRouteForType(entry.jobType);
    const slug = modelSlug(entry.model);
    cta(`${route}?model=${encodeURIComponent(slug)}`);
  }

  return (
    <LandingLayout>
      <section className="model-dir-page">
        <div className="container">
          <header className="model-dir-header">
            <p className="model-dir-kicker">KIẾN TẠO TOÀN DIỆN</p>
            <h1>Danh Sách Model AI</h1>
            <p className="model-dir-lead">
              Khám phá bộ sưu tập model cho video, hình ảnh, âm thanh và hơn thế — chọn công cụ phù
              hợp dự án của bạn.
              {!loading && count > 0 ? (
                <>
                  {' '}
                  — <strong>{count} model</strong>
                </>
              ) : null}
            </p>

            <div className="model-dir-search-wrap">
              <Search size={18} className="model-dir-search-icon" />
              <input
                ref={searchRef}
                type="search"
                className="model-dir-search"
                placeholder="Tìm kiếm model (Ctrl + K)…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="model-dir-filters" role="tablist" aria-label="Lọc loại model">
              {MODEL_FILTER_GROUPS.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  role="tab"
                  aria-selected={filterId === group.id}
                  className={`model-dir-filter ${filterId === group.id ? 'active' : ''}`}
                  onClick={() => setFilterId(group.id)}
                >
                  {group.label}
                </button>
              ))}
            </div>
          </header>

          {loading ? (
            <div className="model-dir-loading">
              <Loader2 size={20} className="spin" />
              <span>Đang tải catalog model…</span>
            </div>
          ) : null}

          {!loading && error ? <p className="model-dir-error">{error}</p> : null}

          {!loading && !error ? (
            <div className="model-dir-grid">
              {filtered.map((entry) => (
                <ModelCatalogCard
                  key={`${entry.jobType}-${modelSlug(entry.model)}`}
                  entry={entry}
                  isNew={isNew(entry.model)}
                  onCreate={handleCreate}
                />
              ))}
            </div>
          ) : null}

          {!loading && !error && filtered.length === 0 ? (
            <p className="model-dir-empty">Không tìm thấy model phù hợp.</p>
          ) : null}
        </div>
      </section>
    </LandingLayout>
  );
}
