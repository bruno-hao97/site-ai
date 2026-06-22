import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchDashboardStats,
  type DashboardPeriod,
  type DashboardStats,
} from '../services/backendApi';
import { fetchGommoDashboardStats } from '../services/gommoDashboard';
import { loadAuth } from '../services/authStore';
const PERIODS: { value: DashboardPeriod; label: string }[] = [
  { value: '7d', label: '7 ngày' },
  { value: '30d', label: '30 ngày' },
  { value: 'all', label: 'Tất cả' },
];

const TX_LABELS: Record<string, string> = {
  signup_bonus: 'Bonus đăng ký',
  job_charge: 'Trừ job',
  job_refund: 'Hoàn credit',
  topup: 'Nạp tiền',
  promotion: 'Khuyến mãi',
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function formatShortDate(date: string) {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function BarChart({
  data,
  valueKey,
  label,
  color = 'var(--accent)',
}: {
  data: Array<Record<string, string | number>>;
  valueKey: string;
  label: string;
  color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => Number(d[valueKey]) || 0));

  return (
    <div className="chart">
      <p className="chart-title">{label}</p>
      <div className="chart-bars">
        {data.map((d) => {
          const val = Number(d[valueKey]) || 0;
          const h = Math.round((val / max) * 100);
          return (
            <div key={String(d.date)} className="chart-bar-wrap" title={`${d.date}: ${val}`}>
              <div className="chart-bar" style={{ height: `${h}%`, background: color }} />
              <span className="chart-bar-label">{formatShortDate(String(d.date))}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<DashboardPeriod>('7d');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // User đăng nhập Gommo: dựng thống kê từ data Gommo thật.
      // User backend (Google/local): dùng ledger backend.
      const data = loadAuth()
        ? await fetchGommoDashboardStats(period)
        : await fetchDashboardStats(period);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="page dashboard-page">
      <div className="page-head dashboard-head">
        <div>
          <p className="kicker">Dashboard</p>
          <h1>Thống kê sử dụng</h1>
          <p className="lead">4 KPI, biểu đồ theo ngày, lịch sử job và giao dịch credit.</p>
        </div>
        <div className="period-tabs">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              className={`tab ${period === p.value ? 'active' : ''}`}
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="muted">Đang tải…</p>}
      {error && <p className="error">{error}</p>}

      {stats && !loading && (
        <>
          <div className="kpi-grid">
            <div className="kpi-card panel">
              <span className="kpi-label">Số dư credit</span>
              <span className="kpi-value">{stats.kpis.balance}</span>
            </div>
            <div className="kpi-card panel">
              <span className="kpi-label">Ảnh đã tạo</span>
              <span className="kpi-value">{stats.kpis.images_success}</span>
              <span className="kpi-sub">thành công</span>
            </div>
            <div className="kpi-card panel">
              <span className="kpi-label">Video đã tạo</span>
              <span className="kpi-value">{stats.kpis.videos_success}</span>
              <span className="kpi-sub">thành công</span>
            </div>
            <div className="kpi-card panel">
              <span className="kpi-label">Chi phí tiêu thụ</span>
              <span className="kpi-value">{stats.kpis.credits_consumed_net}</span>
              <span className="kpi-sub">credit (net)</span>
            </div>
          </div>

          <div className="dashboard-meta panel">
            <span>Tổng job: <strong>{stats.totals.jobs_total}</strong></span>
            <span>Thành công: <strong className="ok">{stats.totals.jobs_success}</strong></span>
            <span>Thất bại: <strong className="fail">{stats.totals.jobs_failed}</strong></span>
            <span>Tỷ lệ OK: <strong>{stats.totals.success_rate}%</strong></span>
            <span>Đã charge: {stats.credits.charged}</span>
            <span>Đã hoàn: {stats.credits.refunded}</span>
            {(stats.credits.topped_up_total ?? 0) > 0 && (
              <span>Đã nạp: <strong className="ok">{stats.credits.topped_up_total}</strong> credit</span>
            )}
          </div>

          <div className="charts-grid">
            <section className="panel">
              <BarChart
                data={stats.charts.jobs_by_day}
                valueKey="jobs"
                label="Job theo ngày"
              />
            </section>
            <section className="panel">
              <BarChart
                data={stats.charts.jobs_by_day}
                valueKey="success"
                label="Job thành công / ngày"
                color="var(--ok)"
              />
            </section>
            <section className="panel">
              <BarChart
                data={stats.charts.credits_by_day}
                valueKey="net"
                label="Credit tiêu thụ (net) / ngày"
                color="#e8a838"
              />
            </section>
          </div>

          <div className="tables-grid">
            <section className="panel">
              <div className="panel-head">
                <h2>Job gần đây</h2>
                <Link to="/app" className="btn ghost sm">Tạo ảnh →</Link>
              </div>
              {stats.recent_jobs.length === 0 ? (
                <p className="muted">Chưa có job.</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Model</th>
                      <th>Loại</th>
                      <th>Trạng thái</th>
                      <th>Chi phí</th>
                      <th>Thời gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent_jobs.map((j) => (
                      <tr key={j.id}>
                        <td className="mono">{j.model_id}</td>
                        <td>{j.type}</td>
                        <td><span className={`badge ${j.status}`}>{j.status}</span></td>
                        <td>−{j.cost}</td>
                        <td>{formatDate(j.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="panel">
              <h2>Giao dịch credit</h2>
              {stats.recent_transactions.length === 0 ? (
                <p className="muted">Chưa có giao dịch.</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Loại</th>
                      <th>Số tiền</th>
                      <th>Mô tả</th>
                      <th>Thời gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent_transactions.map((t) => (
                      <tr key={t.id}>
                        <td>{TX_LABELS[t.type] || t.type}</td>
                        <td className={t.amount >= 0 ? 'amount-plus' : 'amount-minus'}>
                          {t.amount >= 0 ? '+' : ''}{t.amount}
                        </td>
                        <td className="muted-cell">{t.description || '—'}</td>
                        <td>{formatDate(t.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
