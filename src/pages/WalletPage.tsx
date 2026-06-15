import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  confirmMockTopup,
  createTopupOrder,
  fetchTopupPackages,
  listTopupOrders,
  listTransactions,
  type CreditPackage,
  type CreditTransaction,
  type TopupOrder,
} from '../services/backendApi';
import { getCreditsAi } from '../services/authStore';

const TX_LABELS: Record<string, string> = {
  signup_bonus: 'Bonus đăng ký',
  job_charge: 'Trừ job',
  job_refund: 'Hoàn credit',
  topup: 'Nạp tiền',
  promotion: 'Khuyến mãi',
};

function formatVnd(n: number) {
  return new Intl.NumberFormat('vi-VN').format(n) + ' ₫';
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export default function WalletPage() {
  const [balance, setBalance] = useState(getCreditsAi());
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [mockEnabled, setMockEnabled] = useState(true);
  const [bonusPercent, setBonusPercent] = useState(0);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [orders, setOrders] = useState<TopupOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const syncBalance = (b: number) => {
    setBalance(b);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [pkgData, txData, orderData] = await Promise.all([
        fetchTopupPackages(),
        listTransactions(),
        listTopupOrders(),
      ]);
      setPackages(pkgData.packages);
      setMockEnabled(pkgData.mockEnabled);
      setBonusPercent(pkgData.firstTopupBonusPercent);
      setTransactions(txData.transactions);
      syncBalance(txData.balance);
      setOrders(orderData.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleTopup(pkg: CreditPackage) {
    setPayingId(pkg.id);
    setError('');
    setNotice('');
    try {
      const { order, mockEnabled: mock } = await createTopupOrder(pkg.id);
      if (!mock) {
        setNotice(`Đơn ${order.id.slice(0, 8)}… đã tạo — chờ tích hợp cổng thanh toán.`);
        await load();
        return;
      }
      const result = await confirmMockTopup(order.id);
      syncBalance(result.balance);
      setNotice(`Nạp thành công +${result.credits_added} credit!`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPayingId(null);
    }
  }

  return (
    <div className="page wallet-page">
      <div className="page-head">
        <p className="kicker">Ví credit</p>
        <h1>Nạp tiền</h1>
        <p className="lead">
          Số dư: <strong>{balance} credit</strong>
          {bonusPercent > 0 && (
            <> · Lần nạp đầu: <strong>+{bonusPercent}%</strong> bonus</>
          )}
        </p>
      </div>

      {mockEnabled && (
        <div className="banner warn">
          Chế độ <strong>mock payment</strong> (dev) — bấm nạp sẽ cộng credit ngay, không trừ tiền thật.
          Production: tắt <code>ALLOW_MOCK_TOPUP=false</code> và gắn VNPay/Momo.
        </div>
      )}

      {loading && <p className="muted">Đang tải…</p>}
      {error && <p className="error">{error}</p>}
      {notice && <p className="notice">{notice}</p>}

      <section className="packages-grid">
        {packages.map((pkg) => (
          <div key={pkg.id} className={`package-card panel ${pkg.popular ? 'popular' : ''}`}>
            {pkg.popular && <span className="package-badge">Phổ biến</span>}
            <h3>{pkg.name}</h3>
            <p className="package-credits">{pkg.credits} credit</p>
            <p className="package-price">{formatVnd(pkg.priceVnd)}</p>
            {pkg.bonusHint && <p className="package-hint">{pkg.bonusHint}</p>}
            <button
              type="button"
              className="btn primary"
              disabled={payingId != null}
              onClick={() => handleTopup(pkg)}
            >
              {payingId === pkg.id ? 'Đang xử lý…' : mockEnabled ? 'Nạp (mock)' : 'Tạo đơn nạp'}
            </button>
          </div>
        ))}
      </section>

      <div className="tables-grid wallet-tables">
        <section className="panel">
          <div className="panel-head">
            <h2>Lịch sử giao dịch</h2>
            <Link to="/dashboard" className="btn ghost sm">Dashboard →</Link>
          </div>
          {transactions.length === 0 ? (
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
                {transactions.map((t) => (
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

        <section className="panel">
          <h2>Đơn nạp</h2>
          {orders.length === 0 ? (
            <p className="muted">Chưa có đơn nạp.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Gói</th>
                  <th>Credit</th>
                  <th>Giá</th>
                  <th>Trạng thái</th>
                  <th>Ngày</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.package_id}</td>
                    <td>
                      {o.total_credits}
                      {o.bonus_credits > 0 && (
                        <span className="bonus-tag"> (+{o.bonus_credits} bonus)</span>
                      )}
                    </td>
                    <td>{formatVnd(o.amount_vnd)}</td>
                    <td><span className={`badge ${o.status}`}>{o.status}</span></td>
                    <td>{formatDate(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
