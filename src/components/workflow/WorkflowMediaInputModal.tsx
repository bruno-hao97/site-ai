import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Loader2, Search, Trash2, Upload, Video, X } from 'lucide-react';
import { getGommoClient, loadAuth } from '../../services/authStore';
import {
  feedMediaUrl,
  feedModelLabel,
  feedThumb,
  fetchMyImages,
  fetchMyVideos,
  type FeedItem,
} from '../../services/feedApi';
import {
  MEDIA_INPUT_PORTS,
  type MediaInputDraft,
  type MediaInputKind,
  type MediaSourceTab,
} from '../../services/workflowMediaInput';

function tsToDate(value: string | number | undefined): Date | null {
  if (value == null) return null;
  let ts = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(ts) || ts <= 0) return null;
  if (ts < 1e12) ts *= 1000;
  return new Date(ts);
}

function dayLabel(d: Date): string {
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

interface Props {
  open: boolean;
  kind: MediaInputKind;
  draft: MediaInputDraft;
  isNew: boolean;
  onSave: (draft: MediaInputDraft) => void;
  onDelete: () => void;
  onClose: () => void;
}

const IMAGE_TABS: { id: MediaSourceTab; label: string }[] = [
  { id: 'upload', label: 'Tải lên' },
  { id: 'library', label: 'Thư viện' },
  { id: 'extra', label: 'Extra' },
  { id: 'url', label: 'URL' },
];

const VIDEO_TABS: { id: MediaSourceTab; label: string }[] = [
  { id: 'upload', label: 'Chọn file' },
  { id: 'library', label: 'Thư viện' },
  { id: 'url', label: 'URL' },
];

export default function WorkflowMediaInputModal({
  open,
  kind,
  draft: initialDraft,
  isNew,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const [draft, setDraft] = useState<MediaInputDraft>(initialDraft);
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const [libraryItems, setLibraryItems] = useState<FeedItem[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState('');
  const [libraryQuery, setLibraryQuery] = useState('');
  const [libraryAfterId, setLibraryAfterId] = useState('');
  const [libraryHasMore, setLibraryHasMore] = useState(true);
  const libraryLoadingRef = useRef(false);

  useEffect(() => {
    if (open) {
      setDraft(initialDraft);
      setUrlInput('');
      setError('');
      setLibraryQuery('');
    }
  }, [open, initialDraft]);

  const loadLibrary = useCallback(
    async (after: string, reset: boolean) => {
      if (!loadAuth()?.access_token) {
        setLibraryError('Cần đăng nhập để xem thư viện.');
        setLibraryItems([]);
        setLibraryHasMore(false);
        return;
      }
      if (libraryLoadingRef.current) return;
      libraryLoadingRef.current = true;
      setLibraryLoading(true);
      if (reset) setLibraryError('');
      try {
        const fetcher = kind === 'image' ? fetchMyImages : fetchMyVideos;
        const page = await fetcher({ limit: 30, afterId: after });
        setLibraryItems((prev) => (reset ? page.items : [...prev, ...page.items]));
        setLibraryAfterId(page.nextAfterId);
        setLibraryHasMore(Boolean(page.nextAfterId) && page.items.length > 0);
      } catch (err) {
        setLibraryError(err instanceof Error ? err.message : String(err));
        if (reset) {
          setLibraryItems([]);
          setLibraryHasMore(false);
        }
      } finally {
        libraryLoadingRef.current = false;
        setLibraryLoading(false);
      }
    },
    [kind],
  );

  useEffect(() => {
    if (!open || draft.sourceTab !== 'library') return;
    setLibraryItems([]);
    setLibraryAfterId('');
    setLibraryHasMore(true);
    void loadLibrary('', true);
  }, [open, draft.sourceTab, kind, loadLibrary]);

  if (!open) return null;

  const tabs = kind === 'image' ? IMAGE_TABS : VIDEO_TABS;
  const ports = MEDIA_INPUT_PORTS[kind];
  const title = kind === 'image' ? 'Nhập ảnh' : 'Nhập Video';
  const desc =
    kind === 'image'
      ? 'Chỉ ảnh (URL, tải lên). Cổng "Gộp ảnh" để nối nhiều nguồn ảnh vào cùng danh sách.'
      : 'Video (tải lên/album/URL). Cổng "Gộp video" để nối nhiều luồng video vào cùng danh sách.';

  const accept = kind === 'image' ? 'image/*' : 'video/*';

  const filteredLibrary = libraryItems.filter((item) => {
    const url = feedMediaUrl(item);
    if (!url) return false;
    const q = libraryQuery.trim().toLowerCase();
    if (!q) return true;
    return [item.prompt, feedModelLabel(item), item.id_base]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  const libraryGroups = (() => {
    const map = new Map<string, FeedItem[]>();
    for (const item of filteredLibrary) {
      const d = tsToDate(item.created_time);
      const label = d ? dayLabel(d) : 'Khác';
      const list = map.get(label) ?? [];
      list.push(item);
      map.set(label, list);
    }
    return [...map.entries()];
  })();

  const addUrl = (url: string, label?: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setDraft((d) => {
      if (d.mediaUrls.includes(trimmed)) return d;
      return {
        ...d,
        mediaUrls: [...d.mediaUrls, trimmed],
        fileNames: [...d.fileNames, label || trimmed],
      };
    });
    setUrlInput('');
  };

  const addLibraryItem = (item: FeedItem) => {
    const url = feedMediaUrl(item);
    if (!url) return;
    const label = item.prompt?.trim() || feedModelLabel(item) || item.id_base || url;
    addUrl(url, label);
  };

  const removeUrl = (index: number) => {
    setDraft((d) => ({
      ...d,
      mediaUrls: d.mediaUrls.filter((_, i) => i !== index),
      fileNames: d.fileNames.filter((_, i) => i !== index),
    }));
  };

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    const valid =
      kind === 'image'
        ? file.type.startsWith('image/')
        : file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
    if (!valid) {
      setError(kind === 'image' ? 'Chỉ chấp nhận file ảnh' : 'Chỉ chấp nhận file video');
      return;
    }
    if (!loadAuth()?.access_token) {
      setError('Cần đăng nhập để upload');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const client = getGommoClient();
      const { url } =
        kind === 'image' ? await client.uploadImage(file) : await client.uploadVideo(file);
      setDraft((d) => ({
        ...d,
        mediaUrls: [...d.mediaUrls, url],
        fileNames: [...d.fileNames, file.name],
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDone = () => {
    if (draft.required && draft.mediaUrls.length === 0) {
      setError('Node bắt buộc — cần ít nhất một ảnh/video');
      return;
    }
    onSave(draft);
  };

  return (
    <div className="wf-media-modal-overlay" onClick={onClose}>
      <div className="wf-media-modal" onClick={(e) => e.stopPropagation()}>
        <header className="wf-media-modal-head">
          <div className="wf-media-modal-title">
            {kind === 'image' ? <Image size={18} /> : <Video size={18} />}
            <h3>{title}</h3>
          </div>
          <button type="button" className="wf-media-modal-x" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </header>

        <p className="wf-media-modal-desc">{desc}</p>

        <div className="wf-media-modal-tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={draft.sourceTab === t.id ? 'active' : ''}
              onClick={() => setDraft((d) => ({ ...d, sourceTab: t.id }))}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="wf-media-modal-body">
          {draft.sourceTab === 'upload' && (
            <div
              className="wf-media-modal-upload"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void handleUpload(e.dataTransfer.files[0]);
              }}
            >
              <Upload size={22} />
              <p>Kéo thả hoặc chọn file</p>
              <button
                type="button"
                className="wf-media-modal-upload-btn"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? 'Đang tải…' : tabs[0].label}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept={accept}
                multiple
                className="sr-only"
                onChange={(e) => void handleUpload(e.target.files?.[0])}
              />
            </div>
          )}

          {draft.sourceTab === 'library' && (
            <div className="wf-media-modal-library">
              <div className="wf-media-modal-library-search">
                <Search size={14} />
                <input
                  type="text"
                  value={libraryQuery}
                  onChange={(e) => setLibraryQuery(e.target.value)}
                  placeholder="Tìm kiếm theo prompt…"
                />
              </div>

              {libraryError && <p className="wf-media-modal-error">{libraryError}</p>}

              {libraryLoading && libraryItems.length === 0 ? (
                <p className="wf-media-modal-empty">
                  <Loader2 size={16} className="wf-spin" /> Đang tải thư viện…
                </p>
              ) : filteredLibrary.length === 0 ? (
                <p className="wf-media-modal-empty">
                  {libraryQuery.trim()
                    ? 'Không tìm thấy kết quả.'
                    : `Chưa có ${kind === 'image' ? 'ảnh' : 'video'} trong thư viện.`}
                </p>
              ) : (
                <div className="wf-media-modal-library-scroll">
                  {libraryGroups.map(([date, items]) => (
                    <div key={date} className="wf-media-modal-library-day">
                      <span className="wf-media-modal-library-date">{date}</span>
                      <div className="wf-media-modal-library-grid">
                        {items.map((item) => {
                          const url = feedMediaUrl(item)!;
                          const thumb = feedThumb(item) || url;
                          const selected = draft.mediaUrls.includes(url);
                          return (
                            <button
                              key={item.id_base}
                              type="button"
                              className={`wf-media-lib-item${selected ? ' selected' : ''}`}
                              onClick={() => addLibraryItem(item)}
                              title={item.prompt || feedModelLabel(item) || url}
                            >
                              {kind === 'image' ? (
                                <img src={thumb} alt="" />
                              ) : (
                                <video src={thumb} muted preload="metadata" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {libraryHasMore && filteredLibrary.length > 0 && (
                <button
                  type="button"
                  className="wf-media-modal-library-more"
                  disabled={libraryLoading}
                  onClick={() => void loadLibrary(libraryAfterId, false)}
                >
                  {libraryLoading ? (
                    <>
                      <Loader2 size={14} className="wf-spin" /> Đang tải…
                    </>
                  ) : (
                    'Tải thêm'
                  )}
                </button>
              )}

              <p className="wf-media-modal-library-hint">
                Click vào {kind === 'image' ? 'ảnh' : 'video'} để chọn
              </p>
            </div>
          )}

          {draft.sourceTab === 'extra' && kind === 'image' && (
            <div className="wf-media-modal-extra">
              <p className="wf-media-modal-empty">
                Thêm URL ảnh bổ sung (CDN, link ngoài) qua tab URL hoặc tải lên trực tiếp.
              </p>
            </div>
          )}

          {draft.sourceTab === 'url' && (
            <div className="wf-media-modal-url">
              <input
                type="url"
                value={urlInput}
                placeholder={kind === 'image' ? 'https://…/image.png' : 'https://…/video.mp4'}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addUrl(urlInput);
                  }
                }}
              />
              <button type="button" onClick={() => addUrl(urlInput)}>
                Thêm
              </button>
            </div>
          )}

          {draft.mediaUrls.length > 0 && (
            <ul className="wf-media-modal-list">
              {draft.mediaUrls.map((url, i) => (
                <li key={`${url}-${i}`}>
                  <span title={url}>{draft.fileNames[i] || url}</span>
                  <button type="button" onClick={() => removeUrl(i)}>
                    Xóa
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error && <p className="wf-media-modal-error">{error}</p>}
        </div>

        <section className="wf-media-modal-settings">
          <h4>SETTINGS</h4>
          <label className="wf-media-toggle">
            <input
              type="checkbox"
              checked={draft.randomOutput}
              onChange={(e) => setDraft((d) => ({ ...d, randomOutput: e.target.checked }))}
            />
            <span>
              <strong>Random Output</strong>
              <small>
                {kind === 'image'
                  ? 'Mỗi lần chạy sẽ random chọn ảnh trong khoảng đã chọn.'
                  : 'Mỗi lần chạy sẽ random chọn video trong khoảng đã chọn.'}
              </small>
            </span>
          </label>
          <label className="wf-media-toggle">
            <input
              type="checkbox"
              checked={draft.useOnce}
              onChange={(e) => setDraft((d) => ({ ...d, useOnce: e.target.checked }))}
            />
            <span>
              <strong>Chỉ dùng 1 lần</strong>
              <small>
                {kind === 'image'
                  ? 'Mỗi ảnh chỉ được dùng 1 lần, sau khi dùng sẽ bị khóa.'
                  : 'Mỗi video chỉ được dùng 1 lần, sau khi dùng sẽ bị khóa.'}
              </small>
            </span>
          </label>
        </section>

        <section className="wf-media-modal-ports">
          <h4>CỔNG KẾT NỐI</h4>
          <div className="wf-media-modal-ports-grid">
            <div>
              <span className="wf-media-ports-label">Đầu vào</span>
              {ports.in.map((p) => (
                <div key={p.id} className="wf-media-port-row">
                  <span className="wf-media-port-dot" style={{ background: p.color }} />
                  {p.label}
                  <code>{p.id}</code>
                </div>
              ))}
            </div>
            <div>
              <span className="wf-media-ports-label">Đầu ra</span>
              {ports.out.map((p) => (
                <div key={p.id} className="wf-media-port-row">
                  <span className="wf-media-port-dot" style={{ background: p.color }} />
                  {p.label}
                  <code>{p.id}</code>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="wf-media-modal-foot">
          {!isNew && (
            <button type="button" className="wf-media-modal-delete" onClick={onDelete}>
              <Trash2 size={14} />
              Xóa Node
            </button>
          )}
          <label className="wf-media-modal-required">
            <input
              type="checkbox"
              checked={draft.required}
              onChange={(e) => setDraft((d) => ({ ...d, required: e.target.checked }))}
            />
            Bắt buộc
          </label>
          <button type="button" className="wf-media-modal-done" onClick={handleDone}>
            Xong
          </button>
        </footer>
      </div>
    </div>
  );
}
