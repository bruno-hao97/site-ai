import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  Monitor,
  Plus,
  Proportions,
  Search,
  SendHorizontal,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import ComposerMediaPickButton from './ComposerMediaPickButton';
import type { GommoModel, JobType } from '../services/api';
import type { JobSelections, ModelOption, ModelSchema } from '../services/modelSchema';
import {
  mergeSelectionsForSchema,
  modelSlug,
  normalizeComponentSelections,
  pickAllowedOption,
  validateSelectionsForSchema,
} from '../services/modelSchema';
import {
  buildQuickSchema,
  canQuickCreate,
  loadQuickModels,
  quickGenerate,
  uploadQuickImage,
  uploadQuickMedia,
} from '../services/quickCreate';
import { notifyCreditsUpdated } from '../services/authStore';
import { modelPriceRangeLabel, resolveModelPrice } from '../services/modelPricing';
import { isJobAcceptedPendingError } from '../services/jobInfraErrors';
import { HOME_QUICK_MENU, type HomeQuickMenuItem } from '../lib/homeQuickMenu';
import HomeCategoryIcon from './home/HomeCategoryIcon';
import { useLocale } from '../i18n';

const JOB_TYPES: JobType[] = ['video', 'image', 'tts', 'music'];

const MAX_MEDIA = 4;

function typeShortLabel(type: JobType): string {
  switch (type) {
    case 'video':
      return 'VIDEO';
    case 'image':
      return 'ẢNH';
    case 'tts':
      return 'GIỌNG';
    case 'music':
      return 'NHẠC';
    default:
      return type.toUpperCase();
  }
}

function promptPlaceholder(type: JobType): string {
  switch (type) {
    case 'video':
      return 'Mô tả video bạn muốn tạo…';
    case 'image':
      return 'Mô tả ảnh bạn muốn tạo…';
    case 'tts':
      return 'Nhập văn bản cần đọc…';
    case 'music':
      return 'Mô tả phong cách nhạc…';
    default:
      return 'Mô tả nội dung…';
  }
}

function urlMediaKind(url: string): 'image' | 'video' {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url) ? 'video' : 'image';
}

interface MiniDropdownProps {
  icon: React.ReactNode;
  options: ModelOption[];
  value: string;
  onChange: (v: string) => void;
}

function MiniDropdown({ icon, options, value, onChange }: MiniDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const resolved = pickAllowedOption(value, options) ?? options[0]?.value ?? '';
  const current = options.find((o) => o.value === resolved) ?? options[0];

  useEffect(() => {
    if (!options.length) return;
    if (value && options.some((o) => o.value === value)) return;
    const next = pickAllowedOption(value, options);
    if (next && next !== value) onChange(next);
  }, [options, value, onChange]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (!options.length) return null;

  return (
    <div className="qc-mini" ref={ref}>
      <button type="button" className="qc-mini-trigger" onClick={() => setOpen((v) => !v)}>
        {icon}
        <span>{current?.label ?? resolved}</span>
        <ChevronDown size={12} />
      </button>
      {open && (
        <div className="qc-mini-menu">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              className={o.value === resolved ? 'active' : ''}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HomeQuickCreateBar({ variant = 'dock' }: { variant?: 'hero' | 'dock' }) {
  const navigate = useNavigate();
  const { t } = useLocale();
  const isHero = variant === 'hero';
  const [type, setType] = useState<JobType>('video');
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [typeCounts, setTypeCounts] = useState<Partial<Record<JobType, number>>>({});
  const [expanded, setExpanded] = useState(false);
  const [models, setModels] = useState<GommoModel[]>([]);
  const [modelSlugSel, setModelSlugSel] = useState('');
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [refs, setRefs] = useState<string[]>([]);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [qty, setQty] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [result, setResult] = useState<{ url: string; type: JobType } | null>(null);
  const [selections, setSelections] = useState<JobSelections>({});
  const [providerBusy, setProviderBusy] = useState(false);

  const typeRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const currentModel = useMemo(
    () => models.find((m) => modelSlug(m) === modelSlugSel) ?? null,
    [models, modelSlugSel],
  );
  const schema: ModelSchema | null = useMemo(
    () => (currentModel ? buildQuickSchema(currentModel, type) : null),
    [currentModel, type],
  );
  const unitCost = useMemo(() => {
    if (!currentModel) return 0;
    return (
      resolveModelPrice(
        currentModel,
        selections.mode || '',
        selections.resolution || '',
        selections.duration || '',
      ) || (currentModel.price ?? 0)
    );
  }, [currentModel, selections.mode, selections.resolution, selections.duration]);
  const cost = unitCost * qty;

  useEffect(() => {
    let active = true;
    setLoadingModels(true);
    setError('');
    loadQuickModels(type)
      .then((list) => {
        if (!active) return;
        setModels(list);
        setModelSlugSel(list[0] ? modelSlug(list[0]) : '');
      })
      .catch((err) => active && setError(err instanceof Error ? err.message : String(err)))
      .finally(() => active && setLoadingModels(false));
    return () => {
      active = false;
    };
  }, [type]);

  useEffect(() => {
    if (!canQuickCreate()) return;
    let active = true;
    void Promise.all(
      JOB_TYPES.map(async (jobType) => {
        try {
          const list = await loadQuickModels(jobType);
          return [jobType, list.length] as const;
        } catch {
          return [jobType, 0] as const;
        }
      }),
    ).then((rows) => {
      if (active) setTypeCounts(Object.fromEntries(rows));
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!schema) return;
    setSelections((prev) => mergeSelectionsForSchema(prev, schema));
  }, [schema]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (typeRef.current && !typeRef.current.contains(e.target as Node)) setTypeMenuOpen(false);
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) setModelMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (isHero) return;
    document.body.classList.add('qc-dock-active');
    return () => document.body.classList.remove('qc-dock-active');
  }, [isHero]);

  useEffect(() => {
    if (!isHero) return;
    const onType = (e: Event) => {
      const jobType = (e as CustomEvent<JobType>).detail;
      if (jobType) {
        setType(jobType);
        setExpanded(true);
        promptRef.current?.focus();
      }
    };
    window.addEventListener('home-qc:set-type', onType);
    return () => window.removeEventListener('home-qc:set-type', onType);
  }, [isHero]);

  useEffect(() => {
    if (!isHero) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setExpanded(true);
        promptRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isHero]);

  const update = <K extends keyof JobSelections>(key: K, value: JobSelections[K]) =>
    setSelections((s) => ({ ...s, [key]: value }));

  const mediaPickKind = type === 'video' ? 'any' : 'image';

  const ingestMediaUrl = (url: string) => {
    if (refs.length >= MAX_MEDIA) return;
    setError('');
    setRefs((prev) => [...prev, url]);
  };

  const ingestMediaFile = async (file: File) => {
    if (refs.length >= MAX_MEDIA) return;
    setError('');
    setMediaUploading(true);
    try {
      const url =
        type === 'video'
          ? await uploadQuickMedia(file)
          : await uploadQuickImage(file);
      if (!url) return;
      setRefs((prev) => [...prev, url]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setMediaUploading(false);
    }
  };

  const submit = async () => {
    if (submitting || providerBusy) return;
    if (!canQuickCreate()) {
      setError('Bạn cần đăng nhập để tạo nội dung.');
      return;
    }
    if (!currentModel || !schema) {
      setError('Đang tải model, thử lại sau giây lát.');
      return;
    }
    const text = prompt.trim();
    if (!text && refs.length === 0) {
      setError('Nhập mô tả trước khi tạo.');
      return;
    }

    const validationError = validateSelectionsForSchema(selections, schema);
    if (validationError) {
      setError(validationError);
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const sel = normalizeComponentSelections({
      ...selections,
      prompt: type === 'tts' ? selections.prompt : type === 'music' ? '' : text,
      text: type === 'tts' ? text : selections.text,
      name: type === 'music' ? text.slice(0, 60) || 'Quick track' : selections.name,
      style: type === 'music' ? text || 'instrumental pop' : selections.style,
      instrumental: type === 'music' ? true : selections.instrumental,
      ...(refs.length ? { subjects: refs } : {}),
    });

    setSubmitting(true);
    setError('');
    setInfo('');
    setResult(null);
    setProgress('Đang tạo job…');

    try {
      const url = await quickGenerate({
        type,
        model: currentModel,
        selections: sel,
        onProgress: setProgress,
        signal: abortRef.current.signal,
      });
      setResult({ url, type });
      setProgress('');
      setProviderBusy(false);
      notifyCreditsUpdated();
    } catch (err) {
      if (isJobAcceptedPendingError(err)) {
        setError('');
        setInfo(err.message);
        setProgress('');
        setProviderBusy(true);
        window.setTimeout(() => setProviderBusy(false), 45_000);
      } else {
        setError(err instanceof Error ? err.message : String(err));
        setProgress('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const modelOptions: ModelOption[] = models.map((m) => ({
    value: modelSlug(m),
    label: m.name || modelSlug(m),
    price: m.price,
    description: modelPriceRangeLabel(m) || undefined,
  }));

  const showStoryboard = expanded && (type === 'video' || type === 'image');

  const menuCount = (item: HomeQuickMenuItem): number | null => {
    if (item.fixedCount != null) return item.fixedCount;
    if (item.jobType) return typeCounts[item.jobType] ?? null;
    return null;
  };

  const onMenuSelect = (item: HomeQuickMenuItem) => {
    setTypeMenuOpen(false);
    if (item.action === 'open-chat') {
      window.dispatchEvent(new CustomEvent('quick-chat:open'));
      return;
    }
    if (item.href) {
      navigate(item.href);
      return;
    }
    if (item.jobType) {
      setType(item.jobType);
      setResult(null);
    }
  };

  const heroPlaceholder = t('home.search.placeholder');

  return (
    <div className={`qc-bar${isHero ? ' qc-bar--hero' : ''}${expanded ? ' expanded' : ''}`}>
      {result && (
        <div className="qc-result">
          <button type="button" className="qc-result-close" onClick={() => setResult(null)}>
            <X size={14} />
          </button>
          {result.type === 'video' ? (
            <video src={result.url} controls className="qc-result-media" />
          ) : result.type === 'image' ? (
            <img src={result.url} alt="kết quả" className="qc-result-media" />
          ) : (
            <audio src={result.url} controls className="qc-result-audio" />
          )}
          <a href={result.url} target="_blank" rel="noreferrer" className="qc-result-link">
            Mở kết quả
          </a>
        </div>
      )}

      {showStoryboard && (
        <div className="qc-storyboard">
          <div className="qc-sb-group">
            <span className="qc-sb-title">
              ĐA PHƯƠNG TIỆN ({refs.length}/{MAX_MEDIA})
            </span>
            <div className="qc-sb-frames">
              {refs.map((url, i) => (
                <div key={i} className="qc-sb-frame qc-sb-media">
                  {urlMediaKind(url) === 'video' ? (
                    <video src={url} muted loop playsInline />
                  ) : (
                    <img src={url} alt={`media ${i + 1}`} />
                  )}
                  <button
                    type="button"
                    className="qc-sb-remove"
                    onClick={() => setRefs((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
              {refs.length < MAX_MEDIA && (
                <ComposerMediaPickButton
                  kind={mediaPickKind}
                  className="qc-sb-frame qc-sb-add"
                  title="Thêm media"
                  uploading={mediaUploading}
                  onFile={ingestMediaFile}
                  onUrl={ingestMediaUrl}
                >
                  <Plus size={16} />
                  <span>ADD</span>
                </ComposerMediaPickButton>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="qc-prompt-row">
        {isHero ? (
          <span className="qc-search-icon" aria-hidden>
            <Search size={18} />
          </span>
        ) : (
          <button
            type="button"
            className="qc-expand-toggle"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? 'Thu gọn' : 'Mở rộng'}
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        )}
        <textarea
          ref={promptRef}
          className="qc-prompt"
          rows={expanded && !isHero ? 2 : 1}
          placeholder={isHero ? heroPlaceholder : promptPlaceholder(type)}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onFocus={() => setExpanded(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
        />
        {isHero && !expanded && (
          <kbd className="qc-kbd-hint">{t('home.search.shortcut')}</kbd>
        )}
        {isHero && (
          <button
            type="button"
            className="qc-send"
            onClick={() => void submit()}
            disabled={submitting || providerBusy || loadingModels}
            title={t('composer.submit', { type: typeShortLabel(type) })}
          >
            {submitting || providerBusy ? (
              <Loader2 size={16} className="qc-spin" />
            ) : (
              <SendHorizontal size={16} />
            )}
          </button>
        )}
      </div>

      {error && <div className="qc-error">{error}</div>}
      {info && !error && <div className="qc-info">{info}</div>}

      <div className="qc-toolbar">
        <div className="qc-type" ref={typeRef}>
          <button
            type="button"
            className="qc-type-trigger"
            onClick={() => setTypeMenuOpen((v) => !v)}
          >
            <span className="qc-dot" /> {typeShortLabel(type)}
            <ChevronUp size={12} />
          </button>
          {typeMenuOpen && (
            <div className="qc-type-menu" role="menu">
              {HOME_QUICK_MENU.map((item) => {
                const count = menuCount(item);
                const active = item.jobType === type;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    className={`qc-type-item${active ? ' active' : ''}`}
                    onClick={() => onMenuSelect(item)}
                  >
                    <span className="qc-type-accent" aria-hidden />
                    <HomeCategoryIcon
                      icon={item.icon}
                      tint={item.tint}
                      size="sm"
                      className="qc-type-icon-img"
                    />
                    <span className="qc-type-label">{t(item.labelKey)}</span>
                    {count != null && <span className="qc-type-count">{count}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="qc-model" ref={modelRef}>
          <button
            type="button"
            className="qc-model-trigger"
            onClick={() => setModelMenuOpen((v) => !v)}
            disabled={loadingModels}
          >
            <Sparkles size={13} />
            <span>
              {loadingModels
                ? 'Đang tải…'
                : currentModel?.name || modelSlugSel || 'Chọn model'}
            </span>
            <ChevronDown size={12} />
          </button>
          {modelMenuOpen && modelOptions.length > 0 && (
            <div className="qc-model-menu">
              {modelOptions.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={o.value === modelSlugSel ? 'active' : ''}
                  onClick={() => {
                    setModelSlugSel(o.value);
                    setModelMenuOpen(false);
                  }}
                >
                  <span>{o.label}</span>
                  {(o.description || o.price != null) && (
                    <small>{o.description || o.price}</small>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {schema?.fields.ratio && (
          <MiniDropdown
            icon={<Proportions size={13} />}
            options={schema.options.ratios}
            value={pickAllowedOption(selections.ratio, schema.options.ratios) || ''}
            onChange={(v) => update('ratio', v)}
          />
        )}
        {schema?.fields.resolution && (
          <MiniDropdown
            icon={<Monitor size={13} />}
            options={schema.options.resolutions}
            value={pickAllowedOption(selections.resolution, schema.options.resolutions) || ''}
            onChange={(v) => update('resolution', v)}
          />
        )}
        {schema?.fields.duration && (
          <MiniDropdown
            icon={<Clock size={13} />}
            options={schema.options.durations}
            value={pickAllowedOption(selections.duration, schema.options.durations) || ''}
            onChange={(v) => update('duration', v)}
          />
        )}
        {schema?.fields.mode && (
          <MiniDropdown
            icon={<SlidersHorizontal size={13} />}
            options={schema.options.modes}
            value={pickAllowedOption(selections.mode, schema.options.modes) || ''}
            onChange={(v) => update('mode', v)}
          />
        )}

        <div className="qc-qty">
          <span>Qty</span>
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))}>
            −
          </button>
          <strong>{qty}</strong>
          <button type="button" onClick={() => setQty((q) => Math.min(4, q + 1))}>
            +
          </button>
        </div>

        <div className="qc-toolbar-right">
          {cost > 0 && <span className="qc-cost">{cost.toLocaleString('vi-VN')}</span>}
          {progress && <span className="qc-progress">{progress}</span>}
          <button
            type="button"
            className="qc-send"
            onClick={() => void submit()}
            disabled={submitting || providerBusy || loadingModels}
            title="Tạo"
          >
            {submitting || providerBusy ? (
              <Loader2 size={16} className="qc-spin" />
            ) : (
              <SendHorizontal size={16} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
