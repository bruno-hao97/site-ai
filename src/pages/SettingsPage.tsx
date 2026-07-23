import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { clearAuth, loadAuth } from '../services/authStore';
import { loadOpenaiKey, saveOpenaiKey } from '../services/openaiKeyStore';
import { loadTheme, saveTheme, type ThemeMode } from '../services/themeStore';
import { fetchOpsStatus, type OpsStatusData } from '../services/opsApi';
import {
  getBrowserPushStatus,
  requestPushPermission,
  resolvePushAppId,
  setupOneSignalFromAuth,
  type PushStatus,
} from '../services/oneSignal';

const OPS_KEY_SESSION = 'ops_status_key';

function pill(ok: boolean | null | undefined): string {
  if (ok === true) return 'ok';
  if (ok === false) return 'warn';
  return '';
}

export default function SettingsPage() {
  const auth = loadAuth();
  const domain = auth?.domain || '—';
  const [theme, setTheme] = useState<ThemeMode>(loadTheme());
  const [layoutWide, setLayoutWide] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);
  const [openaiKey, setOpenaiKey] = useState(loadOpenaiKey());
  const [openaiSaved, setOpenaiSaved] = useState(false);
  const [ops, setOps] = useState<OpsStatusData | null>(null);
  const [opsError, setOpsError] = useState('');
  const [opsLoading, setOpsLoading] = useState(false);
  const [opsKey, setOpsKey] = useState(() => sessionStorage.getItem(OPS_KEY_SESSION) || '');
  const [pushStatus, setPushStatus] = useState<PushStatus>(() => getBrowserPushStatus());
  const [pushBusy, setPushBusy] = useState(false);
  const [pushAppId, setPushAppId] = useState<string | null>(null);
  const [pushError, setPushError] = useState('');

  const loadOps = useCallback(async () => {
    setOpsLoading(true);
    setOpsError('');
    try {
      if (opsKey.trim()) sessionStorage.setItem(OPS_KEY_SESSION, opsKey.trim());
      else sessionStorage.removeItem(OPS_KEY_SESSION);
      const data = await fetchOpsStatus(opsKey.trim() || undefined);
      setOps(data);
    } catch (err) {
      setOps(null);
      setOpsError(err instanceof Error ? err.message : String(err));
    } finally {
      setOpsLoading(false);
    }
  }, [opsKey]);

  useEffect(() => {
    void loadOps();
    // Mount once; refresh via button
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const id = await resolvePushAppId();
      if (cancelled) return;
      setPushAppId(id);
      setPushStatus(getBrowserPushStatus());
      if (id) void setupOneSignalFromAuth();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleEnablePush() {
    setPushBusy(true);
    setPushError('');
    try {
      const id = pushAppId || (await resolvePushAppId());
      setPushAppId(id);
      if (!id) {
        setPushError('Không lấy được push_app_id từ Gommo.');
        return;
      }
      if (getBrowserPushStatus() === 'denied') {
        setPushError(
          'Trình duyệt đang chặn thông báo. Mở ổ khóa URL → Thông báo → Cho phép, rồi tải lại trang.',
        );
        setPushStatus('denied');
        return;
      }
      const next = await requestPushPermission();
      setPushStatus(next);
      if (next !== 'granted') {
        setPushError('Chưa được cấp quyền thông báo. Hãy chọn Allow/Cho phép khi trình duyệt hỏi.');
      }
    } catch (err) {
      setPushStatus(getBrowserPushStatus());
      setPushError(err instanceof Error ? err.message : String(err));
    } finally {
      setPushBusy(false);
    }
  }

  function handleLogout() {
    clearAuth();
    window.location.href = '/login';
  }

  function setThemeMode(mode: ThemeMode) {
    saveTheme(mode);
    setTheme(mode);
  }

  function saveOpenai(e: FormEvent) {
    e.preventDefault();
    saveOpenaiKey(openaiKey);
    setOpenaiSaved(true);
    setTimeout(() => setOpenaiSaved(false), 2000);
  }

  return (
    <div className="page settings-79">
      <div className="page-head">
        <h1>Cài đặt</h1>
        <p className="lead">
          Quản lý cài đặt tài khoản, bảo mật, API và các tính năng khác.
        </p>
      </div>

      <div className="settings-79-stack">
        <section className="panel settings-79-section">
          <h2>🌐 API &amp; WEBHOOK</h2>
          <div className="settings-79-row">
            <div>
              <div className="settings-79-row-title">Domain kết nối</div>
              <div className="settings-79-row-desc">Domain của bạn để nhận yêu cầu từ hệ thống.</div>
            </div>
            <span className="settings-79-domain">{domain}</span>
          </div>
          <div className="settings-79-row">
            <div>
              <div className="settings-79-row-title">API Access Token</div>
              <div className="settings-79-row-desc">
                Sử dụng token này để kết nối với các ứng dụng bên thứ 3.
              </div>
            </div>
            <Link to="/settings/tokens" className="btn secondary sm">
              Sao chép &amp; Tạo mới
            </Link>
          </div>
        </section>

        <section className="panel settings-79-section">
          <h2>🛠 Ops — Gommo / PayOS / Telegram</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            MCP Cursor (<code>79ai</code>) dùng trong IDE. Trang này kiểm tra runtime site (Railway).
          </p>
          <div className="settings-79-openai-row" style={{ marginBottom: '0.75rem' }}>
            <input
              value={opsKey}
              onChange={(e) => setOpsKey(e.target.value)}
              placeholder="x-ops-key (TELEGRAM_WEBHOOK_SECRET hoặc OPS_STATUS_KEY)"
              className="settings-79-openai-input"
              type="password"
              autoComplete="off"
            />
            <button type="button" className="btn primary sm" onClick={() => void loadOps()} disabled={opsLoading}>
              {opsLoading ? 'Đang tải…' : 'Làm mới'}
            </button>
          </div>
          {opsError && <p className="muted" style={{ color: 'var(--danger)' }}>{opsError}</p>}
          {ops && (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <div className="settings-79-row">
                <div>
                  <div className="settings-79-row-title">PayOS</div>
                  <div className="settings-79-row-desc">{ops.payos?.message || ops.payos?.webhookUrl || '—'}</div>
                </div>
                <span className={`status-pill ${pill(Boolean(ops.payos?.configured && ops.payos?.valid !== false))}`}>
                  {ops.payos?.configured ? (ops.payos.valid === false ? 'Key lỗi' : 'OK') : 'Chưa cấu hình'}
                </span>
              </div>
              <div className="settings-79-row">
                <div>
                  <div className="settings-79-row-title">Merchant Gommo</div>
                  <div className="settings-79-row-desc">
                    Domain {ops.merchant?.domain || '—'}
                    {ops.detail && ops.merchant?.available != null
                      ? ` · khả dụng ${ops.merchant.available.toLocaleString('vi-VN')} credit`
                      : ''}
                    {ops.merchant?.error ? ` · ${ops.merchant.error}` : ''}
                  </div>
                </div>
                <span className={`status-pill ${pill(Boolean(ops.merchant?.configured && !ops.merchant?.error))}`}>
                  {ops.merchant?.configured ? 'OK' : 'Chưa cấu hình'}
                </span>
              </div>
              <div className="settings-79-row">
                <div>
                  <div className="settings-79-row-title">Telegram bot (site)</div>
                  <div className="settings-79-row-desc">
                    Chat admin: {ops.telegram?.notifyChatIdsConfigured ?? 0}
                    {ops.telegram?.webhookError ? ` · ${ops.telegram.webhookError}` : ''}
                  </div>
                </div>
                <span className={`status-pill ${pill(ops.telegram?.configured)}`}>
                  {ops.telegram?.configured ? 'Token OK' : 'Chưa cấu hình'}
                </span>
              </div>
              {!ops.detail && ops.hint && (
                <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>{ops.hint}</p>
              )}
              {ops.mcp?.note && (
                <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>{ops.mcp.note}</p>
              )}
            </div>
          )}
        </section>

        <section className="panel settings-79-section">
          <h2>
            ✨ API Key OpenAI
            <span className="settings-79-tag">Dùng API riêng</span>
          </h2>
          <form onSubmit={saveOpenai} className="settings-79-openai-row">
            <input
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
              className="settings-79-openai-input"
            />
            <button type="submit" className="btn primary sm">Lưu</button>
          </form>
          <p className="settings-79-openai-foot muted">
            {openaiSaved ? 'Đã lưu key.' : openaiKey ? 'Key đã cấu hình (ẩn khi reload).' : 'Chưa có key nào được thêm vào hệ thống'}
          </p>
        </section>

        <section className="panel settings-79-section">
          <h2>🎨 Giao diện</h2>
          <div className="settings-79-row">
            <div>
              <div className="settings-79-row-title">Chế độ giao diện</div>
            </div>
            <div className="settings-79-segment">
              <button
                type="button"
                className={theme === 'light' ? 'active' : ''}
                onClick={() => setThemeMode('light')}
              >
                Sáng
              </button>
              <button
                type="button"
                className={theme === 'dark' ? 'active' : ''}
                onClick={() => setThemeMode('dark')}
              >
                Tối
              </button>
            </div>
          </div>
          <div className="settings-79-row">
            <div>
              <div className="settings-79-row-title">Bố cục</div>
              <div className="settings-79-row-desc">Thay đổi bố cục hiển thị của trang web.</div>
            </div>
            <label className="settings-79-toggle">
              <input
                type="checkbox"
                checked={layoutWide}
                onChange={(e) => setLayoutWide(e.target.checked)}
              />
              <span />
            </label>
          </div>
        </section>

        <section className="panel settings-79-section">
          <h2>🔔 Thông báo</h2>
          <div className="settings-79-row">
            <div>
              <div className="settings-79-row-title">Thông báo đẩy</div>
              <div className="settings-79-row-desc">
                {pushStatus === 'granted'
                  ? 'Đã bật — thiết bị này sẽ nhận thông báo đẩy.'
                  : pushStatus === 'denied'
                    ? 'Bị chặn bởi trình duyệt — bấm nút để xem cách mở lại quyền.'
                    : pushStatus === 'unsupported'
                      ? 'Trình duyệt không hỗ trợ thông báo đẩy.'
                      : 'Nhận thông báo về các cập nhật, tin nhắn mới và các hoạt động khác.'}
                {pushError ? (
                  <div style={{ color: 'var(--danger)', marginTop: 6 }}>{pushError}</div>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              className="btn settings-79-gradient-btn"
              onClick={() => void handleEnablePush()}
              disabled={pushBusy || pushStatus === 'unsupported' || pushStatus === 'granted'}
            >
              {pushBusy ? 'Đang bật…' : pushStatus === 'granted' ? 'Đã bật' : 'Bật thông báo'}
            </button>
          </div>
          <div className="settings-79-row">
            <div>
              <div className="settings-79-row-title">Thông báo Email</div>
              <div className="settings-79-row-desc">Nhận thông báo qua email cá nhân của bạn.</div>
            </div>
            <label className="settings-79-toggle">
              <input
                type="checkbox"
                checked={emailNotif}
                onChange={(e) => setEmailNotif(e.target.checked)}
              />
              <span />
            </label>
          </div>
        </section>

        <section className="panel settings-79-section">
          <h2>🛡 Bảo mật</h2>
          <div className="settings-79-row">
            <div>
              <div className="settings-79-row-title">Phiên hoạt động</div>
              <div className="settings-79-row-desc">Quản lý các thiết bị đang đăng nhập vào tài khoản.</div>
            </div>
            <button type="button" className="btn ghost sm" onClick={handleLogout}>
              Đăng xuất hết
            </button>
          </div>
          <div className="settings-79-row">
            <div>
              <div className="settings-79-row-title">Đổi mật khẩu</div>
              <div className="settings-79-row-desc">Thay đổi mật khẩu đăng nhập của bạn.</div>
            </div>
            <Link to="/account" className="btn ghost sm">Đổi mật khẩu</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
