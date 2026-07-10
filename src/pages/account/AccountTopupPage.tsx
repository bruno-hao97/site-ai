import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Coins, Loader2, QrCode, User } from 'lucide-react';
import QRCode from 'qrcode';
import { getDisplayUser, notifyCreditsUpdated, refreshSession } from '../../services/authStore';
import {
  createTopupRequest,
  fetchTopupOrder,
  TOPUP_PRESETS_VND,
  type TopupPaymentResult,
} from '../../services/topupApi';

function isImageQrSource(value: string): boolean {
  const trimmed = value.trim();
  return /^(https?:\/\/|data:image\/)/i.test(trimmed);
}

function isEmvQrPayload(value: string): boolean {
  return /^000201/i.test(value.trim());
}

async function copyText(text: string): Promise<void> {
  if (!text) return;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export default function AccountTopupPage() {
  const user = getDisplayUser();
  const username = user.username || '';

  const [amountVnd, setAmountVnd] = useState(String(TOPUP_PRESETS_VND[0]));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [payment, setPayment] = useState<TopupPaymentResult | null>(null);
  const [orderStatus, setOrderStatus] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');

  const qrPayload = useMemo(() => (payment?.qrImage || '').trim(), [payment]);

  useEffect(() => {
    let cancelled = false;
    if (!qrPayload || isImageQrSource(qrPayload)) {
      setQrDataUrl('');
      return;
    }
    if (isEmvQrPayload(qrPayload)) {
      void QRCode.toDataURL(qrPayload, { margin: 1, width: 220 }).then((url) => {
        if (!cancelled) setQrDataUrl(url);
      });
      return;
    }
    setQrDataUrl('');
    return () => {
      cancelled = true;
    };
  }, [qrPayload]);

  const pollOrder = useCallback(async (orderCode: number) => {
    try {
      const order = await fetchTopupOrder(orderCode);
      setOrderStatus(order.status);
      if (order.status === 'credited') {
        await refreshSession();
        notifyCreditsUpdated();
        return true;
      }
      if (order.status === 'failed') {
        setError(order.error || 'Nạp credit thất bại');
        return true;
      }
    } catch {
      /* retry */
    }
    return false;
  }, []);

  useEffect(() => {
    if (!payment?.orderCode) return;
    let stopped = false;
    const tick = async () => {
      if (stopped) return;
      const done = await pollOrder(payment.orderCode);
      if (!done && !stopped) {
        window.setTimeout(tick, 3000);
      }
    };
    void tick();
    return () => {
      stopped = true;
    };
  }, [payment?.orderCode, pollOrder]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username) {
      setError('Tài khoản chưa có username — không thể nạp tự động.');
      return;
    }
    setLoading(true);
    setError('');
    setPayment(null);
    setOrderStatus('');
    try {
      const result = await createTopupRequest(username, Number(amountVnd));
      setPayment(result);
      setOrderStatus('pending');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const bank = payment?.bankTransfer;
  const credited = orderStatus === 'credited';

  return (
    <div className="account-settings">
      <h1 className="account-content-title">💳 NẠP CREDIT</h1>

      <div className="account-topup-grid">
        <section className="panel account-card">
          <p className="muted account-topup-lead">
            Quét QR hoặc chuyển khoản PayOS — hệ thống tự cộng credit cho{' '}
            <strong>@{username || '—'}</strong> sau khi thanh toán thành công.
          </p>

          {!payment ? (
            <form className="form account-form" onSubmit={handleSubmit}>
              <label className="field">
                <span className="label">
                  <User size={14} aria-hidden />
                  USERNAME NHẬN CREDIT
                </span>
                <input value={username} readOnly placeholder="Đăng nhập để lấy username" />
              </label>

              <label className="field">
                <span className="label">
                  <Coins size={14} aria-hidden />
                  SỐ TIỀN (VND)
                </span>
                <input
                  type="number"
                  min={10000}
                  step={1000}
                  value={amountVnd}
                  onChange={(e) => setAmountVnd(e.target.value)}
                  disabled={loading}
                />
                <div className="account-topup-presets">
                  {TOPUP_PRESETS_VND.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={`btn ghost sm${Number(amountVnd) === preset ? ' active' : ''}`}
                      onClick={() => setAmountVnd(String(preset))}
                      disabled={loading}
                    >
                      {preset.toLocaleString('vi-VN')}
                    </button>
                  ))}
                </div>
              </label>

              {error ? <p className="account-transfer-feedback error">{error}</p> : null}

              <button type="submit" className="btn account-transfer-submit" disabled={loading || !username}>
                {loading ? (
                  <>
                    <Loader2 size={16} className="spin" aria-hidden />
                    Đang tạo mã…
                  </>
                ) : (
                  'TẠO MÃ THANH TOÁN'
                )}
              </button>
            </form>
          ) : (
            <div className="account-topup-payment">
              {credited ? (
                <p className="account-transfer-feedback success">
                  Đã cộng {payment.credits.toLocaleString('vi-VN')} credit vào @{payment.username}.
                </p>
              ) : (
                <p className="account-topup-status">
                  Trạng thái: <strong>{orderStatus || 'pending'}</strong> — đang chờ PayOS xác nhận…
                </p>
              )}

              <div className="account-topup-qr-wrap">
                {isImageQrSource(qrPayload) ? (
                  <img src={qrPayload} alt="QR PayOS" className="account-topup-qr" />
                ) : qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR PayOS" className="account-topup-qr" />
                ) : (
                  <div className="account-topup-qr-fallback">
                    <QrCode size={48} aria-hidden />
                  </div>
                )}
              </div>

              {bank ? (
                <dl className="account-topup-bank">
                  <div>
                    <dt>Ngân hàng</dt>
                    <dd>{bank.bankName || '—'}</dd>
                  </div>
                  <div>
                    <dt>Chủ TK</dt>
                    <dd>{bank.accountName || '—'}</dd>
                  </div>
                  <div>
                    <dt>Số TK</dt>
                    <dd>
                      {bank.accountNumber || '—'}{' '}
                      {bank.accountNumber ? (
                        <button type="button" className="btn ghost sm" onClick={() => void copyText(bank.accountNumber)}>
                          Copy
                        </button>
                      ) : null}
                    </dd>
                  </div>
                  <div>
                    <dt>Số tiền</dt>
                    <dd>{bank.amountFormatted}</dd>
                  </div>
                  <div>
                    <dt>Nội dung CK</dt>
                    <dd>
                      {bank.content || '—'}{' '}
                      {bank.content ? (
                        <button type="button" className="btn ghost sm" onClick={() => void copyText(bank.content)}>
                          Copy
                        </button>
                      ) : null}
                    </dd>
                  </div>
                </dl>
              ) : null}

              {error ? <p className="account-transfer-feedback error">{error}</p> : null}

              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  setPayment(null);
                  setOrderStatus('');
                  setError('');
                }}
              >
                Tạo đơn mới
              </button>
            </div>
          )}
        </section>

        <aside className="account-transfer-warnings panel">
          <h2>ℹ HƯỚNG DẪN</h2>
          <ul>
            <li>Credit cộng tự động qua webhook PayOS (server Railway).</li>
            <li>Username lấy từ tài khoản đang đăng nhập — không đổi tay.</li>
            <li>1 VND = 1 credit (có thể đổi trên server).</li>
            <li>Sau khi chuyển, đợi vài giây đến 2 phút để số dư cập nhật.</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
