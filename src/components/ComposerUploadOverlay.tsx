/** Spinner overlay for media upload slots. Parent must be `position: relative`. */
export default function ComposerUploadOverlay({
  hint,
  minimal = false,
}: {
  hint?: string;
  /** Spinner only — no dim background or hint text (Studio slots, Quick Start). */
  minimal?: boolean;
}) {
  return (
    <div
      className={`composer-upload-overlay${minimal ? ' is-minimal' : ''}`}
      aria-live="polite"
      aria-busy="true"
      aria-label={minimal ? hint || 'Đang tải lên' : undefined}
    >
      <span className="composer-upload-spinner" aria-hidden />
      {!minimal && hint ? <span className="composer-upload-hint">{hint}</span> : null}
    </div>
  );
}
