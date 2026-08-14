import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link2, X } from 'lucide-react';
import { useLocale } from '../i18n';
import { validateMediaUrl } from '../services/mediaUrlValidation';

export default function ComposerMediaLinkModal({
  open,
  kind,
  onClose,
  onConfirm,
}: {
  open: boolean;
  kind: 'image' | 'video' | 'any';
  onClose: () => void;
  onConfirm: (url: string) => void;
}) {
  const { t } = useLocale();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setUrl('');
      setError('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const hintKey =
    kind === 'video'
      ? 'composer.mediaLink.hintVideo'
      : kind === 'image'
        ? 'composer.mediaLink.hintImage'
        : 'composer.mediaLink.hintAny';

  const submit = () => {
    const err = validateMediaUrl(url, kind);
    if (err) {
      setError(err);
      return;
    }
    onConfirm(url.trim());
    onClose();
  };

  return createPortal(
    <div className="cms-modal-backdrop" onClick={onClose}>
      <div className="cms-modal cms-link-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cms-modal-head">
          <h3>
            <Link2 size={16} /> {t('composer.mediaLink.title')}
          </h3>
          <button type="button" className="cms-modal-close" aria-label={t('common.close')} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <p className="cms-link-hint">{t(hintKey)}</p>
        <input
          className="cms-link-input"
          autoFocus
          value={url}
          placeholder="https://…"
          onChange={(e) => {
            setUrl(e.target.value);
            setError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
        />
        {error && <p className="cms-modal-error">{error}</p>}
        <div className="cms-link-actions">
          <button type="button" className="cms-link-cancel" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="button" className="cms-link-confirm" onClick={submit}>
            {t('composer.mediaLink.useLink')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
