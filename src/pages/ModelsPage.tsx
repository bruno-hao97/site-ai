import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Search } from 'lucide-react';
import '../styles/landing.css';
import '../styles/pricing-magnific.css';
import '../styles/models-magnific.css';
import ModelCreditComparison from '../components/ModelCreditComparison';
import FaqSection from '../components/landing/FaqSection';
import LandingLayout, { useLandingCta } from '../components/landing/LandingLayout';
import ModelCatalogCard from '../components/landing/ModelCatalogCard';
import { ENTERPRISE_FEATURES } from '../lib/landingEnterpriseFeatures';
import { useModelCatalog } from '../hooks/useModelCatalog';
import { isLoggedIn } from '../services/authStore';
import { landingPageClassName } from '../lib/landingShell';
import {
  catalogByJobTypes,
  MODEL_FILTER_GROUPS,
  type CatalogModel,
} from '../services/modelCatalog';
import { buildNewModelChecker, modelLabel, modelProvider } from '../services/modelCatalogDisplay';
import { modelSlug } from '../services/modelSchema';
import { studioRouteForType } from '../constants/studioTypes';
import { fetchCreditPackages, type CreditPackage } from '../services/topupApi';
import { HOME_NOTIF_CONTACT } from '../services/siteConfig';

const BENEFIT_FEATURES = ENTERPRISE_FEATURES.slice(0, 3);

function ModelCatalogBody({
  loading,
  error,
  count,
  query,
  setQuery,
  filterId,
  setFilterId,
  filtered,
  isNew,
  searchRef,
  onCreate,
}: {
  loading: boolean;
  error: string;
  count: number;
  query: string;
  setQuery: (value: string) => void;
  filterId: string;
  setFilterId: (id: string) => void;
  filtered: CatalogModel[];
  isNew: (model: CatalogModel['model']) => boolean;
  searchRef: RefObject<HTMLInputElement | null>;
  onCreate: (entry: CatalogModel) => void;
}) {
  return (
    <>
      <header className="model-dir-header">
        <p className="model-dir-kicker">KIẾN TẠO TOÀN DIỆN</p>
        <h1>Danh sách Model AI</h1>
        <p className="model-dir-lead">
          Khám phá bộ sưu tập model cho video, hình ảnh, âm thanh và hơn thế — chọn công cụ phù hợp dự
          án của bạn.
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
              onCreate={onCreate}
            />
          ))}
        </div>
      ) : null}

      {!loading && !error && filtered.length === 0 ? (
        <p className="model-dir-empty">Không tìm thấy model phù hợp.</p>
      ) : null}
    </>
  );
}

function ModelsGuestExtras({
  creditPackages,
  packagesLoading,
}: {
  creditPackages: CreditPackage[];
  packagesLoading: boolean;
}) {
  return (
    <>
      <Link to="/pricing" className="models-magnific-pricing-link">
        Giá model tính theo <strong>credit</strong> — xem gói nạp và bảng quy đổi bên dưới hoặc{' '}
        <strong>mở trang bảng giá</strong>
      </Link>

      {!packagesLoading && creditPackages.length ? (
        <ModelCreditComparison creditPackages={creditPackages} variant="magnific" />
      ) : null}

      <section className="pricing-magnific-benefits" aria-label="Lợi ích">
        <div className="pricing-magnific-container">
          <div className="pricing-magnific-benefits-grid">
            {BENEFIT_FEATURES.map((item) => {
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

      <section className="pricing-magnific-help" aria-label="Hỗ trợ">
        <div className="pricing-magnific-container">
          <div className="pricing-magnific-help-card">
            <h2>Cần gợi ý model?</h2>
            <p>
              Chưa chắc model nào phù hợp dự án hoặc cần ước tính chi phí credit? Liên hệ qua Zalo — đội
              ngũ sẽ tư vấn nhanh.
            </p>
            <a
              href={HOME_NOTIF_CONTACT.zaloSupport}
              target="_blank"
              rel="noreferrer"
              className="pricing-magnific-help-btn"
            >
              Liên hệ hỗ trợ
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

export default function ModelsPage() {
  const guest = !isLoggedIn();
  const { available, loading, error, count } = useModelCatalog();
  const cta = useLandingCta();
  const [query, setQuery] = useState('');
  const [filterId, setFilterId] = useState('all');
  const [creditPackages, setCreditPackages] = useState<CreditPackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(guest);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = 'Danh sách Model AI · trungtamai.vn';
    return () => {
      document.title = 'Trung tâm AI';
    };
  }, []);

  useEffect(() => {
    if (!guest) return;
    let active = true;
    setPackagesLoading(true);
    void fetchCreditPackages()
      .then((rows) => {
        if (active) setCreditPackages(rows);
      })
      .catch(() => {
        if (active) setCreditPackages([]);
      })
      .finally(() => {
        if (active) setPackagesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [guest]);

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

  const catalogBody = (
    <ModelCatalogBody
      loading={loading}
      error={error}
      count={count}
      query={query}
      setQuery={setQuery}
      filterId={filterId}
      setFilterId={setFilterId}
      filtered={filtered}
      isNew={isNew}
      searchRef={searchRef}
      onCreate={handleCreate}
    />
  );

  if (guest) {
    return (
      <LandingLayout>
        <div className="models-page-magnific">
          <section className="models-magnific-catalog" id="models">
            <div className="pricing-magnific-container">{catalogBody}</div>
          </section>
          <div className="pricing-magnific-container">
            <ModelsGuestExtras creditPackages={creditPackages} packagesLoading={packagesLoading} />
          </div>
        </div>
      </LandingLayout>
    );
  }

  return (
    <div className={landingPageClassName('landing-page--embedded')}>
      <main className="landing-main">
        <section className="model-dir-page">
          <div className="container">{catalogBody}</div>
        </section>
      </main>
    </div>
  );
}
