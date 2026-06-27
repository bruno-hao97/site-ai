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
import ComposerHistory from '../components/ComposerHistory';
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

interface PendingJob {
  id: string;
  prompt: string;
  status: 'processing' | 'failed';
}

function dateGroupLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Hôm nay';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Hôm qua';
  return `Tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;
}

// Map server (field upstream) -> tên nhà cung cấp + phụ đề hiển thị, giống 79AI.
const SERVER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  grokai: 'Grok AI',
  google_veo: 'Google',
  midjourneyai: 'Midjourney AI',
  seedream_ai: 'Seedream',
  klingai: 'Kling AI',
  autoai: 'Auto AI',
  alibabaai: 'Alibaba AI',
  dreamina_ai: 'Dreamina',
};

const SERVER_SUBTITLES: Record<string, string> = {
  OpenAI: 'Image generation',
  'Grok AI': 'Professional AI generation',
  Google: 'Precision Visuals with AI',
  'Midjourney AI': 'Professional AI generation',
  Seedream: 'Professional AI generation',
  'Kling AI': 'Professional AI generation',
  'Auto AI': 'Professional AI generation',
  'Alibaba AI': 'Professional AI generation',
  Dreamina: 'Professional AI generation',
};

// Thứ tự hiển thị nhà cung cấp (giống 79AI). Provider ngoài danh sách xếp cuối.
const PROVIDER_ORDER = [
  'OpenAI',
  'Grok AI',
  'Google',
  'Midjourney AI',
  'Seedream',
  'Kling AI',
  'Auto AI',
  'Alibaba AI',
  'Dreamina',
];

// Nhóm model theo nhà cung cấp. Ưu tiên field `server` từ API; nếu không có thì
// fallback các field group/company/... rồi mới đoán theo tên model.
function modelProvider(m: GommoModel): string {
  const server = (m.server || '').trim().toLowerCase();
  if (server && SERVER_LABELS[server]) return SERVER_LABELS[server];

  const raw = m as unknown as Record<string, unknown>;
  for (const key of ['group', 'company', 'provider', 'brand', 'vendor']) {
    const v = raw[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  const n = (m.name || modelSlug(m)).toLowerCase();
  if (/\bgpt\b|dall-?e|openai|sora/.test(n)) return 'OpenAI';
  if (/gemini|nano\s*banana|imagen|veo|google/.test(n)) return 'Google';
  if (/grok|xai/.test(n)) return 'Grok AI';
  if (/kling|colors/.test(n)) return 'Kling AI';
  if (/seedream|seedance/.test(n)) return 'Seedream';
  if (/dreamina|capcut/.test(n)) return 'Dreamina';
  if (/qwen|wan|alibaba|tongyi|z-?image/.test(n)) return 'Alibaba AI';
  if (/midjourney|\bmj\b/.test(n)) return 'Midjourney AI';
  if (/upscale|auto\s*ai/.test(n)) return 'Auto AI';
  if (/flux|black\s*forest/.test(n)) return 'Black Forest Labs';
  if (/runway|gen-?\d/.test(n)) return 'Runway';
  if (/luma|dream\s*machine/.test(n)) return 'Luma';
  if (/stable|sdxl|stability/.test(n)) return 'Stability AI';
  if (/minimax|hailuo/.test(n)) return 'MiniMax';
  if (/elevenlabs|eleven\s*labs/.test(n)) return 'ElevenLabs';
  if (/suno/.test(n)) return 'Suno';
  return 'Khác';
}

function providerSubtitle(provider: string): string {
  return SERVER_SUBTITLES[provider] ?? 'Professional AI generation';
}

function formatPrice(price: number): string {
  return price.toLocaleString('vi-VN');
}

// Khoảng giá min–max của model: ưu tiên mảng prices[] (theo mode/resolution),
// fallback về price gốc. Trả về chuỗi "min-max" hoặc "x" nếu chỉ 1 mức.
function modelPriceLabel(m: GommoModel): string {
  const values: number[] = [];
  if (Array.isArray(m.prices)) {
    for (const p of m.prices) {
      if (typeof p?.price === 'number' && p.price > 0) values.push(p.price);
    }
  }
  if (values.length === 0 && typeof m.price === 'number') values.push(m.price);
  if (values.length === 0) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? formatPrice(min) : `${formatPrice(min)}-${formatPrice(max)}`;
}

// Giá thực tế theo tổ hợp mode + resolution đang chọn. Xử lý mọi dạng prices[]:
// có cả mode+resolution, chỉ resolution (Kling), hoặc chỉ mode (Midjourney 7.0).
function resolveModelPrice(
  model: GommoModel | null,
  mode: string,
  resolution: string,
): number {
  if (!model) return 0;
  const prices = model.prices;
  if (!Array.isArray(prices) || prices.length === 0) return model.price ?? 0;
  const eq = (a?: string, b?: string) => (a ?? '').toLowerCase() === (b ?? '').toLowerCase();

  const hit =
    prices.find((p) => eq(p.mode, mode) && eq(p.resolution, resolution)) ??
    prices.find((p) => p.mode == null && eq(p.resolution, resolution)) ??
    prices.find((p) => p.resolution == null && eq(p.mode, mode)) ??
    prices.find((p) => eq(p.resolution, resolution)) ??
    prices.find((p) => eq(p.mode, mode));
  return hit?.price ?? model.price ?? prices[0]?.price ?? 0;
}

function isModelMaintenance(m: GommoModel): boolean {
  const s = String(m.status || 'ON').toUpperCase();
  return s !== 'ON' && s !== 'ACTIVE';
}

// NEW = model nằm trong đợt phát hành mới nhất (created_time trong vòng 30 ngày
// so với model mới nhất của danh sách). Robust với clock tuyệt đối.
function buildNewModelChecker(models: GommoModel[]): (m: GommoModel) => boolean {
  let newest = 0;
  for (const m of models) {
    if (typeof m.created_time === 'number' && m.created_time > newest) newest = m.created_time;
  }
  const threshold = newest - 30 * 24 * 60 * 60;
  return (m: GommoModel) =>
    newest > 0 && typeof m.created_time === 'number' && m.created_time >= threshold;
}

function modelOnSale(m: GommoModel): boolean {
  const raw = m as unknown as Record<string, unknown>;
  for (const key of ['sale', 'on_sale', 'discount', 'is_sale']) {
    const v = raw[key];
    if (typeof v === 'boolean' && v) return true;
    if (typeof v === 'number' && v > 0) return true;
  }
  return false;
}

const RECENT_MODELS_KEY = 'studio:recent-models';

function loadRecentModelSlugs(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_MODELS_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.filter((s): s is string => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

function pushRecentModelSlug(slug: string): void {
  if (!slug) return;
  try {
    const list = [slug, ...loadRecentModelSlugs().filter((s) => s !== slug)].slice(0, 6);
    localStorage.setItem(RECENT_MODELS_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
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
    const maxHeight = Math.max(200, Math.min(560, (placeUp ? spaceAbove : spaceBelow) - gap));
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
  // Panel có thể rộng hơn trigger do min-width (option 180 / model 320). Clamp mép
  // trái để không tràn khỏi viewport bên phải.
  const effectiveWidth = Math.max(pos.width, 320);
  const left = Math.max(8, Math.min(pos.left, window.innerWidth - effectiveWidth - 8));
  return {
    position: 'fixed',
    left,
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
  const [tab, setTab] = useState<'new' | 'sale'>('new');
  const [recent, setRecent] = useState<string[]>([]);
  const { triggerRef, panelRef, pos } = useAnchoredDropdown(open, setOpen);

  const current = models.find((m) => modelSlug(m) === value) ?? null;

  useEffect(() => {
    if (open) setRecent(loadRecentModelSlugs());
  }, [open]);

  const isNew = useMemo(() => buildNewModelChecker(models), [models]);
  const hasSale = useMemo(() => models.some(modelOnSale), [models]);

  const select = (slug: string) => {
    pushRecentModelSlug(slug);
    onChange(slug);
    setOpen(false);
    setSearch('');
  };

  const renderItem = (m: GommoModel) => {
    const slug = modelSlug(m);
    const active = slug === value;
    const priceLabel = modelPriceLabel(m);
    const maint = isModelMaintenance(m);
    return (
      <button
        key={slug}
        type="button"
        className={`model-picker-item ${active ? 'active' : ''}`}
        onClick={() => select(slug)}
      >
        <span className="model-picker-item-main">
          <span className="model-picker-item-head">
            <span className="model-picker-item-name">{m.name || slug}</span>
            {isNew(m) && <span className="model-picker-badge new">NEW</span>}
            {maint && <span className="model-picker-badge maint">MAINT</span>}
          </span>
          {m.description && (
            <span className="model-picker-item-desc">{m.description}</span>
          )}
        </span>
        <span className="model-picker-item-meta">
          {priceLabel && <span className="model-picker-item-price">{priceLabel}</span>}
          {active && <Check size={14} className="model-picker-check" />}
        </span>
      </button>
    );
  };

  // Lọc theo search.
  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      models.filter((m) => {
        if (!q) return true;
        return `${m.name ?? ''} ${modelSlug(m)} ${m.description ?? ''}`
          .toLowerCase()
          .includes(q);
      }),
    [models, q],
  );

  // Nguồn theo tab (chỉ áp dụng khi không search).
  const tabModels = useMemo(() => {
    if (q || tab === 'new') return filtered;
    return filtered.filter(modelOnSale);
  }, [filtered, tab, q]);

  // Nhóm theo nhà cung cấp + sắp xếp theo PROVIDER_ORDER.
  const grouped = useMemo(() => {
    const map = new Map<string, GommoModel[]>();
    for (const m of tabModels) {
      const g = modelProvider(m);
      const list = map.get(g);
      if (list) list.push(m);
      else map.set(g, [m]);
    }
    return [...map.entries()].sort((a, b) => {
      const ia = PROVIDER_ORDER.indexOf(a[0]);
      const ib = PROVIDER_ORDER.indexOf(b[0]);
      const ra = ia === -1 ? PROVIDER_ORDER.length : ia;
      const rb = ib === -1 ? PROVIDER_ORDER.length : ib;
      if (ra !== rb) return ra - rb;
      return a[0].localeCompare(b[0]);
    });
  }, [tabModels]);

  const recentModels = useMemo(() => {
    if (q || tab !== 'new') return [];
    const bySlug = new Map(models.map((m) => [modelSlug(m), m] as const));
    return recent
      .map((s) => bySlug.get(s))
      .filter((m): m is GommoModel => Boolean(m))
      .slice(0, 4);
  }, [recent, models, q, tab]);

  const totalShown = tabModels.length;
  const panelStyle = anchoredPanelStyle(pos);
  const triggerPrice = current ? modelPriceLabel(current) : '';

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
        {triggerPrice && <span className="model-picker-price">{triggerPrice}</span>}
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
                placeholder="Tìm kiếm…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {!q && hasSale && (
              <div className="model-picker-tabs">
                <button
                  type="button"
                  className={`model-picker-tab ${tab === 'new' ? 'active' : ''}`}
                  onClick={() => setTab('new')}
                >
                  Mới
                </button>
                <button
                  type="button"
                  className={`model-picker-tab ${tab === 'sale' ? 'active' : ''}`}
                  onClick={() => setTab('sale')}
                >
                  Sale
                </button>
              </div>
            )}

            <div className="model-picker-list">
              {totalShown === 0 && (
                <div className="model-picker-empty">Không có model phù hợp</div>
              )}

              {recentModels.length > 0 && (
                <div className="model-picker-group">
                  <div className="model-picker-group-head">Gần đây</div>
                  {recentModels.map(renderItem)}
                </div>
              )}

              {grouped.map(([provider, list]) => (
                <div key={provider} className="model-picker-group">
                  <div className="model-picker-group-head model-picker-provider-head">
                    <span className="model-picker-provider-name">{provider}</span>
                    <span className="model-picker-provider-sub">
                      {providerSubtitle(provider)}
                    </span>
                  </div>
                  {list.map(renderItem)}
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
  const [multiPrompt, setMultiPrompt] = useState(false);
  const [promptSeparator, setPromptSeparator] = useState('=====');
  const [perPromptRef, setPerPromptRef] = useState(false);
  const [refSelectMode, setRefSelectMode] = useState<'fixed' | 'sequential' | 'random'>('sequential');
  const [concurrencyLimit, setConcurrencyLimit] = useState(2);
  const [multiRefs, setMultiRefs] = useState<string[]>([]);
  const [pendingJobs, setPendingJobs] = useState<PendingJob[]>([]);
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
  // Composer hiển thị giá động theo mode + resolution đang chọn (khớp 79AI);
  // fallback về unitCost nếu model chưa có bảng giá.
  const composerCost = useMemo(
    () => resolveModelPrice(currentModel, selections.mode || '', selections.resolution || '') || unitCost,
    [currentModel, selections.mode, selections.resolution, unitCost],
  );

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

  // Luôn chọn sẵn 1 model khi vào trang / đổi loại job (giống 79AI): ưu tiên model
  // dùng gần đây còn khả dụng, rồi tới model đầu tiên đang ON.
  useEffect(() => {
    if (!models.length) return;
    if (selectedSlug && models.some((m) => modelSlug(m) === selectedSlug)) return;
    const bySlug = new Map(models.map((m) => [modelSlug(m), m] as const));
    const recent = loadRecentModelSlugs()
      .map((s) => bySlug.get(s))
      .find((m) => m && !isModelMaintenance(m));
    const fallback = models.find((m) => !isModelMaintenance(m)) ?? models[0];
    const pick = recent ?? fallback;
    if (pick) setSelectedSlug(modelSlug(pick));
  }, [models, selectedSlug]);

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

  function recordSuccess(url: string, slug: string, promptOverride?: string) {
    const prompt = promptOverride ?? historyPromptFromSelections(jobType, selections);
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

  // Chạy 1 job với prompt riêng (dùng cho cả tạo đơn và batch multi-prompt).
  // refUrl (nếu có) ghi đè ảnh tham chiếu cho riêng prompt này.
  async function runOneJob(
    slug: string,
    prompt: string,
    pendingId: string,
    refUrl?: string,
  ): Promise<boolean> {
    const runSelections = { ...selections, prompt };
    if (refUrl) {
      if (schema?.fields.references) runSelections.references = [refUrl];
      else if (schema?.fields.subjects) runSelections.subjects = [refUrl];
      else runSelections.images = [refUrl];
    }
    const { payload } = buildJobPayload(currentModel!, jobType, runSelections, {
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
        updateLocalJob(localId, { status: 'success', result_url: finalUrl });
        recordSuccess(finalUrl, slug, prompt);
        setPendingJobs((prev) => prev.filter((p) => p.id !== pendingId));
        loadRecentJobs();
        return true;
      }
      const errMsg = 'Job thất bại';
      setError(errMsg);
      updateLocalJob(localId, { status: 'failed', error: errMsg });
      setPendingJobs((prev) =>
        prev.map((p) => (p.id === pendingId ? { ...p, status: 'failed' } : p)),
      );
      loadRecentJobs();
      return false;
    } catch (err) {
      const msg = err instanceof GommoApiError || err instanceof Error ? err.message : String(err);
      setError(msg);
      updateLocalJob(localId, { status: 'failed', error: msg });
      setPendingJobs((prev) =>
        prev.map((p) => (p.id === pendingId ? { ...p, status: 'failed' } : p)),
      );
      loadRecentJobs();
      return false;
    }
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

    const batchType = jobType === 'image' || jobType === 'video';
    const useMultiPrompt = composerMode === 'auto' && multiPrompt && batchType;
    const basePrompt = selections.prompt || '';

    // Danh sách prompt cần tạo: multi-prompt tách theo ký tự phân cách (mỗi prompt 1 ảnh);
    // ngược lại lặp theo số lượng (qty) cho image/video, các loại khác giữ 1 job.
    let prompts: string[];
    if (useMultiPrompt) {
      const sep = promptSeparator.trim() || '=====';
      const escaped = sep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      prompts = basePrompt
        .split(new RegExp(escaped))
        .map((p) => p.trim())
        .filter(Boolean);
      if (prompts.length === 0) {
        setError(`Nhập ít nhất 1 prompt (mỗi prompt cách nhau bằng ${sep}).`);
        return;
      }
    } else {
      prompts = batchType ? Array.from({ length: qty }, () => basePrompt) : [basePrompt];
    }

    // Gán ảnh tham chiếu cho từng prompt theo quy cách chọn (chỉ khi bật multi-prompt
    // + "mỗi prompt 1 tham chiếu" + có ảnh trong multiRefs).
    const refForIndex = (i: number): string | undefined => {
      if (!useMultiPrompt || !perPromptRef || multiRefs.length === 0) return undefined;
      if (refSelectMode === 'fixed') return multiRefs[0];
      if (refSelectMode === 'random') {
        return multiRefs[Math.floor(Math.random() * multiRefs.length)];
      }
      return multiRefs[i % multiRefs.length];
    };

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setSubmitting(true);
    setError('');
    setProgress('Đang tạo job…');
    setResultUrl(null);

    const slug = modelSlug(currentModel);
    const newPending: PendingJob[] = prompts.map((prompt) => ({
      id: crypto.randomUUID(),
      prompt,
      status: 'processing',
    }));
    // Bỏ các thẻ lỗi cũ, thêm thẻ đang tạo của lần này lên đầu.
    setPendingJobs((prev) => [...newPending, ...prev.filter((p) => p.status === 'processing')]);

    try {
      // Pool giới hạn luồng: chạy tối đa `limit` job cùng lúc.
      const limit = Math.max(1, Math.min(concurrencyLimit, prompts.length));
      let cursor = 0;
      const worker = async () => {
        while (cursor < prompts.length) {
          const i = cursor++;
          await runOneJob(slug, prompts[i], newPending[i].id, refForIndex(i));
        }
      };
      await Promise.all(Array.from({ length: limit }, () => worker()));
      setProgress('Hoàn tất!');
      await refreshCreditsAfterJob();
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
    setPendingJobs([]);
    setMultiRefs([]);
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

          {composerMode === 'auto' && (jobType === 'image' || jobType === 'video') && (
            <div className="composer-multiprompt">
              <label className="composer-switch-row">
                <span className="composer-switch-text">
                  <Sparkles size={14} />
                  <span>
                    <strong>Multi-Prompt</strong>
                    <small>Tạo ảnh từ nhiều prompt con trong 1 prompt tổng.</small>
                  </span>
                </span>
                <span className={`composer-switch ${multiPrompt ? 'on' : ''}`}>
                  <input
                    type="checkbox"
                    checked={multiPrompt}
                    onChange={(e) => setMultiPrompt(e.target.checked)}
                  />
                  <span className="composer-switch-knob" />
                </span>
              </label>

              {multiPrompt && (
                <div className="composer-multiprompt-body">
                  <div className="composer-mp-field">
                    <span className="composer-label">Ký tự phân cách Prompt</span>
                    <div className="composer-segment">
                      {['=====', '###', '---', '@@@'].map((sep) => (
                        <button
                          key={sep}
                          type="button"
                          className={promptSeparator === sep ? 'active' : ''}
                          onClick={() => setPromptSeparator(sep)}
                        >
                          {sep}
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="composer-mp-hint">
                    Mỗi prompt con ở dưới 1 dòng, cách nhau bằng{' '}
                    <code>{promptSeparator}</code>. Mỗi prompt tạo 1{' '}
                    {jobTypeLabel(jobType).toLowerCase()}.
                  </p>

                  <label className="composer-switch-row">
                    <span className="composer-switch-text">
                      <span>
                        <strong>Mỗi prompt 1 tham chiếu</strong>
                        <small>Chỉ dùng 1 ảnh tham chiếu cho mỗi prompt.</small>
                      </span>
                    </span>
                    <span className={`composer-switch ${perPromptRef ? 'on' : ''}`}>
                      <input
                        type="checkbox"
                        checked={perPromptRef}
                        onChange={(e) => setPerPromptRef(e.target.checked)}
                      />
                      <span className="composer-switch-knob" />
                    </span>
                  </label>

                  {perPromptRef && (
                    <>
                      <div className="composer-mp-field">
                        <span className="composer-label">Quy cách chọn</span>
                        <div className="composer-segment">
                          {([
                            ['fixed', 'Cố định 1'],
                            ['sequential', 'Chọn theo thứ tự'],
                            ['random', 'Chọn ngẫu nhiên'],
                          ] as const).map(([val, label]) => (
                            <button
                              key={val}
                              type="button"
                              className={refSelectMode === val ? 'active' : ''}
                              onClick={() => setRefSelectMode(val)}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="composer-mp-field">
                        <div className="composer-label-row">
                          <span className="composer-label">Ảnh tham chiếu: {multiRefs.length}</span>
                          <label className="composer-mp-addref">
                            <Plus size={13} /> Thêm ảnh
                            <input
                              type="file"
                              accept="image/*"
                              hidden
                              multiple
                              onChange={async (e) => {
                                const files = Array.from(e.target.files || []);
                                e.target.value = '';
                                for (const f of files) {
                                  const url = await handleUpload(f, 'image');
                                  if (url) setMultiRefs((prev) => [...prev, url]);
                                }
                              }}
                            />
                          </label>
                        </div>
                        <div className="composer-mp-refgrid">
                          {multiRefs.map((url, i) => (
                            <div key={`${url}-${i}`} className="composer-mp-refthumb">
                              <img src={url} alt={`ref ${i + 1}`} />
                              <button
                                type="button"
                                aria-label="Xóa ảnh"
                                onClick={() =>
                                  setMultiRefs((prev) => prev.filter((_, idx) => idx !== i))
                                }
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="composer-mp-field">
                    <div className="composer-label-row">
                      <span className="composer-label">Giới hạn luồng tạo</span>
                      <div className="composer-qty">
                        <button
                          type="button"
                          onClick={() => setConcurrencyLimit((n) => Math.max(1, n - 1))}
                        >
                          −
                        </button>
                        <span>{concurrencyLimit}</span>
                        <button
                          type="button"
                          onClick={() => setConcurrencyLimit((n) => Math.min(8, n + 1))}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <p className="composer-mp-hint">Số ảnh tạo cùng lúc (giảm nếu mạng yếu).</p>
                  </div>
                </div>
              )}
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
                rows={multiPrompt && composerMode === 'auto' ? 6 : 4}
                placeholder={
                  multiPrompt && composerMode === 'auto'
                    ? 'Prompt 1\n=====\nPrompt 2\n=====\nPrompt 3'
                    : schema.fields.musicName
                      ? 'Mô tả phong cách nhạc…'
                      : 'Mô tả nội dung của bạn…'
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

          {mainTab === 'history' ? (
            <ComposerHistory jobType={jobType} zoom={zoom} />
          ) : displayedResults.length === 0 && !(mainTab === 'current' && pendingJobs.length > 0) ? (
            <p className="muted composer-empty">
              {mainTab === 'folder'
                ? 'Chưa có tệp nào được lưu vào thư viện.'
                : `Chưa có kết quả. Tạo ${jobTypeLabel(jobType)} đầu tiên ở cột bên trái.`}
            </p>
          ) : (
            <div className="composer-results">
              {mainTab === 'current' && pendingJobs.length > 0 && (
                <div className="composer-day-group">
                  <h3 className="composer-day">Đang tạo</h3>
                  <div className="composer-grid" style={{ ['--thumb' as string]: `${zoom}px` }}>
                    {pendingJobs.map((p) => (
                      <article key={p.id} className={`hist-card hist-card-pending ${p.status}`}>
                        <div className="hist-card-thumb-wrap">
                          <div className="hist-card-thumb pending-thumb">
                            {p.status === 'processing' ? (
                              <span className="pending-spinner" aria-label="Đang tạo" />
                            ) : (
                              <span className="pending-failed-icon">!</span>
                            )}
                          </div>
                        </div>
                        <div className="hist-card-body">
                          <p className="hist-card-prompt" title={p.prompt}>
                            {p.prompt || '—'}
                          </p>
                          <p className="hist-card-meta">
                            {p.status === 'processing' ? 'Đang tạo…' : 'Thất bại'}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}
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
