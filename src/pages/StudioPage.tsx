import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  GommoApiError,
  type GommoModel,
  type JobType,
} from '../services/api';
import StudioGallery, { type SessionItem } from '../components/StudioGallery';
import UrlField from '../components/UrlField';
import {
  defaultSelectionsForType,
  historyPromptFromSelections,
  jobTypeLabel,
  jobTypeToHistoryType,
  REUSABLE_JOB_TYPES,
  STUDIO_JOB_TYPES,
} from '../constants/studioTypes';
import {
  getCreditsAi,
  getGommoClient,
  isLoggedIn,
  loadAuth,
  refreshSession,
} from '../services/authStore';
import {
  addLocalJob,
  listLocalJobs,
  updateLocalJob,
  type LocalJob,
} from '../services/jobHistoryStore';
import {
  analyzeModel,
  buildJobPayload,
  defaultSelections,
  modelSlug,
  parseModelsList,
  type JobSelections,
  type ModelSchema,
} from '../services/modelSchema';
import { createJobAndPoll, type PollProgress } from '../services/polling';
import { addHistoryEntry, type HistoryEntry } from '../services/historyStore';
import { extractPollSnapshot } from '../services/mediaGenerationStatus';

export default function StudioPage() {
  const location = useLocation();
  const [jobType, setJobType] = useState<JobType>('image');
  const [models, setModels] = useState<GommoModel[]>([]);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [schema, setSchema] = useState<ModelSchema | null>(null);
  const [selections, setSelections] = useState<JobSelections>(defaultSelectionsForType('image'));
  const [loadingModels, setLoadingModels] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [recentJobs, setRecentJobs] = useState<LocalJob[]>([]);
  const [sessionItems, setSessionItems] = useState<SessionItem[]>([]);
  const [credits, setCredits] = useState(getCreditsAi());
  const abortRef = useRef<AbortController | null>(null);

  const client = useMemo(() => (isLoggedIn() ? getGommoClient() : null), []);
  const auth = loadAuth();
  const currentModel = models.find((m) => modelSlug(m) === selectedSlug) ?? null;
  const modelPrice = currentModel?.price ?? 0;

  const loadModelsList = useCallback(
    async (type: JobType) => {
      if (!client) return;
      setLoadingModels(true);
      setError('');
      try {
        const envelope = await client.fetchModels(type);
        const list = parseModelsList(envelope);
        setModels(list);
        if (!list.length) setError(`Không có model ${type}.`);
      } catch (err) {
        setError(err instanceof GommoApiError ? err.message : String(err));
        setModels([]);
      } finally {
        setLoadingModels(false);
      }
    },
    [client],
  );

  const loadRecentJobs = useCallback(() => {
    setRecentJobs(listLocalJobs());
  }, []);

  useEffect(() => {
    loadRecentJobs();
  }, [loadRecentJobs]);

  const applyReuse = useCallback((entry: HistoryEntry) => {
    const t = entry.type as JobType;
    if (!REUSABLE_JOB_TYPES.includes(t)) return;
    setJobType(t);
    setSelectedSlug(entry.modelSlug || '');
    const base = defaultSelectionsForType(t);
    setSelections({
      ...base,
      prompt: t === 'tts' || t === 'music' ? base.prompt : entry.prompt || base.prompt,
      text: t === 'tts' ? entry.prompt || base.text : base.text,
      name: t === 'music' ? entry.prompt || base.name : base.name,
      mode: entry.meta?.mode || '',
      resolution: entry.meta?.resolution || '',
      ratio: entry.meta?.ratio || '',
      duration: entry.meta?.duration || '',
    });
  }, []);

  useEffect(() => {
    const reuse = (location.state as { reuseHistory?: {
      type: JobType;
      prompt?: string;
      modelSlug?: string;
      meta?: Record<string, string>;
    } } | null)?.reuseHistory;
    if (!reuse?.type || !REUSABLE_JOB_TYPES.includes(reuse.type)) return;
    applyReuse({
      id: '',
      type: jobTypeToHistoryType(reuse.type),
      resultUrl: '',
      prompt: reuse.prompt,
      modelSlug: reuse.modelSlug,
      createdAt: new Date().toISOString(),
      meta: reuse.meta,
    });
  }, [location.key, applyReuse]);

  useEffect(() => {
    void loadModelsList(jobType);
  }, [jobType, loadModelsList]);

  useEffect(() => {
    const reuse = (location.state as { reuseHistory?: {
      type: JobType;
      modelSlug?: string;
    } } | null)?.reuseHistory;
    if (!reuse || reuse.type !== jobType || !models.length || !reuse.modelSlug) return;
    if (models.some((m) => modelSlug(m) === reuse.modelSlug)) {
      setSelectedSlug(reuse.modelSlug);
    }
  }, [models, jobType, location.state]);

  useEffect(() => {
    if (!currentModel) {
      setSchema(null);
      return;
    }
    const s = analyzeModel(currentModel, jobType);
    setSchema(s);
    setSelections((prev) => {
      const defs = defaultSelections(s);
      const defaults = defaultSelectionsForType(jobType);
      return {
        ...defs,
        prompt: prev.prompt || defaults.prompt,
        text: prev.text || defaults.text,
        name: prev.name || defaults.name,
        mode: prev.mode || defs.mode,
        ratio: prev.ratio || defs.ratio,
        resolution: prev.resolution || defs.resolution,
        duration: prev.duration || defs.duration,
        images: prev.images?.length ? prev.images : defs.images,
        references: prev.references?.length ? prev.references : defs.references,
        subjects: prev.subjects?.length ? prev.subjects : defs.subjects,
      };
    });
  }, [currentModel, jobType]);

  async function handleUpload(file: File, kind: 'image' | 'video') {
    if (!client) return null;
    setError('');
    try {
      const { url } = kind === 'image'
        ? await client.uploadImage(file)
        : await client.uploadVideo(file);
      return url;
    } catch (err) {
      setError(err instanceof GommoApiError ? err.message : String(err));
      return null;
    }
  }

  function updateSelection<K extends keyof JobSelections>(key: K, value: JobSelections[K]) {
    setSelections((s) => ({ ...s, [key]: value }));
  }

  function updateUrlList(key: 'images' | 'references' | 'subjects', index: number, value: string) {
    setSelections((s) => {
      const list = [...(s[key] || [])];
      list[index] = value;
      return { ...s, [key]: list };
    });
  }

  function recordSuccess(url: string, slug: string) {
    const prompt = historyPromptFromSelections(jobType, selections);
    const meta = {
      mode: selections.mode || '',
      resolution: selections.resolution || '',
      ratio: selections.ratio || '',
      duration: selections.duration || '',
    };
    const createdAt = new Date().toISOString();

    addHistoryEntry({
      type: jobTypeToHistoryType(jobType),
      resultUrl: url,
      prompt,
      modelName: currentModel?.name || slug,
      modelSlug: slug,
      meta,
    });

    setSessionItems((prev) => [
      {
        id: crypto.randomUUID(),
        type: jobType,
        resultUrl: url,
        prompt,
        modelName: currentModel?.name || slug,
        modelSlug: slug,
        createdAt,
      },
      ...prev,
    ]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!client || !currentModel || !schema || !auth) {
      setError('Chọn model trước.');
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setSubmitting(true);
    setError('');
    setProgress('Đang tạo job…');
    setResultUrl(null);

    const slug = modelSlug(currentModel);
    const { payload } = buildJobPayload(currentModel, jobType, selections, {
      domain: auth.domain,
      projectId: auth.projectId,
    });

    const localId = crypto.randomUUID();
    addLocalJob({
      id: localId,
      type: jobType,
      model_id: slug,
      status: 'processing',
      created_at: new Date().toISOString(),
    });
    loadRecentJobs();

    try {
      const { pollResult, resultUrl: url, createEnvelope } = await createJobAndPoll(
        client,
        jobType,
        slug,
        payload,
        (p) => {
          if ('phase' in p && p.phase === 'creating') {
            setProgress('Đang gửi request tạo job…');
            return;
          }
          const prog = p as PollProgress;
          setProgress(`Poll #${prog.attempt}: ${prog.status || prog.phase}`);
          if (prog.resultUrl) setResultUrl(prog.resultUrl);
        },
        abortRef.current.signal,
      );

      const snap = extractPollSnapshot(createEnvelope as Parameters<typeof extractPollSnapshot>[0]);
      const finalUrl = url ?? snap.resultUrl;

      if (finalUrl) {
        setResultUrl(finalUrl);
        setProgress('Hoàn tất!');
        updateLocalJob(localId, { status: 'success', result_url: finalUrl });
        recordSuccess(finalUrl, slug);
        try {
          const refreshed = await refreshSession();
          setCredits(refreshed.upstream_me.balancesInfo?.credits_ai ?? credits);
        } catch {
          /* ignore */
        }
      } else {
        const errMsg = pollResult?.error || 'Job thất bại';
        setError(errMsg);
        updateLocalJob(localId, { status: 'failed', error: errMsg });
      }

      loadRecentJobs();
    } catch (err) {
      const msg = err instanceof GommoApiError ? err.message : String(err);
      setError(msg);
      updateLocalJob(localId, { status: 'failed', error: msg });
      loadRecentJobs();
    } finally {
      setSubmitting(false);
    }
  }

  const processingJobs = recentJobs.filter((j) => j.type === jobType && j.status === 'processing');

  function switchJobType(type: JobType) {
    setJobType(type);
    setSelectedSlug('');
    setSchema(null);
    setResultUrl(null);
    setSelections(defaultSelectionsForType(type));
  }

  return (
    <div className="page">
      <div className="page-head">
        <p className="kicker">AI Studio</p>
        <h1>Tạo {jobTypeLabel(jobType)}</h1>
        <p className="lead">
          Gọi thẳng <strong>v2.api.gommo.net</strong> — credit upstream:{' '}
          <strong>{credits.toLocaleString('vi-VN')}</strong>
          {modelPrice > 0 && <> · Model ~{modelPrice} credit</>}
        </p>
      </div>

      <div className="type-tabs studio-type-tabs">
        {STUDIO_JOB_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            className={`tab ${jobType === t.value ? 'active' : ''}`}
            onClick={() => switchJobType(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="pg-grid studio-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>Models</h2>
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => loadModelsList(jobType)}
              disabled={loadingModels}
            >
              Refresh
            </button>
          </div>
          {loadingModels && <p className="muted">Đang tải…</p>}
          <ul className="model-list">
            {models.map((m) => {
              const slug = modelSlug(m);
              return (
                <li key={slug}>
                  <button
                    type="button"
                    className={`model-item ${selectedSlug === slug ? 'selected' : ''}`}
                    onClick={() => setSelectedSlug(slug)}
                  >
                    <span className="model-name">{m.name || slug}</span>
                    <span className="model-slug">{slug}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="panel">
          <h2>Tạo job</h2>
          {!schema ? (
            <p className="muted">Chọn model.</p>
          ) : (
            <form onSubmit={handleSubmit} className="form">
              {schema.fields.prompt && (
                <label className="field">
                  <span className="label">Prompt</span>
                  <textarea
                    rows={3}
                    value={selections.prompt || ''}
                    onChange={(e) => updateSelection('prompt', e.target.value)}
                  />
                </label>
              )}
              {schema.fields.text && (
                <label className="field">
                  <span className="label">Text (TTS)</span>
                  <textarea
                    rows={3}
                    value={selections.text || ''}
                    onChange={(e) => updateSelection('text', e.target.value)}
                  />
                </label>
              )}
              {schema.fields.musicName && (
                <label className="field">
                  <span className="label">Tên bài (music)</span>
                  <input
                    value={selections.name || ''}
                    onChange={(e) => updateSelection('name', e.target.value)}
                  />
                </label>
              )}
              {schema.fields.ratio && (
                <label className="field">
                  <span className="label">Ratio</span>
                  <select
                    value={selections.ratio || ''}
                    onChange={(e) => updateSelection('ratio', e.target.value)}
                  >
                    {schema.options.ratios.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>
              )}
              {schema.fields.mode && (
                <label className="field">
                  <span className="label">Mode</span>
                  <select
                    value={selections.mode || ''}
                    onChange={(e) => updateSelection('mode', e.target.value)}
                  >
                    {schema.options.modes.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>
              )}
              {schema.fields.resolution && (
                <label className="field">
                  <span className="label">Resolution</span>
                  <select
                    value={selections.resolution || ''}
                    onChange={(e) => updateSelection('resolution', e.target.value)}
                  >
                    {schema.options.resolutions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>
              )}
              {schema.fields.duration && (
                <label className="field">
                  <span className="label">Duration</span>
                  <select
                    value={selections.duration || ''}
                    onChange={(e) => updateSelection('duration', e.target.value)}
                  >
                    {schema.options.durations.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>
              )}
              {schema.fields.startFrame && (
                <UrlField
                  label={schema.fields.endFrame ? 'Start frame URL' : 'First frame URL'}
                  value={selections.images?.[0] || ''}
                  onChange={(v) => updateUrlList('images', 0, v)}
                  onUpload={async (f) => {
                    const uploaded = await handleUpload(f, 'image');
                    if (uploaded) updateUrlList('images', 0, uploaded);
                  }}
                />
              )}
              {schema.fields.endFrame && (
                <UrlField
                  label="End frame URL"
                  value={selections.images?.[1] || ''}
                  onChange={(v) => updateUrlList('images', 1, v)}
                  onUpload={async (f) => {
                    const uploaded = await handleUpload(f, 'image');
                    if (uploaded) updateUrlList('images', 1, uploaded);
                  }}
                />
              )}
              {schema.fields.references && (
                <UrlField
                  label={`Reference URL (max ${schema.limits.maxReference})`}
                  value={selections.references?.[0] || ''}
                  onChange={(v) => updateUrlList('references', 0, v)}
                  onUpload={async (f) => {
                    const uploaded = await handleUpload(f, 'image');
                    if (uploaded) updateUrlList('references', 0, uploaded);
                  }}
                />
              )}
              {schema.fields.subjects && (
                <UrlField
                  label={`Subject URL (max ${schema.limits.maxSubject})`}
                  value={selections.subjects?.[0] || ''}
                  onChange={(v) => updateUrlList('subjects', 0, v)}
                  onUpload={async (f) => {
                    const uploaded = await handleUpload(f, 'image');
                    if (uploaded) updateUrlList('subjects', 0, uploaded);
                  }}
                />
              )}
              <div className="actions">
                <button type="submit" className="btn primary" disabled={submitting}>
                  {submitting ? 'Đang chạy…' : `Tạo ${jobTypeLabel(jobType)}`}
                </button>
                {submitting && (
                  <button type="button" className="btn secondary" onClick={() => abortRef.current?.abort()}>
                    Hủy poll
                  </button>
                )}
              </div>
            </form>
          )}

          {processingJobs.length > 0 && (
            <p className="progress muted" style={{ marginTop: '0.75rem' }}>
              Đang xử lý: {processingJobs.map((j) => j.model_id).join(', ')}
            </p>
          )}

          {error && <p className="error">{error}</p>}
          {progress && <p className="progress">{progress}</p>}

          {resultUrl && (
            <div className="result-preview">
              <h3>Kết quả</h3>
              <a href={resultUrl} target="_blank" rel="noreferrer">{resultUrl}</a>
              {/\.(png|jpe?g|webp|gif)/i.test(resultUrl) && (
                <img src={resultUrl} alt="result" />
              )}
              {/\.(mp4|webm|mov)/i.test(resultUrl) && (
                <video src={resultUrl} controls />
              )}
              {/\.(mp3|wav|ogg|m4a)/i.test(resultUrl) && (
                <audio src={resultUrl} controls />
              )}
            </div>
          )}
        </section>

        <StudioGallery
          jobType={jobType}
          sessionItems={sessionItems}
          onReuse={applyReuse}
        />
      </div>
    </div>
  );
}
