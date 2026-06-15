import { FormEvent, useCallback, useEffect, useState } from 'react';
import { createApiKey, deleteApiKey, listApiKeys, type ApiKeyItem } from '../services/backendApi';

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [name, setName] = useState('');
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setKeys(await listApiKeys());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError('');
    setRawKey(null);
    try {
      const { raw_key } = await createApiKey(name);
      setRawKey(raw_key);
      setName('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Xóa API key này?')) return;
    try {
      await deleteApiKey(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <p className="kicker">Developer</p>
        <h1>API Keys</h1>
        <p className="lead">
          Tạo key để gọi API programmatically. Key chỉ hiển thị <strong>một lần</strong> khi tạo.
        </p>
      </div>

      <section className="panel" style={{ marginBottom: '1rem' }}>
        <h2>Tạo key mới</h2>
        <form onSubmit={handleCreate} className="form" style={{ maxWidth: 400 }}>
          <label className="field">
            <span className="label">Tên (vd. Production, Test)</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <button type="submit" className="btn primary">Tạo API key</button>
        </form>

        {rawKey && (
          <div className="raw-key-box">
            <p className="label">Copy ngay — sẽ không hiện lại:</p>
            <code className="raw-key">{rawKey}</code>
          </div>
        )}
      </section>

      {error && <p className="error">{error}</p>}

      <section className="panel">
        <h2>Keys của bạn</h2>
        {loading ? (
          <p className="muted">Đang tải…</p>
        ) : keys.length === 0 ? (
          <p className="muted">Chưa có API key.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Tên</th>
                <th>Prefix</th>
                <th>Tạo</th>
                <th>Dùng lần cuối</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id}>
                  <td>{k.name}</td>
                  <td className="mono">{k.key_prefix}</td>
                  <td>{new Date(k.created_at).toLocaleString('vi-VN')}</td>
                  <td>{k.last_used_at ? new Date(k.last_used_at).toLocaleString('vi-VN') : '—'}</td>
                  <td>
                    <button type="button" className="btn ghost sm" onClick={() => handleDelete(k.id)}>
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
