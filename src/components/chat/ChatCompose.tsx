import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, Loader2, Paperclip, Plus, Square, X } from 'lucide-react';
import { CHAT_ACTION_PILLS, MINI_APP_PROMPT_KEY } from '../../services/chatPageData';
import type { ChatActionPill } from '../../services/chatPageData';

export interface ChatAttachmentPreview {
  url: string;
  name: string;
  file?: File;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  attachment: ChatAttachmentPreview | null;
  onPickFile: (file: File | null) => void;
  onRemoveAttachment: () => void;
  onSend: () => void;
  onStop?: () => void;
  onActionPill?: (pill: ChatActionPill) => void;
  thinking: boolean;
  uploading?: boolean;
  compact?: boolean;
  placeholder?: string;
}

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

function insertAtCursor(text: string, insert: string, start: number, end: number): string {
  return text.slice(0, start) + insert + text.slice(end);
}

export default function ChatCompose({
  value,
  onChange,
  attachment,
  onPickFile,
  onRemoveAttachment,
  onSend,
  onStop,
  onActionPill,
  thinking,
  uploading = false,
  compact = false,
  placeholder = 'Bạn muốn hỏi, tạo app, hay xây dựng ý tưởng gì hôm nay?',
}: Props) {
  const [plusOpen, setPlusOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const plusRef = useRef<HTMLDivElement>(null);
  const fileId = compact ? 'chat-compose-file-compact' : 'chat-compose-file';

  const canSend = !thinking && !uploading && (value.trim().length > 0 || attachment);
  const busy = thinking || uploading;

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, compact ? 120 : 200)}px`;
  }, [compact]);

  useEffect(() => {
    resizeTextarea();
  }, [value, resizeTextarea]);

  useEffect(() => {
    if (!plusOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!plusRef.current?.contains(e.target as Node)) setPlusOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [plusOpen]);

  const handleFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      window.alert('Chỉ hỗ trợ đính kèm ảnh.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      window.alert('Ảnh tối đa 15MB.');
      return;
    }
    onPickFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const file = e.clipboardData.files?.[0];
    if (file?.type.startsWith('image/')) {
      e.preventDefault();
      handleFile(file);
    }
  };

  const appendText = (insert: string) => {
    const el = textareaRef.current;
    if (!el) {
      onChange(insert + value);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    onChange(insertAtCursor(value, insert, start, end));
    setPlusOpen(false);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + insert.length;
      el.setSelectionRange(pos, pos);
    });
  };

  return (
    <div
      className={`chat-compose${compact ? ' chat-compose--compact' : ''}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      {attachment && (
        <div className="chat-compose-attachment">
          <img src={attachment.url} alt={attachment.name} />
          <span>{attachment.name}</span>
          {uploading && (
            <span className="chat-compose-uploading">
              <Loader2 size={14} className="chat-spin" /> Đang tải lên…
            </span>
          )}
          <button type="button" onClick={onRemoveAttachment} aria-label="Bỏ ảnh" disabled={uploading}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="chat-compose-box">
        <input
          type="file"
          accept="image/*"
          hidden
          id={fileId}
          onChange={(e) => {
            handleFile(e.target.files?.[0] ?? null);
            e.target.value = '';
          }}
        />

        <div className="chat-compose-left">
          <label htmlFor={fileId} className="chat-compose-attach" title="Đính kèm ảnh (≤15MB)">
            <Paperclip size={16} />
          </label>
          <div className="chat-compose-plus-wrap" ref={plusRef}>
            <button
              type="button"
              className="chat-compose-plus"
              title="Thêm"
              aria-expanded={plusOpen}
              onClick={() => setPlusOpen((v) => !v)}
            >
              <Plus size={16} />
            </button>
            {plusOpen && (
              <div className="chat-compose-plus-menu">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      sessionStorage.setItem(
                        MINI_APP_PROMPT_KEY,
                        value.trim() || 'Mô tả mini app bạn muốn tạo…',
                      );
                    } catch {
                      /* ignore */
                    }
                    appendText('Tôi muốn tạo mini app: ');
                  }}
                >
                  Tạo Mini App
                </button>
                <button type="button" onClick={() => appendText('Phân tích ảnh đính kèm và ')}>
                  Phân tích ảnh
                </button>
                <button type="button" onClick={() => appendText('Tóm tắt ngắn gọn: ')}>
                  Tóm tắt
                </button>
              </div>
            )}
          </div>
        </div>

        <textarea
          ref={textareaRef}
          className="chat-compose-input"
          value={value}
          placeholder={placeholder}
          rows={compact ? 1 : 2}
          onChange={(e) => onChange(e.target.value)}
          onPaste={onPaste}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (canSend) onSend();
            }
          }}
        />

        {busy ? (
          <button
            type="button"
            className="chat-compose-send chat-compose-stop"
            onClick={uploading ? undefined : onStop}
            disabled={uploading}
            title={uploading ? 'Đang tải ảnh' : 'Dừng'}
            aria-label={uploading ? 'Đang tải ảnh' : 'Dừng'}
          >
            {uploading ? (
              <Loader2 size={16} className="chat-spin" />
            ) : (
              <Square size={14} fill="currentColor" />
            )}
          </button>
        ) : (
          <button
            type="button"
            className="chat-compose-send chat-compose-send--blue"
            onClick={onSend}
            disabled={!canSend}
            title="Gửi"
            aria-label="Gửi"
          >
            <ArrowUp size={18} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {!compact && (
        <div className="chat-compose-pills">
          {CHAT_ACTION_PILLS.map((pill) => (
            <button
              key={pill.id}
              type="button"
              className="chat-compose-pill"
              onClick={() => onActionPill?.(pill)}
            >
              {pill.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
