import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { loadAuth } from '../services/authStore';
import {
  fetchUpstreamUsageHistory,
  filterUsageByDate,
  filterUsageByType,
  type UsageHistoryItem,
} from '../services/upstreamUsageHistory';
import { listHistory } from '../services/historyStore';

const TABS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'image', label: 'Ảnh' },
  { value: 'video', label: 'Video' },
  { value: 'audio', label: 'Audio' },
];

const PAGE_SIZE = 15;

function formatRowTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

function typeIcon(label: string): string {
  if (/ảnh|image/i.test(label)) return '🖼';
  if (/video/i.test(label)) return '🎬';
  return '🔊';
}

function localFallbackRows(): UsageHistoryItem[] {
  return listHistory(null).map((e) => ({
    id: e.id,
    type: e.type,
    typeLabel:
      e.type === 'image' ? 'Tạo ảnh' :
      e.type === 'video' ? 'Tạo video' :
      /tts|music|avatar/.test(e.type) ? 'Tạo audio' : e.type,
    model: e.modelName || e.modelSlug,
    prompt: e.prompt,
    status: 'success' as const,
    statusLabel: 'Hoàn tất',
    cost: null,
    balanceAfter: null,
    createdAt: e.createdAt,
  }));
}

export default function UsageHistoryPage() {
  const { type: typeParam } = useParams<{ type?: string }>();
  const tab = typeParam && TABS.some((t) => t.value === typeParam) ? typeParam : 'all';

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [items, setItems] = useState<UsageHistoryItem[]>([]);
  const [source, setSource] = useState<'upstream' | 'local' | 'empty'>('empty');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    const auth = loadAuth();
    if (!auth?.access_token) {
      setError('Chưa đăng nhập');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetchUpstreamUsageHistory(auth.access_token, auth.domain, {
        from: from || undefined,
        to: to || undefined,
        type: tab === 'all' ? undefined : tab,
      });
      if (res.items.length > 0) {
        setItems(res.items);
        setSource('upstream');
      } else {
        const local = localFallbackRows();
        setItems(local);
        setSource(local.length > 0 ? 'local' : 'empty');
      }
    } catch {
      const local = localFallbackRows();
      setItems(local);
      setSource(local.length > 0 ? 'local' : 'empty');
    } finally {
      setLoading(false);
    }
  }, [from, to, tab]);

  useEffect(() => {
    void load();
    setPage(1);
  }, [load]);

  const filtered = useMemo(() => {
    let rows = filterUsageByType(items, tab === 'all' ? null : tab);
    rows = filterUsageByDate(rows, from || undefined, to || undefined);
    return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [items, tab, from, to]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="page usage-billing-page">
      <div className="usage-billing-head">
        <div>
          <h1>Lịch sử sử dụng</h1>
          <p className="lead">Hiển thị lịch sử sử dụng của tài khoản của bạn.</p>
          {source === 'local' && (
            <p className="usage-billing-fallback muted">
              Đang dùng lịch sử Studio local — chưa có dữ liệu billing upstream.
              <Link to="/studio-history"> Xem kết quả gen →</Link>
            </p>
          )}
        </div>
        <a
          href="https://79ai.net/wallet"
          target="_blank"
          rel="noreferrer"
          className="btn primary usage-topup-btn"
        >
          Nạp tiền
        </a>
      </div>

      <div className="usage-billing-filters panel">
        <label>
          <span>Từ ngày</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          <span>Đến ngày</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button type="button" className="btn secondary sm" onClick={() => void load()}>
          🔍
        </button>
      </div>

      <div className="page-segment-tabs usage-billing-tabs">
        {TABS.map((t) => (
          <Link
            key={t.value}
            to={t.value === 'all' ? '/usage-history' : `/usage-history/${t.value}`}
            className={`tab ${tab === t.value ? 'active' : ''}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {loading && <p className="muted">Đang tải…</p>}
      {error && <p className="error">{error}</p>}

      {!loading && pageItems.length === 0 ? (
        <div className="panel usage-billing-empty">
          <p>Chưa có lịch sử trong khoảng đã chọn.</p>
        </div>
      ) : (
        <div className="usage-billing-list">
          {pageItems.map((row) => (
            <article key={row.id} className="usage-billing-row panel">
              <div className="usage-billing-row-left">
                <span className="usage-billing-icon">{typeIcon(row.typeLabel)}</span>
                <div>
                  <div className="usage-billing-title">
                    {row.typeLabel}
                    {row.status === 'success' && (
                      <span className="usage-badge-success">Thành công</span>
                    )}
                  </div>
                  {row.model && <p className="usage-billing-model">Model: {row.model}</p>}
                  {row.prompt && <p className="usage-billing-prompt">{row.prompt}</p>}
                  <time className="usage-billing-time">{formatRowTime(row.createdAt)}</time>
                </div>
              </div>
              <div className="usage-billing-row-right">
                <div>
                  <span className="usage-billing-col-label">Chi phí</span>
                  <span className="usage-billing-cost">
                    {row.cost != null ? `-${Math.abs(row.cost).toFixed(2)}` : '—'}
                  </span>
                </div>
                <div>
                  <span className="usage-billing-col-label">Số dư</span>
                  <span>
                    {row.balanceAfter != null ? row.balanceAfter.toLocaleString('vi-VN') : '—'}
                  </span>
                </div>
                <div>
                  <span className="usage-billing-col-label">Trạng thái</span>
                  <span className="usage-billing-status">{row.statusLabel}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {filtered.length > PAGE_SIZE && (
        <div className="usage-billing-pagination">
          <button
            type="button"
            className="btn ghost sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ←
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 7).map((n) => (
            <button
              key={n}
              type="button"
              className={`btn ghost sm ${page === n ? 'active' : ''}`}
              onClick={() => setPage(n)}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            className="btn ghost sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
