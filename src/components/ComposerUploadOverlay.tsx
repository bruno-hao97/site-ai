import { useLocale } from '../i18n';

/** Spinner overlay for media upload slots. Parent must be `position: relative`. */
export default function ComposerUploadOverlay({
  hint,
  minimal = false,
}: {
  hint?: string;
  /** Spinner only — no dim background or hint text (Studio slots, Quick Start). */
  minimal?: boolean;
}) {
  const { t } = useLocale();
  const uploadHint = hint ?? t('composer.upload.uploading');

  return (
    <div
      className={`composer-upload-overlay${minimal ? ' is-minimal' : ''}`}
      aria-live="polite"
      aria-busy="true"
      aria-label={minimal ? uploadHint : undefined}
    >
      <span className="composer-upload-spinner" aria-hidden />
      {!minimal && uploadHint ? <span className="composer-upload-hint">{uploadHint}</span> : null}
    </div>
  );
}
