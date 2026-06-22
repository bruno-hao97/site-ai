import {
  type CSSProperties,
  type ReactNode,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  Clapperboard,
  Clipboard,
  Clock,
  Download,
  Maximize2,
  Monitor,
  Plus,
  Proportions,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  Wand2,
} from 'lucide-react';
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
  loadAuth,
  notifyCreditsUpdated,
  refreshSession,
} from '../services/authStore';
import {
  createStudioJob,
  fetchJobCosts,
  fetchModels as fetchModelsBackend,
  pollJobUntilDone,
  uploadMediaBackend,
  type JobCosts,
} from '../services/backendApi';
import { isBackendLoggedIn } from '../services/session';

const BACKEND_JOB_TYPES: JobType[] = ['image', 'video', 'tts', 'music', 'avatar-lipsync'];
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
  type ModelOption,
  type ModelSchema,
} from '../services/modelSchema';
import { createJobAndPoll, type PollProgress } from '../services/polling';
import {
  addHistoryEntry,
  isMediaUrl,
  listHistory,
  loadFavorites,
  removeHistoryEntry,
  toggleFavorite,
  type HistoryEntry,
} from '../services/historyStore';
import { useHistoryUpdated } from '../hooks/useHistoryUpdated';
import { extractPollSnapshot } from '../services/mediaGenerationStatus';

function dateGroupLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Hôm nay';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Hôm qua';
  return `Tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;
}

// Nhóm model theo nhà cung cấp. Ưu tiên field upstream (group/company/provider/brand);
// nếu không có thì đoán theo tên model.
function modelProvider(m: GommoModel): string {
  const raw = m as unknown as Record<string, unknown>;
  for (const key of ['group', 'company', 'provider', 'brand', 'vendor']) {
    const v = raw[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  const n = (m.name || modelSlug(m)).toLowerCase();
  if (/\bgpt\b|dall-?e|openai|sora/.test(n)) return 'OpenAI';
  if (/gemini|nano\s*banana|imagen|veo|google/.test(n)) return 'Google';
  if (/grok|xai/.test(n)) return 'xAI';
  if (/kling/.test(n)) return 'Kling AI';
  if (/seedream|seedance|dreamina|capcut/.test(n)) return 'Dreamina';
  if (/qwen|wan|alibaba|tongyi/.test(n)) return 'Alibaba';
  if (/midjourney|\bmj\b/.test(n)) return 'Midjourney';
  if (/flux|black\s*forest/.test(n)) return 'Black Forest Labs';
  if (/runway|gen-?\d/.test(n)) return 'Runway';
  if (/luma|dream\s*machine/.test(n)) return 'Luma';
  if (/stable|sdxl|stability/.test(n)) return 'Stability AI';
  if (/minimax|hailuo/.test(n)) return 'MiniMax';
  if (/pika/.test(n)) return 'Pika';
  if (/recraft/.test(n)) return 'Recraft';
  if (/ideogram/.test(n)) return 'Ideogram';
  if (/elevenlabs|eleven\s*labs/.test(n)) return 'ElevenLabs';
  if (/suno/.test(n)) return 'Suno';
  return 'Khác';
}

function formatPrice(price: number): string {
  return price.toLocaleString('vi-VN');
}

interface AnchorPos {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  placement: 'down' | 'up';
}

// Định vị panel theo trigger (fixed) + đóng khi click ngoài/Escape + reposition khi
// cuộn/resize. Dùng cho dropdown render qua portal để không bị container overflow cắt.
function useAnchoredDropdown(open: boolean, setOpen: (v: boolean) => void) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<AnchorPos | null>(null);

  const updatePos = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 4;
    const spaceBelow = window.innerHeight - r.bottom - 8;
    const spaceAbove = r.top - 8;
    const placeUp = spaceBelow < 240 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(160, Math.min(380, (placeUp ? spaceAbove : spaceBelow) - gap));
    setPos({
      left: r.left,
      width: r.width,
      top: placeUp ? r.top - gap : r.bottom + gap,
      maxHeight,
      placement: placeUp ? 'up' : 'down',
    });
  }, []);

  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    updatePos();
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [open, setOpen, updatePos]);

  return { triggerRef, panelRef, pos };
}

function anchoredPanelStyle(pos: AnchorPos | null): CSSProperties | undefined {
  if (!pos) return undefined;
  return {
    position: 'fixed',
    left: pos.left,
    width: pos.width,
    top: pos.top,
    maxHeight: pos.maxHeight,
    ...(pos.placement === 'up' ? { transform: 'translateY(-100%)' } : {}),
  };
}

function ModelPicker({
  models,
  value,
  onChange,
  loading,
}: {
  models: GommoModel[];
  value: string;
  onChange: (slug: string) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { triggerRef, panelRef, pos } = useAnchoredDropdown(open, setOpen);

  const current = models.find((m) => modelSlug(m) === value) ?? null;

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map<string, GommoModel[]>();
    for (const m of models) {
      const slug = modelSlug(m);
      if (q && !`${m.name ?? ''} ${slug}`.toLowerCase().includes(q)) continue;
      const g = modelProvider(m);
      const list = map.get(g);
      if (list) list.push(m);
      else map.set(g, [m]);
    }
    return [...map.entries()].sort((a, b) => {
      if (a[0] === 'Khác') return 1;
      if (b[0] === 'Khác') return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [models, search]);

  const totalShown = grouped.reduce((n, [, list]) => n + list.length, 0);

  const panelStyle = anchoredPanelStyle(pos);

  return (
    <div className="model-picker" ref={triggerRef}>
      <button
        type="button"
        className={`model-picker-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
      >
        <span className="model-picker-current">
          {loading
            ? 'Đang tải…'
            : current
              ? current.name || modelSlug(current)
              : '— Chọn model —'}
        </span>
        {current && typeof current.price === 'number' && (
          <span className="model-picker-price">{formatPrice(current.price)}</span>
        )}
        <ChevronDown size={14} className={`model-picker-caret ${open ? 'open' : ''}`} />
      </button>

      {open &&
        pos &&
        createPortal(
          <div className="model-picker-panel" ref={panelRef} style={panelStyle}>
            <div className="model-picker-search">
              <Search size={14} />
              <input
                autoFocus
                type="text"
                placeholder="Tìm model…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="model-picker-list">
              {totalShown === 0 && (
                <div className="model-picker-empty">Không có model phù hợp</div>
              )}
              {grouped.map(([provider, list]) => (
                <div key={provider} className="model-picker-group">
                  <div className="model-picker-group-head">{provider}</div>
                  {list.map((m) => {
                    const slug = modelSlug(m);
                    const active = slug === value;
                    return (
                      <button
                        key={slug}
                        type="button"
                        className={`model-picker-item ${active ? 'active' : ''}`}
                        onClick={() => {
                          onChange(slug);
                          setOpen(false);
                          setSearch('');
                        }}
                      >
                        <span className="model-picker-item-name">{m.name || slug}</span>
                        <span className="model-picker-item-meta">
                          {typeof m.price === 'number' && (
                            <span className="model-picker-item-price">{formatPrice(m.price)}</span>
                          )}
                          {active && <Check size={14} className="model-picker-check" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function OptionDropdown({
  icon,
  options,
  value,
  onChange,
}: {
  icon: ReactNode;
  options: ModelOption[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const { triggerRef, panelRef, pos } = useAnchoredDropdown(open, setOpen);

  const current = options.find((o) => o.value === value) ?? null;
  const panelStyle = anchoredPanelStyle(pos);

  return (
    <div className="opt-dropdown" ref={triggerRef}>
      <button
        type="button"
        className={`opt-dropdown-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="opt-dropdown-icon">{icon}</span>
        <span className="opt-dropdown-current">{current?.label ?? '—'}</span>
        <ChevronDown size={13} className={`opt-dropdown-caret ${open ? 'open' : ''}`} />
      </button>

      {open &&
        pos &&
        createPortal(
          <div className="opt-dropdown-panel" ref={panelRef} style={panelStyle}>
            <div className="opt-dropdown-list">
              {options.map((o) => {
                const active = o.value === value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    className={`opt-dropdown-item ${active ? 'active' : ''}`}
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                  >
                    <span className="opt-dropdown-item-name">{o.label}</span>
                    {active && <Check size={13} className="opt-dropdown-check" />}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export default function StudioPage({
  initialType = 'image',
  lockType = false,
  layout = 'classic',
}: {
  initialType?: JobType;
  lockType?: boolean;
  layout?: 'classic' | 'composer';
}) {
  const location = useLocation();
  const [jobType, setJobType] = useState<JobType>(initialType);
  const [models, setModels] = useState<GommoModel[]>([]);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [schema, setSchema] = useState<ModelSchema | null>(null);
  const [selections, setSelections] = useState<JobSelections>(defaultSelectionsForType(initialType));
  const [loadingModels, setLoadingModels] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [recentJobs, setRecentJobs] = useState<LocalJob[]>([]);
  const [sessionItems, setSessionItems] = useState<SessionItem[]>([]);
  const [credits, setCredits] = useState(getCreditsAi());
  const [qty, setQty] = useState(1);
  const [composerMode, setComposerMode] = useState<'single' | 'auto'>('single');
  const [multiModel, setMultiModel] = useState(false);
  const [zoom, setZoom] = useState(200);
  const [mainTab, setMainTab] = useState<'current' | 'history' | 'folder'>('current');
  const [uploadedPreview, setUploadedPreview] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [historyTick, setHistoryTick] = useState(0);
  useHistoryUpdated(() => setHistoryTick((n) => n + 1));
  const abortRef = useRef<AbortController | null>(null);
  const sessionStartRef = useRef(Date.now());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const client = useMemo(() => (loadAuth() ? getGommoClient() : null), []);
  const auth = loadAuth();
  // User JWT (đăng nhập email/Google) không có Gommo client → tạo job qua backend.
  const useBackend = !client && isBackendLoggedIn();
  const [backendCosts, setBackendCosts] = useState<JobCosts | null>(null);
  const currentModel = models.find((m) => modelSlug(m) === selectedSlug) ?? null;
  const modelPrice = currentModel?.price ?? 0;
  // User JWT trừ credit theo cấu hình backend; user Gommo token theo giá model upstream.
  const unitCost = useBackend ? backendCosts?.[jobType] ?? 0 : modelPrice;
  // Composer hiển thị giá theo model.price (khớp 79AI); fallback về unitCost nếu model chưa có giá.
  const composerCost = modelPrice || unitCost;

  const loadModelsList = useCallback(
    async (type: JobType) => {
      if (!client && !useBackend) return;
      setLoadingModels(true);
      setError('');
      try {
        const list = client
          ? parseModelsList(await client.fetchModels(type))
          : parseModelsList(await fetchModelsBackend(type));
        setModels(list);
        if (!list.length) setError(`Không có model ${type}.`);
      } catch (err) {
        setError(err instanceof GommoApiError ? err.message : String(err));
        setModels([]);
      } finally {
        setLoadingModels(false);
      }
    },
    [client, useBackend],
  );

  const loadRecentJobs = useCallback(() => {
    setRecentJobs(listLocalJobs());
  }, []);

  useEffect(() => {
    loadRecentJobs();
  }, [loadRecentJobs]);

  useEffect(() => {
    if (!useBackend) return;
    fetchJobCosts()
      .then(setBackendCosts)
      .catch(() => {});
  }, [useBackend]);

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
    if (!client && !useBackend) return null;
    setError('');
    try {
      if (client) {
        const { url } = kind === 'image'
          ? await client.uploadImage(file)
          : await client.uploadVideo(file);
        return url;
      }
      const { url } = await uploadMediaBackend(kind, file);
      return url;
    } catch (err) {
      setError(err instanceof GommoApiError || err instanceof Error ? err.message : String(err));
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
    if ((!client && !useBackend) || !currentModel || !schema) {
      setError('Chọn model trước.');
      return;
    }
    if (useBackend && !BACKEND_JOB_TYPES.includes(jobType)) {
      setError('Loại job này cần đăng nhập bằng Access Token.');
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
      domain: auth?.domain,
      projectId: auth?.projectId,
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
      const finalUrl = client
        ? await generateViaGommo(slug, payload)
        : await generateViaBackend(slug, payload);

      if (finalUrl) {
        setResultUrl(finalUrl);
        setProgress('Hoàn tất!');
        updateLocalJob(localId, { status: 'success', result_url: finalUrl });
        recordSuccess(finalUrl, slug);
        await refreshCreditsAfterJob();
      } else {
        const errMsg = 'Job thất bại';
        setError(errMsg);
        updateLocalJob(localId, { status: 'failed', error: errMsg });
        await refreshCreditsAfterJob();
      }

      loadRecentJobs();
    } catch (err) {
      const msg = err instanceof GommoApiError || err instanceof Error ? err.message : String(err);
      setError(msg);
      updateLocalJob(localId, { status: 'failed', error: msg });
      await refreshCreditsAfterJob();
      loadRecentJobs();
    } finally {
      setSubmitting(false);
    }
  }

  async function refreshCreditsAfterJob() {
    if (client) {
      try {
        const refreshed = await refreshSession();
        setCredits(refreshed.upstream_me.balancesInfo?.credits_ai ?? credits);
      } catch {
        /* ignore */
      }
    } else {
      // Backend tự cập nhật balance vào session sau create/poll.
      setCredits(getCreditsAi());
    }
    notifyCreditsUpdated();
  }

  async function generateViaGommo(
    slug: string,
    payload: Record<string, unknown>,
  ): Promise<string | null> {
    const { pollResult, resultUrl: url, createEnvelope } = await createJobAndPoll(
      client!,
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
      abortRef.current!.signal,
    );

    const snap = extractPollSnapshot(createEnvelope as Parameters<typeof extractPollSnapshot>[0]);
    const finalUrl = url ?? snap.resultUrl;
    if (finalUrl) return finalUrl;
    throw new Error(pollResult?.error || 'Job thất bại');
  }

  async function generateViaBackend(
    slug: string,
    payload: Record<string, unknown>,
  ): Promise<string | null> {
    setProgress('Đang gửi request tạo job…');
    const created = await createStudioJob({
      type: jobType,
      model_id: slug,
      payload,
    });

    setProgress('Đang xử lý…');
    const job = await pollJobUntilDone(
      created.job.id,
      (j) => setProgress(`Trạng thái: ${j.status}`),
      abortRef.current!.signal,
    );

    if (job.status === 'success' && job.result_url) return job.result_url;
    throw new Error(job.error || 'Job thất bại');
  }

  const processingJobs = recentJobs.filter((j) => j.type === jobType && j.status === 'processing');

  function switchJobType(type: JobType) {
    setJobType(type);
    setSelectedSlug('');
    setSchema(null);
    setResultUrl(null);
    setSelections(defaultSelectionsForType(type));
  }

  async function handleDropFile(file: File) {
    const url = await handleUpload(file, 'image');
    if (!url) return;
    if (schema?.fields.references) updateUrlList('references', 0, url);
    else if (schema?.fields.subjects) updateUrlList('subjects', 0, url);
    else if (schema?.fields.startFrame) updateUrlList('images', 0, url);
    setUploadedPreview(url);
  }

  const composerResults = useMemo(
    () => listHistory(jobTypeToHistoryType(jobType)),
    [jobType, historyTick, resultUrl],
  );

  const favorites = useMemo(() => loadFavorites(), [historyTick]);

  const displayedResults = useMemo(() => {
    if (mainTab === 'current') {
      return composerResults.filter(
        (e) => new Date(e.createdAt).getTime() >= sessionStartRef.current,
      );
    }
    if (mainTab === 'folder') return composerResults.filter((e) => favorites.has(e.id));
    return composerResults;
  }, [mainTab, composerResults, favorites]);

  const groupedResults = useMemo(() => {
    const map = new Map<string, HistoryEntry[]>();
    for (const e of displayedResults) {
      const day = dateGroupLabel(e.createdAt);
      const list = map.get(day);
      if (list) list.push(e);
      else map.set(day, [e]);
    }
    return [...map.entries()];
  }, [displayedResults]);

  const visibleIds = useMemo(() => displayedResults.map((e) => e.id), [displayedResults]);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  // Bỏ chọn các id không còn hiển thị (đổi tab/loại job).
  useEffect(() => {
    setSelectedIds((prev) => {
      if (!prev.size) return prev;
      const visible = new Set(visibleIds);
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [visibleIds]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds(allSelected ? new Set() : new Set(visibleIds));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function downloadSelected() {
    for (const id of selectedIds) {
      const entry = displayedResults.find((e) => e.id === id);
      if (!entry?.resultUrl) continue;
      const a = document.createElement('a');
      a.href = entry.resultUrl;
      a.target = '_blank';
      a.rel = 'noreferrer';
      a.download = '';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  }

  function deleteSelected() {
    for (const id of selectedIds) removeHistoryEntry(id);
    clearSelection();
  }

  if (layout === 'composer') {
    return (
      <div className="studio-composer">
        <aside className="composer-side">
          <div className="composer-side-head">
            <button type="button" className="composer-back" aria-label="Quay lại">
              <ChevronLeft size={16} />
            </button>
            <span className="composer-title">Tạo {jobTypeLabel(jobType)}</span>
          </div>

          <div className="composer-mode-tabs">
            <button
              type="button"
              className={composerMode === 'single' ? 'active' : ''}
              onClick={() => setComposerMode('single')}
            >
              Đơn
            </button>
            <button
              type="button"
              className={composerMode === 'auto' ? 'active' : ''}
              onClick={() => setComposerMode('auto')}
            >
              <Sparkles size={13} />
              Auto Mode
            </button>
          </div>

          <div className="composer-field">
            <div className="composer-label-row">
              <span className="composer-label">Model</span>
              <label className="composer-toggle">
                <input
                  type="checkbox"
                  checked={multiModel}
                  onChange={(e) => setMultiModel(e.target.checked)}
                />
                <span>Đa model</span>
              </label>
            </div>
            <ModelPicker
              models={models}
              value={selectedSlug}
              onChange={setSelectedSlug}
              loading={loadingModels}
            />
          </div>

          {schema &&
            (schema.fields.ratio ||
              schema.fields.mode ||
              schema.fields.resolution ||
              schema.fields.duration) && (
            <div className="composer-selectors">
              {schema.fields.ratio && (
                <div className="composer-mini-field">
                  <span className="composer-label">Tỉ lệ</span>
                  <OptionDropdown
                    icon={<Proportions size={14} />}
                    options={schema.options.ratios}
                    value={selections.ratio || ''}
                    onChange={(v) => updateSelection('ratio', v)}
                  />
                </div>
              )}
              {schema.fields.mode && (
                <div className="composer-mini-field">
                  <span className="composer-label">Chế độ</span>
                  <OptionDropdown
                    icon={<SlidersHorizontal size={14} />}
                    options={schema.options.modes}
                    value={selections.mode || ''}
                    onChange={(v) => updateSelection('mode', v)}
                  />
                </div>
              )}
              {schema.fields.resolution && (
                <div className="composer-mini-field">
                  <span className="composer-label">Phân giải</span>
                  <OptionDropdown
                    icon={<Monitor size={14} />}
                    options={schema.options.resolutions}
                    value={selections.resolution || ''}
                    onChange={(v) => updateSelection('resolution', v)}
                  />
                </div>
              )}
              {schema.fields.duration && (
                <div className="composer-mini-field">
                  <span className="composer-label">Thời lượng</span>
                  <OptionDropdown
                    icon={<Clock size={14} />}
                    options={schema.options.durations}
                    value={selections.duration || ''}
                    onChange={(v) => updateSelection('duration', v)}
                  />
                </div>
              )}
            </div>
          )}

          {(schema?.fields.references || schema?.fields.subjects || schema?.fields.startFrame) && (
            <>
              <label
                className={`composer-dropzone ${dragOver ? 'drag' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) void handleDropFile(file);
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleDropFile(file);
                  }}
                />
                {uploadedPreview ? (
                  <img className="composer-dropzone-preview" src={uploadedPreview} alt="upload" />
                ) : (
                  <>
                    <span className="composer-dropzone-plus">
                      <Plus size={18} />
                    </span>
                    <span className="composer-dropzone-text">Nhấp / Kéo thả / Dán</span>
                    <span className="composer-dropzone-hint">
                      Hỗ trợ JPG / PNG tối đa 10MB, kích thước tối thiểu 300px
                    </span>
                  </>
                )}
              </label>

              <div className="composer-label-row composer-ref-row">
                <span className="composer-label">
                  {schema?.fields.references
                    ? 'Ảnh tham chiếu'
                    : schema?.fields.subjects
                      ? 'Nhân vật (subject)'
                      : schema?.fields.endFrame
                        ? 'Ảnh đầu (start frame)'
                        : 'Ảnh nguồn'}
                </span>
                <span className="composer-ref-count">
                  {uploadedPreview ? 1 : 0}/
                  {schema?.fields.references
                    ? schema.limits.maxReference || 5
                    : schema?.fields.subjects
                      ? schema.limits.maxSubject || 1
                      : 1}
                </span>
              </div>
            </>
          )}

          {schema?.fields.endFrame && (
            <UrlField
              label="Ảnh cuối (end frame)"
              value={selections.images?.[1] || ''}
              onChange={(v) => updateUrlList('images', 1, v)}
              onUpload={async (f) => {
                const uploaded = await handleUpload(f, 'image');
                if (uploaded) updateUrlList('images', 1, uploaded);
              }}
            />
          )}

          {schema?.fields.references && schema?.fields.subjects && (
            <UrlField
              label={`Nhân vật (subject, tối đa ${schema.limits.maxSubject})`}
              value={selections.subjects?.[0] || ''}
              onChange={(v) => updateUrlList('subjects', 0, v)}
              onUpload={async (f) => {
                const uploaded = await handleUpload(f, 'image');
                if (uploaded) updateUrlList('subjects', 0, uploaded);
              }}
            />
          )}

          {schema?.fields.text && (
            <div className="composer-field">
              <div className="composer-label-row">
                <span className="composer-label">Văn bản (TTS)</span>
                <div className="composer-desc-tools">
                  <button type="button" aria-label="Xóa" onClick={() => updateSelection('text', '')}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <textarea
                className="composer-textarea"
                rows={4}
                placeholder="Nhập văn bản cần chuyển thành giọng nói…"
                value={selections.text || ''}
                onChange={(e) => updateSelection('text', e.target.value)}
              />
            </div>
          )}

          {schema?.fields.musicName && (
            <div className="composer-field">
              <span className="composer-label">Tên bài hát</span>
              <input
                className="composer-select"
                placeholder="Tên bài hát…"
                value={selections.name || ''}
                onChange={(e) => updateSelection('name', e.target.value)}
              />
            </div>
          )}

          {schema?.fields.prompt && (
            <div className="composer-field">
              <div className="composer-label-row">
                <span className="composer-label">
                  {schema.fields.musicName ? 'Phong cách / mô tả' : 'Mô tả'}
                </span>
                <div className="composer-desc-tools">
                  <button
                    type="button"
                    aria-label="Xóa mô tả"
                    onClick={() => updateSelection('prompt', '')}
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label="Dán"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) updateSelection('prompt', text);
                      } catch {
                        /* ignore */
                      }
                    }}
                  >
                    <Clipboard size={14} />
                  </button>
                  <button type="button" aria-label="Mở rộng">
                    <Maximize2 size={14} />
                  </button>
                  <button type="button" className="composer-enhance">
                    <Sparkles size={13} />
                    Nâng cao
                  </button>
                </div>
              </div>
              <textarea
                className="composer-textarea"
                rows={4}
                placeholder={
                  schema.fields.musicName ? 'Mô tả phong cách nhạc…' : 'Mô tả nội dung của bạn…'
                }
                value={selections.prompt || ''}
                onChange={(e) => updateSelection('prompt', e.target.value)}
              />
            </div>
          )}

          <div className="composer-cost">
            <span className="composer-coin">
              <Sparkles size={13} /> {composerCost || 0}
            </span>
            <div className="composer-qty">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
              <span>{qty}</span>
              <button type="button" onClick={() => setQty((q) => Math.min(8, q + 1))}>+</button>
            </div>
            <span className="composer-total">
              <Sparkles size={13} /> {(composerCost || 0) * qty}
            </span>
          </div>

          {error && <p className="error composer-error">{error}</p>}
          {progress && <p className="progress composer-progress">{progress}</p>}

          <button
            type="button"
            className="composer-submit"
            disabled={submitting || !schema}
            onClick={(e) => void handleSubmit(e as unknown as FormEvent)}
          >
            <Wand2 size={16} />
            {submitting ? 'Đang tạo…' : `Tạo ${jobTypeLabel(jobType)}`}
          </button>
        </aside>

        <section className="composer-main">
          <div className="composer-toolbar">
            <div className="composer-toolbar-tabs">
              {([
                ['current', 'Hiện tại'],
                ['history', 'Lịch sử'],
                ['folder', 'Thư viện'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={mainTab === key ? 'active' : ''}
                  onClick={() => setMainTab(key)}
                >
                  {label}
                </button>
              ))}
              <span className="composer-toolbar-count">{displayedResults.length} tệp</span>
            </div>
            <div className="composer-toolbar-right">
              <label className="composer-select-all">
                <input
                  type="checkbox"
                  checked={allSelected}
                  disabled={!visibleIds.length}
                  onChange={toggleSelectAll}
                />
                <span>Chọn tất cả các tệp</span>
              </label>
              <label className="composer-zoom">
                <input
                  type="range"
                  min={160}
                  max={320}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                />
              </label>
            </div>
          </div>

          {selectedIds.size > 0 && (
            <div className="composer-batchbar">
              <span className="composer-batch-count">Đã chọn {selectedIds.size}</span>
              <div className="composer-batch-actions">
                {jobType === 'image' && (
                  <button
                    type="button"
                    onClick={() => {
                      switchJobType('video');
                      clearSelection();
                    }}
                  >
                    <Clapperboard size={14} /> Tạo video auto mode
                  </button>
                )}
                <button type="button" onClick={downloadSelected}>
                  <Download size={14} /> Download
                </button>
                <button type="button" className="danger" onClick={deleteSelected}>
                  <Trash2 size={14} /> Xóa
                </button>
              </div>
              <button type="button" className="composer-batch-clear" onClick={clearSelection}>
                Bỏ chọn
              </button>
            </div>
          )}

          {displayedResults.length === 0 ? (
            <p className="muted composer-empty">
              {mainTab === 'folder'
                ? 'Chưa có tệp nào được lưu vào thư viện.'
                : `Chưa có kết quả. Tạo ${jobTypeLabel(jobType)} đầu tiên ở cột bên trái.`}
            </p>
          ) : (
            <div className="composer-results">
              {groupedResults.map(([day, entries]) => (
                <div key={day} className="composer-day-group">
                  <h3 className="composer-day">{day}</h3>
                  <div
                    className="composer-grid"
                    style={{ ['--thumb' as string]: `${zoom}px` }}
                  >
                    {entries.map((entry) => {
                      const kind = isMediaUrl(entry.resultUrl, entry.type);
                      const selected = selectedIds.has(entry.id);
                      const faved = favorites.has(entry.id);
                      return (
                        <article
                          key={entry.id}
                          className={`hist-card ${selected ? 'selected' : ''}`}
                        >
                          <div className="hist-card-thumb-wrap">
                            <label
                              className="hist-card-check"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleSelect(entry.id)}
                              />
                            </label>
                            <button
                              type="button"
                              className={`hist-card-fav ${faved ? 'active' : ''}`}
                              aria-label={faved ? 'Bỏ lưu' : 'Lưu vào thư viện'}
                              onClick={() => toggleFavorite(entry.id)}
                            >
                              <Star size={15} fill={faved ? 'currentColor' : 'none'} />
                            </button>
                            <a
                              className="hist-card-thumb"
                              href={entry.resultUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {kind === 'image' && (
                                <img src={entry.resultUrl} alt="" loading="lazy" />
                              )}
                              {kind === 'video' && (
                                <video src={entry.resultUrl} muted playsInline preload="metadata" />
                              )}
                              {kind === 'audio' && <span className="hist-card-icon">🔊</span>}
                              {kind === 'file' && <span className="hist-card-icon">📄</span>}
                            </a>
                            <div className="hist-card-overlay">
                              <button type="button" onClick={() => applyReuse(entry)}>
                                Dùng lại
                              </button>
                              <a href={entry.resultUrl} target="_blank" rel="noreferrer" download>
                                Tải
                              </a>
                              <button
                                type="button"
                                className="danger"
                                onClick={() => removeHistoryEntry(entry.id)}
                              >
                                Xóa
                              </button>
                            </div>
                          </div>
                          <div className="hist-card-body">
                            <p className="hist-card-prompt" title={entry.prompt}>
                              {entry.prompt || '—'}
                            </p>
                            <p className="hist-card-meta">
                              {entry.modelName || entry.modelSlug || '—'}
                              {' · '}
                              {new Date(entry.createdAt).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <p className="kicker">AI Studio</p>
        <h1>Tạo {jobTypeLabel(jobType)}</h1>
        <p className="lead">
          {useBackend ? (
            <>Credit khả dụng: <strong>{credits.toLocaleString('vi-VN')}</strong></>
          ) : (
            <>
              Gọi thẳng <strong>v2.api.gommo.net</strong> — credit upstream:{' '}
              <strong>{credits.toLocaleString('vi-VN')}</strong>
            </>
          )}
          {unitCost > 0 && <> · Chi phí ~{unitCost} credit</>}
        </p>
      </div>

      {!lockType && (
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
      )}

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
