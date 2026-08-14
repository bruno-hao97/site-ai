import { useState } from 'react';
import { useLocale } from '../i18n';

export default function UrlField({
  label,
  value,
  onChange,
  onUpload,
  accept = 'image/*,video/*',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onUpload: (f: File) => Promise<void>;
  accept?: string;
}) {
  const { t } = useLocale();
  const [uploading, setUploading] = useState(false);

  return (
    <label className="field">
      <span className="label">{label}</span>
      <div className="url-row">
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://…" />
        <label className={`btn ghost sm upload-btn${uploading ? ' is-uploading' : ''}`}>
          {uploading ? (
            <>
              <span className="composer-upload-spinner" aria-hidden />
              {t('urlField.loading')}
            </>
          ) : (
            t('urlField.upload')
          )}
          <input
            type="file"
            accept={accept}
            hidden
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              void (async () => {
                setUploading(true);
                try {
                  await onUpload(f);
                } finally {
                  setUploading(false);
                }
              })();
            }}
          />
        </label>
      </div>
    </label>
  );
}
