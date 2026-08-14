import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BASE_URL,
  GommoClient,
  GommoApiError,
  type GommoModel,
  type JobType,
} from '../services/api';
import {
  analyzeModel,
  buildJobPayload,
  clearModelsCache,
  defaultSelections,
  getCachedModels,
  modelSlug,
  parseModelsList,
  setCachedModels,
  type JobSelections,
  type ModelSchema,
} from '../services/modelSchema';
import { DEFAULT_DOMAIN } from '../services/settingsStore';
import { extractPollSnapshot } from '../services/mediaGenerationStatus';
import { createJobAndPoll, type PollProgress } from '../services/polling';
import { formatAcceptedPendingMessage, isJobAcceptedPendingError } from '../services/jobInfraErrors';
import { isLoggedIn, getGommoClient } from '../services/authStore';
import { hasToken, loadSettings } from '../services/settingsStore';
import UrlField from '../components/UrlField';
import { useLocale } from '../i18n';
import type { TranslationKey } from '../i18n/types';

const JOB_TYPE_KEYS: Partial<Record<JobType, TranslationKey>> = {
  image: 'jobType.image',
  video: 'jobType.video',
  tts: 'jobType.tts',
  music: 'jobType.music',
  'avatar-lipsync': 'playground.jobType.avatarLipsync',
};

const JOB_TYPES: JobType[] = ['image', 'video', 'tts', 'music', 'avatar-lipsync'];

export default function ApiPlaygroundPage() {
  const { t } = useLocale();
  const [jobType, setJobType] = useState<JobType>('image');
  const [models, setModels] = useState<GommoModel[]>([]);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [schema, setSchema] = useState<ModelSchema | null>(null);
  const [selections, setSelections] = useState<JobSelections>({ prompt: 'a cinematic portrait' });
  const [loadingModels, setLoadingModels] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const [requestPreview, setRequestPreview] = useState<Record<string, unknown> | null>(null);
  const [createResponse, setCreateResponse] = useState<unknown>(null);
  const [pollResponse, setPollResponse] = useState<unknown>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const client = useMemo(() => {
    if (isLoggedIn()) return getGommoClient();
    const s = loadSettings();
    return new GommoClient(s);
  }, []);

  const currentModel = useMemo(
    () => models.find((m) => modelSlug(m) === selectedSlug) ?? null,
    [models, selectedSlug],
  );

  const loadModels = useCallback(async (type: JobType, force = false) => {
    if (!isLoggedIn() && !hasToken()) {
      setError(t('playground.notLoggedIn'));
      setModels([]);
      return;
    }

    if (!force) {
      const cached = getCachedModels(type);
      if (cached?.length) {
        setModels(cached);
        return;
      }
    }

    setLoadingModels(true);
    setError('');
    try {
      const envelope = await client.fetchModels(type);
      const list = parseModelsList(envelope);
      setCachedModels(type, list);
      setModels(list);
      if (!list.length) setError(t('playground.noModels'));
    } catch (err) {
      clearModelsCache();
      setError(err instanceof GommoApiError ? err.message : String(err));
      setModels([]);
    } finally {
      setLoadingModels(false);
    }
  }, [client, t]);

  useEffect(() => {
    loadModels(jobType);
    setSelectedSlug('');
    setSchema(null);
    setResultUrl(null);
    setCreateResponse(null);
    setPollResponse(null);
  }, [jobType, loadModels]);

  useEffect(() => {
    if (!currentModel) {
      setSchema(null);
      return;
    }
    const s = analyzeModel(currentModel, jobType);
    setSchema(s);
    setSelections((prev) => ({
      ...defaultSelections(s),
      prompt: prev.prompt || (jobType === 'music' ? '' : 'a cinematic portrait'),
      text: prev.text || 'Xin chào, đây là thử nghiệm TTS.',
      name: prev.name || 'Demo track',
      style: prev.style || (jobType === 'music' ? 'upbeat electronic dance' : undefined),
    }));
  }, [currentModel, jobType]);

  useEffect(() => {
    if (!currentModel || !schema) {
      setRequestPreview(null);
      return;
    }
    try {
      const { payload } = buildJobPayload(currentModel, jobType, selections, loadSettings());
      setRequestPreview(payload);
    } catch {
      setRequestPreview(null);
    }
  }, [currentModel, schema, jobType, selections]);

  async function handleUpload(file: File, kind: 'image' | 'video') {
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!hasToken()) {
      setError(t('playground.noToken'));
      return;
    }
    if (!currentModel || !schema) {
      setError(t('playground.pickModel'));
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setSubmitting(true);
    setError('');
    setProgress(t('playground.progress.creating'));
    setCreateResponse(null);
    setPollResponse(null);
    setResultUrl(null);

    try {
      const { payload } = buildJobPayload(currentModel, jobType, selections, loadSettings());
      const modelId = modelSlug(currentModel);

      const result = await createJobAndPoll(
        client,
        jobType,
        modelId,
        payload,
        (p) => {
          if ('phase' in p && p.phase === 'creating') {
            setProgress(t('playground.progress.creating'));
            return;
          }
          const prog = p as PollProgress;
          setProgress(
            t('playground.progress.poll', {
              attempt: prog.attempt,
              phase: prog.phase,
              status: prog.status || '…',
            }),
          );
          setPollResponse(prog.envelope);
        },
        abortRef.current.signal,
      );

      setCreateResponse(result.createEnvelope);

      const snap = extractPollSnapshot(result.createEnvelope as Parameters<typeof extractPollSnapshot>[0]);
      const url = result.resultUrl ?? snap.resultUrl;
      if (url) {
        setResultUrl(url);
        setProgress(t('playground.progress.done'));
      } else if (result.pollResult?.acceptedPending || isJobAcceptedPendingError(result.pollResult?.error)) {
        setProgress(result.pollResult?.error || formatAcceptedPendingMessage());
      } else if (result.pollResult?.timeout) {
        setError(t('playground.progress.timeout'));
      } else if (result.pollResult && !result.pollResult.success) {
        setError(result.pollResult.error || t('playground.progress.jobFailed'));
      } else {
        setProgress(t('playground.progress.ttsDone'));
      }
    } catch (err) {
      if (err instanceof GommoApiError && err.status === 400) {
        clearModelsCache();
        await loadModels(jobType, true);
      }
      setError(err instanceof GommoApiError ? err.message : String(err));
      if (err instanceof GommoApiError && err.envelope) {
        setCreateResponse(err.envelope);
      }
    } finally {
      setSubmitting(false);
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

  const requestUrl = currentModel
    ? `${BASE_URL}/ai/jobs/${jobType}/${modelSlug(currentModel)}`
    : `${BASE_URL}/ai/jobs/{type}/{model_id}`;

  return (
    <div className="playground">
      <div className="page-head">
        <p className="kicker">{t('playground.kicker')}</p>
        <h1>{t('playground.title')}</h1>
        <p className="lead">
          {t('playground.lead')} <code>{DEFAULT_DOMAIN}</code>.
        </p>
      </div>

      {!hasToken() && (
        <div className="banner warn">
          {t('playground.noTokenBanner')}{' '}
          <Link to="/settings">{t('playground.settingsLink')}</Link>{' '}
          {t('playground.settingsHint')}
        </div>
      )}

      <div className="pg-grid">
        <section className="panel pg-models">
          <div className="panel-head">
            <h2>{t('playground.modelsTitle')}</h2>
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => loadModels(jobType, true)}
              disabled={loadingModels}
            >
              {t('playground.refresh')}
            </button>
          </div>

          <div className="type-tabs">
            {JOB_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className={`tab ${jobType === type ? 'active' : ''}`}
                onClick={() => setJobType(type)}
              >
                {t(JOB_TYPE_KEYS[type] ?? 'jobType.image')}
              </button>
            ))}
          </div>

          {loadingModels && <p className="muted">{t('playground.loadingModels')}</p>}
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

        <section className="panel pg-form">
          <h2>{t('playground.jobPayloadTitle')}</h2>
          {!schema ? (
            <p className="muted">{t('playground.pickModelHint')}</p>
          ) : (
            <form onSubmit={handleSubmit} className="form">
              {schema.fields.prompt && !(schema.fields.musicName && selections.instrumental) && (
                <label className="field">
                  <span className="label">
                    {schema.fields.musicName ? t('playground.label.lyrics') : t('playground.label.prompt')}
                  </span>
                  <textarea
                    rows={3}
                    value={selections.prompt || ''}
                    onChange={(e) => updateSelection('prompt', e.target.value)}
                  />
                </label>
              )}
              {schema.fields.text && (
                <label className="field">
                  <span className="label">{t('playground.label.textTts')}</span>
                  <textarea
                    rows={3}
                    value={selections.text || ''}
                    onChange={(e) => updateSelection('text', e.target.value)}
                  />
                </label>
              )}
              {schema.fields.musicName && (
                <label className="field">
                  <span className="label">{t('playground.label.musicName')}</span>
                  <input
                    value={selections.name || ''}
                    onChange={(e) => updateSelection('name', e.target.value)}
                  />
                </label>
              )}
              {schema.fields.musicStyle && (
                <label className="field">
                  <span className="label">{t('playground.label.musicStyle')}</span>
                  <textarea
                    rows={2}
                    value={selections.style || ''}
                    onChange={(e) => updateSelection('style', e.target.value)}
                  />
                </label>
              )}
              {schema.fields.musicName && (
                <label className="field">
                  <input
                    type="checkbox"
                    checked={Boolean(selections.instrumental)}
                    onChange={(e) => updateSelection('instrumental', e.target.checked)}
                  />
                  <span>{t('playground.instrumental')}</span>
                </label>
              )}

              {schema.fields.ratio && (
                <label className="field">
                  <span className="label">{t('playground.label.ratio')}</span>
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
                  <span className="label">{t('playground.label.mode')}</span>
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
                  <span className="label">{t('playground.label.resolution')}</span>
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
                  <span className="label">{t('playground.label.duration')}</span>
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
                  label={
                    schema.fields.endFrame
                      ? t('playground.label.startFrame')
                      : t('playground.label.firstFrame')
                  }
                  value={selections.images?.[0] || ''}
                  onChange={(v) => updateUrlList('images', 0, v)}
                  onUpload={async (f) => {
                    const url = await handleUpload(f, 'image');
                    if (url) updateUrlList('images', 0, url);
                  }}
                />
              )}
              {schema.fields.endFrame && (
                <UrlField
                  label={t('playground.label.endFrame')}
                  value={selections.images?.[1] || ''}
                  onChange={(v) => updateUrlList('images', 1, v)}
                  onUpload={async (f) => {
                    const url = await handleUpload(f, 'image');
                    if (url) updateUrlList('images', 1, url);
                  }}
                />
              )}

              {schema.fields.references && (
                <UrlField
                  label={t('playground.label.reference', { max: schema.limits.maxReference })}
                  value={selections.references?.[0] || ''}
                  onChange={(v) => updateUrlList('references', 0, v)}
                  onUpload={async (f) => {
                    const url = await handleUpload(f, 'image');
                    if (url) updateUrlList('references', 0, url);
                  }}
                />
              )}

              <div className="actions">
                <button type="submit" className="btn primary btn-job" disabled={submitting || !hasToken()}>
                  {submitting ? t('playground.submitting') : t('playground.submit')}
                </button>
                {submitting && (
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => abortRef.current?.abort()}
                  >
                    {t('playground.cancel')}
                  </button>
                )}
              </div>
            </form>
          )}

          {error && <p className="error">{error}</p>}
          {progress && <p className="progress">{progress}</p>}

          {resultUrl && (
            <div className="result-preview">
              <h3>{t('playground.resultTitle')}</h3>
              <a href={resultUrl} target="_blank" rel="noreferrer">{resultUrl}</a>
              {/\.(png|jpe?g|webp|gif)/i.test(resultUrl) && (
                <img src={resultUrl} alt={t('playground.resultAlt')} />
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

        <section className="panel pg-debug">
          <h2>{t('playground.debugTitle')}</h2>
          <div className="debug-block">
            <span className="debug-label">POST {requestUrl}</span>
            <pre>{JSON.stringify(requestPreview, null, 2)}</pre>
          </div>
          <div className="debug-block">
            <span className="debug-label">{t('playground.debug.authMasked')}</span>
            <pre>
              {JSON.stringify(
                {
                  domain: loadSettings().domain,
                  project_id: loadSettings().projectId,
                  Authorization: hasToken() ? 'Bearer ••••••••' : null,
                },
                null,
                2,
              )}
            </pre>
          </div>
          {createResponse != null && (
            <div className="debug-block">
              <span className="debug-label">{t('playground.debug.createResponse')}</span>
              <pre>{JSON.stringify(createResponse, null, 2)}</pre>
            </div>
          )}
          {pollResponse != null && (
            <div className="debug-block">
              <span className="debug-label">{t('playground.debug.pollResponse')}</span>
              <pre>{JSON.stringify(pollResponse, null, 2)}</pre>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
