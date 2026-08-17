import { useLocale } from '../i18n';
import type { LibraryPendingJob } from '../services/pendingJobsStore';

export default function LibraryPendingSection({ jobs }: { jobs: LibraryPendingJob[] }) {
  const { t } = useLocale();
  const processing = jobs.filter((j) => j.status === 'processing');

  if (!processing.length) return null;

  return (
    <section className="library-pending-section">
      <header className="library-pending-head">
        <span className="clib-group-label">{t('studio.pending.section')}</span>
        <span className="clib-count">({processing.length})</span>
      </header>
      <div className="library-pending-grid">
        {processing.map((p) => (
          <article key={p.id} className="hist-card hist-card-pending-vmedia processing">
            <div className="pending-vmedia-body">
              <span className="pending-spinner-lg" aria-hidden />
              <span className="pending-vmedia-label">{t('studio.pending.badge')}</span>
              <div
                className="pending-vmedia-bar"
                role="progressbar"
                aria-valuenow={p.progress ?? 12}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t('studio.pending.progressAria')}
              >
                <div
                  className="pending-vmedia-bar-fill"
                  style={{ width: `${p.progress ?? 12}%` }}
                />
              </div>
            </div>
            {p.prompt && (
              <p className="pending-vmedia-prompt" title={p.prompt}>
                {p.prompt}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
