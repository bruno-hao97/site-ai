import { Download, MoreHorizontal, Music2, Trash2 } from 'lucide-react';

export interface MusicTrackItem {
  id: string;
  title: string;
  modelLabel?: string;
  createdAt?: string;
  resultUrl?: string;
  coverUrl?: string;
  status?: 'processing' | 'failed' | 'success';
  progress?: number;
}

function formatTime(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '';
  }
}

function trackMeta(item: MusicTrackItem): string {
  if (item.status === 'processing') {
    const pct = item.progress != null ? ` ${item.progress}%` : '';
    return `Đang tạo…${pct}`;
  }
  if (item.status === 'failed') return 'Thất bại';
  const parts = [item.modelLabel, formatTime(item.createdAt)].filter(Boolean);
  return parts.join(' - ');
}

export default function MusicTrackList({
  items,
  emptyText,
  selectedIds,
  onToggleSelect,
  onReuse,
  onDelete,
  onOpen,
}: {
  items: MusicTrackItem[];
  emptyText?: string;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onReuse?: (id: string) => void;
  onDelete?: (id: string) => void;
  onOpen?: (url: string) => void;
}) {
  if (items.length === 0) {
    return <p className="muted music-track-empty">{emptyText || 'Chưa có bản nhạc.'}</p>;
  }

  return (
    <ul className="music-track-list">
      {items.map((item) => {
        const selected = selectedIds?.has(item.id) ?? false;
        const processing = item.status === 'processing';
        const failed = item.status === 'failed';

        return (
          <li
            key={item.id}
            className={`music-track-row${selected ? ' selected' : ''}${processing ? ' processing' : ''}${failed ? ' failed' : ''}`}
          >
            {onToggleSelect && !processing && (
              <label className="music-track-check">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => onToggleSelect(item.id)}
                />
              </label>
            )}

            <div className="music-track-thumb" aria-hidden>
              {processing ? (
                <span className="music-track-spinner" />
              ) : item.coverUrl ? (
                <img className="music-track-cover" src={item.coverUrl} alt="" loading="lazy" />
              ) : (
                <Music2 size={24} strokeWidth={1.75} />
              )}
            </div>

            <div className="music-track-body">
              <p className="music-track-title" title={item.title}>
                {item.title || 'Không tên'}
              </p>
              <p className="music-track-meta">{trackMeta(item)}</p>
              {processing && (
                <div
                  className="music-track-bar"
                  role="progressbar"
                  aria-valuenow={item.progress ?? 12}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div style={{ width: `${item.progress ?? 12}%` }} />
                </div>
              )}
            </div>

            <div className="music-track-actions">
              {item.resultUrl && (
                <>
                  <audio
                    className="music-track-audio"
                    src={item.resultUrl}
                    controls
                    preload="none"
                  />
                  <a
                    className="music-track-icon-btn"
                    href={item.resultUrl}
                    download
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Tải xuống"
                    title="Tải xuống"
                  >
                    <Download size={15} />
                  </a>
                  <button
                    type="button"
                    className="music-track-icon-btn"
                    aria-label="Mở tab mới"
                    title="Mở tab mới"
                    onClick={() => onOpen?.(item.resultUrl!)}
                  >
                    <MoreHorizontal size={15} />
                  </button>
                </>
              )}
              {onReuse && !processing && (
                <button
                  type="button"
                  className="music-track-text-btn"
                  onClick={() => onReuse(item.id)}
                >
                  Dùng lại
                </button>
              )}
              {onDelete && !processing && (
                <button
                  type="button"
                  className="music-track-icon-btn danger"
                  aria-label="Xóa"
                  title="Xóa"
                  onClick={() => onDelete(item.id)}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
