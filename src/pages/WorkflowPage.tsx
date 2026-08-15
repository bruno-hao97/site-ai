import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from 'react';
import {
  addEdge,
  BaseEdge,
  Background,
  EdgeLabelRenderer,
  getBezierPath,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  useStore,
  type Connection,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  ArrowUpCircle,
  Bell,
  Bot,
  Captions,
  ChevronDown,
  Combine,
  Copy,
  Database,
  Download,
  Eraser,
  Film,
  Flag,
  GitBranch,
  Globe,
  Image,
  LayoutGrid,
  Loader2,
  Maximize,
  Music,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Repeat,
  Scissors,
  Search,
  Square,
  StickyNote,
  Timer,
  Trash2,
  Type,
  Users,
  Video,
  Volume2,
  Wand2,
  Workflow,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { GommoModel, JobType } from '../services/api';
import { fetchModelsForType, pickDefaultModel, runNodeJob } from '../services/workflowEngine';
import { modelSlug } from '../services/modelSchema';
import type { JobSelections } from '../services/modelSchema';
import { clearWorkflow, saveWorkflow } from '../services/workflowStore';
import WorkflowLibrary from '../components/WorkflowLibrary';
import WorkflowTopBar from '../components/WorkflowTopBar';
import WorkflowStudioOnboarding, {
  isWorkflowOnboardingDismissed,
} from '../components/workflow/WorkflowStudioOnboarding';
import WorkflowAgentPanel from '../components/workflow/WorkflowAgentPanel';
import WorkflowMediaInputModal from '../components/workflow/WorkflowMediaInputModal';
import {
  getTemplate,
  loadTemplates,
  onLibraryUpdated,
  saveTemplate,
  type SavedTemplate,
} from '../services/workflowLibraryStore';
import {
  loadTabsState,
  makeTab,
  saveTabsState,
  type WorkflowTab,
} from '../services/workflowTabsStore';
import ProjectPicker from '../components/ProjectPicker';
import ComposerLibraryPreviewModal, {
  type ComposerPreviewHandlers,
} from '../components/ComposerLibraryPreviewModal';
import { AiGenControlsProvider, AiGenNodeCard } from '../components/workflow/AiGenNodeCard';
import { WfNodeModelPicker } from '../components/workflow/WfNodeModelPicker';
import { WfNodePortsGrid, WfPort as Port } from '../components/workflow/WfNodePortsGrid';
import type { ProjectItemType } from '../services/projectStore';
import type { FeedItem } from '../services/feedApi';
import { feedMediaUrl, feedThumb } from '../services/feedApi';
import { collectWorkflowPreviewItems } from '../services/workflowResultPreview';
import { downloadMediaUrl } from '../utils/downloadMedia';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  defaultMediaInputDraft,
  draftFromNodeData,
  extractVideoFirstFrame,
  MEDIA_INPUT_PORTS,
  resolveMediaInputUrls,
  type MediaInputDraft,
  type MediaInputKind,
} from '../services/workflowMediaInput';
import {
  ensureImageSlots,
  getImageSlotForNode,
  imageSlotLabel,
  nextImageSlot,
  nodeBadgeLabel,
  resolveImageReferencesForJob,
} from '../services/workflowImageSlots';
import {
  AGENT_PORTS,
  CUT_VIDEO_PORTS,
  DATA_TABLE_PORTS,
  EXTRACT_MEDIA_PORTS,
  KOLS_PORTS,
  LIPSYNC_PORTS,
  MERGE_PORTS,
  OUTPUT_PORTS,
  REMOVE_BG_PORTS,
  RENDER_PORTS,
  SUBTITLE_PORTS,
  TEXT_PORTS,
  UPSCALE_IMAGE_PORTS,
  UPSCALE_VIDEO_PORTS,
  VFX_PORTS,
} from '../services/workflowIoPorts';
import { runImageUpscale } from '../services/imageUpscale';
import { askGommo, isGommoChatConfigured } from '../services/gommoChat';
import { WORKFLOW_CHAT_CONFIG } from '../services/gommoChatConfig';
import { formatAgentDisplayContent } from '../services/agentDisplayContent';
import {
  AGENT_CHAT_MODELS,
  loadAgentState,
  resolveAgentChatModel,
} from '../services/workflowAgentStore';
import { buildWorkflowSnapshot } from '../services/workflowAgentActions';
import { getWorkflowKol, WORKFLOW_KOLS } from '../services/workflowKols';
import { parseTableInput, tableToJson, type ParsedTable } from '../services/workflowDataTable';
import { runWorkflowProcessJob } from '../services/workflowProcessJobs';
import { useLocale, type TranslateFn } from '../i18n/LanguageProvider';
import {
  getNodeGroups,
  translatePorts,
} from '../lib/workflowI18n';

type WFStatus = 'idle' | 'running' | 'done' | 'error';

const WorkflowI18nCtx = createContext<TranslateFn | null>(null);

function useWorkflowT(): TranslateFn {
  const t = useContext(WorkflowI18nCtx);
  if (!t) throw new Error('useWorkflowT must be used within WorkflowI18nProvider');
  return t;
}

interface NodeData {
  modelId?: string;
  prompt?: string;
  text?: string;
  ratio?: string;
  mode?: string;
  resolution?: string;
  duration?: string;
  url?: string;
  method?: string;
  seconds?: number;
  count?: number;
  op?: string;
  compare?: string;
  status?: WFStatus;
  statusText?: string;
  resultUrl?: string;
  fileName?: string;
  error?: string;
  runStartedAt?: number;
  runEndedAt?: number;
  imageSlot?: number;
  kolId?: string;
  customImageUrl?: string;
  tableRaw?: string;
  allJson?: string;
  startSec?: number;
  endSec?: number;
  [key: string]: unknown;
}

type WFNode = Node<NodeData>;

interface WorkflowCtxValue {
  updateNode: (id: string, patch: Partial<NodeData>) => void;
  openMediaInputModal: (nodeId: string) => void;
  portsExpandedNodeId: string | null;
  togglePortsExpanded: (nodeId: string) => void;
  imageSlotForNode: (nodeId: string) => number;
  openResultPreview: (nodeId: string, kind: 'image' | 'video') => void;
}

const WorkflowCtx = createContext<WorkflowCtxValue>({
  updateNode: () => {},
  openMediaInputModal: () => {},
  portsExpandedNodeId: null,
  togglePortsExpanded: () => {},
  imageSlotForNode: () => 1,
  openResultPreview: () => {},
});

function usePortsExpanded(nodeId: string) {
  const { portsExpandedNodeId, togglePortsExpanded } = useContext(WorkflowCtx);
  const portsExpanded = portsExpandedNodeId === nodeId;
  const togglePorts = useCallback(
    () => togglePortsExpanded(nodeId),
    [nodeId, togglePortsExpanded],
  );
  return { portsExpanded, togglePorts };
}

function wfNodeClass(opts: {
  status?: WFStatus;
  portsExpanded?: boolean;
  extra?: string;
}): string {
  const { status, portsExpanded, extra } = opts;
  return [
    'wf-node',
    extra,
    status ? `status-${status}` : '',
    portsExpanded ? 'wf-node--ports-expanded' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function useUpdateNode(id: string) {
  const { updateNode } = useContext(WorkflowCtx);
  return useCallback((patch: Partial<NodeData>) => updateNode(id, patch), [id, updateNode]);
}

function guessProjectType(url: string): ProjectItemType {
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)) return 'video';
  if (/\.(mp3|wav|ogg|m4a)(\?|$)/i.test(url)) return 'tts';
  return 'image';
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function StatusDot({ status }: { status?: WFStatus }) {
  if (status === 'running') return <Loader2 size={14} className="wf-spin" />;
  return <span className={`wf-dot wf-dot-${status || 'idle'}`} />;
}

function useDeleteNode(id: string) {
  const { deleteElements } = useReactFlow();
  return useCallback(() => {
    deleteElements({ nodes: [{ id }] });
  }, [deleteElements, id]);
}

function NodeHead({
  id,
  icon,
  title,
  status,
  showStatus = true,
  collapsed,
  onToggleCollapse,
}: {
  id: string;
  icon: ReactNode;
  title: string;
  status?: WFStatus;
  showStatus?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const t = useWorkflowT();
  const del = useDeleteNode(id);
  return (
    <div
      className={`wf-node-head${onToggleCollapse ? ' wf-node-head--toggle' : ''}`}
      onClick={onToggleCollapse}
    >
      <span className="wf-node-title">
        {icon} {title}
      </span>
      <span className="wf-node-head-right">
        {showStatus && <StatusDot status={status} />}
        {onToggleCollapse && (
          <span className={`wf-collapse-chevron${collapsed ? ' is-collapsed' : ''}`}>▾</span>
        )}
        <button
          type="button"
          className="wf-node-del nodrag"
          title={t('workflow.deleteNode')}
          onClick={(e) => {
            e.stopPropagation();
            del();
          }}
        >
          <X size={13} />
        </button>
      </span>
    </div>
  );
}

function NodeLoadingResult({
  resultUrl,
  status,
  statusText,
}: {
  resultUrl?: string;
  status?: WFStatus;
  statusText?: string;
}) {
  const t = useWorkflowT();
  if (!resultUrl && status !== 'running') return null;
  return (
    <div className="wf-node-result-wrap">
      {resultUrl && <Preview url={resultUrl} />}
      {status === 'running' && (
        <div className="wf-node-loading-overlay">
          <div className="wf-node-loading-spinner" />
          <p className="wf-node-loading-text">{statusText || t('workflow.processing')}</p>
        </div>
      )}
    </div>
  );
}

function Preview({ url }: { url: string }) {
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)) {
    return <video className="wf-node-preview" src={url} controls preload="metadata" />;
  }
  if (/\.(mp3|wav|ogg|m4a)(\?|$)/i.test(url)) {
    return <audio className="wf-node-audio" src={url} controls />;
  }
  return <img className="wf-node-preview" src={url} alt="" />;
}

function ModelSelect({
  type,
  value,
  onChange,
  variant = 'default',
}: {
  type: JobType;
  value?: string;
  onChange: (v: string) => void;
  variant?: 'default' | 'gen';
}) {
  const [models, setModels] = useState<GommoModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    setLoading(true);
    fetchModelsForType(type)
      .then((m) => {
        if (!on) return;
        setModels(m);
        if (!value) {
          const def = pickDefaultModel(m);
          if (def) onChange(modelSlug(def));
        }
      })
      .catch(() => {})
      .finally(() => on && setLoading(false));
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const options = models.map((m) => {
    const slug = modelSlug(m);
    return { value: slug, label: m.name || slug };
  });

  return (
    <WfNodeModelPicker
      value={value || ''}
      options={options}
      onChange={onChange}
      loading={loading}
      variant={variant}
    />
  );
}

function TextNode({ id, data }: NodeProps<WFNode>) {
  const t = useWorkflowT();
  const update = useUpdateNode(id);
  const { portsExpanded, togglePorts } = usePortsExpanded(id);
  return (
    <div className={wfNodeClass({ status: data.status, portsExpanded, extra: 'wf-node-wide' })}>
      <NodeHead
        id={id}
        icon={<Type size={14} />}
        title={t('workflow.node.text.title')}
        status={data.status}
        collapsed={!portsExpanded}
        onToggleCollapse={togglePorts}
      />
      <WfNodePortsGrid ports={translatePorts(t, TEXT_PORTS)} expanded={portsExpanded} />
      <div className="wf-gen-body nodrag">
        <textarea
          className="wf-gen-prompt nodrag"
          value={data.prompt || ''}
          placeholder={t('workflow.node.text.placeholder')}
          onChange={(e) => update({ prompt: e.target.value })}
        />
      </div>
    </div>
  );
}

function CompactMediaInputNode({
  id,
  data,
  kind,
}: NodeProps<WFNode> & { kind: MediaInputKind }) {
  const t = useWorkflowT();
  const { openMediaInputModal, imageSlotForNode } = useContext(WorkflowCtx);
  const del = useDeleteNode(id);
  const ports = translatePorts(t, MEDIA_INPUT_PORTS[kind], kind);
  const title =
    kind === 'image'
      ? t('workflow.node.input-image')
      : t('workflow.node.input-video');
  const Icon = kind === 'image' ? Image : Video;
  const imageSlot = kind === 'image' ? imageSlotForNode(id) : 0;
  const slotLabel = kind === 'image' ? imageSlotLabel(imageSlot) : '@video';

  const mediaUrls: string[] = Array.isArray(data.mediaUrls)
    ? (data.mediaUrls as string[])
    : data.resultUrl
      ? [data.resultUrl as string]
      : [];

  const count = mediaUrls.length;

  const [page, setPage] = useState(0);
  const { portsExpanded, togglePorts } = usePortsExpanded(id);
  const PER_PAGE = 4;
  const totalPages = Math.max(1, Math.ceil(count / PER_PAGE));
  const pageUrls = mediaUrls.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  return (
    <div
      className={wfNodeClass({
        status: data.status,
        portsExpanded,
        extra: 'wf-node-media-compact',
      })}
      onDoubleClick={() => openMediaInputModal(id)}
      title={t('workflow.doubleClickEdit')}
    >
      <div
        className="wf-node-head wf-node-head--toggle"
        onClick={togglePorts}
      >
        <span className="wf-node-title">
          <Icon size={14} /> {title}
          {kind === 'image' && (
            <span className="wf-media-node-badge">{nodeBadgeLabel(imageSlot)}</span>
          )}
        </span>
        <span className="wf-node-head-right">
          <StatusDot status={data.status} />
          <span className={`wf-collapse-chevron${!portsExpanded ? ' is-collapsed' : ''}`}>▾</span>
          <button
            type="button"
            className="wf-node-del nodrag"
            title={t('workflow.deleteNode')}
            onClick={(e) => {
              e.stopPropagation();
              del();
            }}
          >
            <X size={13} />
          </button>
        </span>
      </div>

      <WfNodePortsGrid ports={ports} expanded={portsExpanded} />

      {count > 0 ? (
        <div className="wf-media-thumb-area nodrag">
          <div className={`wf-media-thumb-grid ${count === 1 ? 'single' : 'multi'}`}>
            {pageUrls.map((url, i) => (
              <div key={`${url}-${i}`} className="wf-media-thumb-cell">
                {kind === 'image' ? (
                  <img
                    src={url}
                    alt={slotLabel}
                    className="wf-media-thumb-img"
                  />
                ) : (
                  <video src={url} className="wf-media-thumb-img" muted preload="metadata" />
                )}
              </div>
            ))}
          </div>

          <div className="wf-media-thumb-footer">
            <span className="wf-media-thumb-label">{slotLabel}</span>
            {totalPages > 1 && (
              <div className="wf-media-thumb-pager">
                {Array.from({ length: Math.min(totalPages, 6) }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`wf-media-pager-dot${page === i ? ' active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPage(i);
                    }}
                  >
                    {i * PER_PAGE + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          className="wf-media-thumb-empty nodrag"
          onClick={() => openMediaInputModal(id)}
        >
          <Icon size={22} />
          <span>{t('workflow.doubleClickAdd')}</span>
        </div>
      )}
    </div>
  );
}

function InputImageNode(props: NodeProps<WFNode>) {
  return <CompactMediaInputNode {...props} kind="image" />;
}

function InputVideoNode(props: NodeProps<WFNode>) {
  return <CompactMediaInputNode {...props} kind="video" />;
}

function ImageNode({ id, data }: NodeProps<WFNode>) {
  const t = useWorkflowT();
  const update = useUpdateNode(id);
  const { portsExpanded, togglePorts } = usePortsExpanded(id);
  const { openResultPreview } = useContext(WorkflowCtx);

  return (
    <AiGenNodeCard
      type="image"
      nodeId={id}
      data={data}
      update={update}
      portsExpanded={portsExpanded}
      onOpenResultPreview={openResultPreview}
      placeholder={t('workflow.node.image.placeholder')}
      head={
        <NodeHead
          id={id}
          icon={<Image size={14} />}
          title={t('workflow.node.image')}
          status={data.status}
          collapsed={!portsExpanded}
          onToggleCollapse={togglePorts}
        />
      }
    />
  );
}

function VideoNode({ id, data }: NodeProps<WFNode>) {
  const t = useWorkflowT();
  const update = useUpdateNode(id);
  const { portsExpanded, togglePorts } = usePortsExpanded(id);
  const { openResultPreview } = useContext(WorkflowCtx);

  return (
    <AiGenNodeCard
      type="video"
      nodeId={id}
      data={data}
      update={update}
      portsExpanded={portsExpanded}
      onOpenResultPreview={openResultPreview}
      placeholder={t('workflow.node.video.placeholder')}
      head={
        <NodeHead
          id={id}
          icon={<Video size={14} />}
          title={t('workflow.node.video')}
          status={data.status}
          collapsed={!portsExpanded}
          onToggleCollapse={togglePorts}
        />
      }
    />
  );
}

function TtsNode({ id, data }: NodeProps<WFNode>) {
  const t = useWorkflowT();
  const update = useUpdateNode(id);
  const { portsExpanded, togglePorts } = usePortsExpanded(id);

  return (
    <div className={wfNodeClass({ status: data.status, portsExpanded, extra: 'wf-node-process-job' })}>
      <NodeHead
        id={id}
        icon={<Volume2 size={14} />}
        title={t('workflow.node.tts.title')}
        status={data.status}
        collapsed={!portsExpanded}
        onToggleCollapse={togglePorts}
      />
      <Port side="in" label={t('workflow.port.text')} hideLabel={!portsExpanded} />
      <div className="wf-gen-body nodrag">
        <div className="wf-gen-model-block">
          <ModelSelect
            type="tts"
            value={data.modelId}
            onChange={(v) => update({ modelId: v })}
            variant="gen"
          />
        </div>
        <textarea
          className="wf-gen-prompt nodrag"
          value={data.text || ''}
          placeholder={t('workflow.node.tts.placeholder')}
          onChange={(e) => update({ text: e.target.value })}
        />
        <NodeLoadingResult
          resultUrl={data.resultUrl}
          status={data.status}
          statusText={data.statusText}
        />
        {data.error && <p className="wf-node-error">{data.error}</p>}
      </div>
      <Port side="out" label={t('workflow.port.urlAudio')} hideLabel={!portsExpanded} />
    </div>
  );
}

function MusicNode({ id, data }: NodeProps<WFNode>) {
  const t = useWorkflowT();
  const update = useUpdateNode(id);
  const { portsExpanded, togglePorts } = usePortsExpanded(id);

  return (
    <div className={wfNodeClass({ status: data.status, portsExpanded, extra: 'wf-node-process-job' })}>
      <NodeHead
        id={id}
        icon={<Music size={14} />}
        title={t('workflow.node.music')}
        status={data.status}
        collapsed={!portsExpanded}
        onToggleCollapse={togglePorts}
      />
      <Port side="in" label={t('workflow.port.text')} hideLabel={!portsExpanded} />
      <div className="wf-gen-body nodrag">
        <div className="wf-gen-model-block">
          <ModelSelect
            type="music"
            value={data.modelId}
            onChange={(v) => update({ modelId: v })}
            variant="gen"
          />
        </div>
        <textarea
          className="wf-gen-prompt nodrag"
          value={data.prompt || ''}
          placeholder={t('workflow.node.music.placeholder')}
          onChange={(e) => update({ prompt: e.target.value })}
        />
        <NodeLoadingResult
          resultUrl={data.resultUrl}
          status={data.status}
          statusText={data.statusText}
        />
        {data.error && <p className="wf-node-error">{data.error}</p>}
      </div>
      <Port side="out" label={t('workflow.port.urlMusic')} hideLabel={!portsExpanded} />
    </div>
  );
}

function NoteNode({ id, data }: NodeProps<WFNode>) {
  const t = useWorkflowT();
  const update = useUpdateNode(id);
  return (
    <div className="wf-node wf-node-note wf-node-wide">
      <NodeHead id={id} icon={<StickyNote size={14} />} title={t('workflow.node.note')} showStatus={false} />
      <div className="wf-gen-body nodrag">
        <textarea
          className="wf-gen-prompt nodrag"
          value={data.prompt || ''}
          placeholder={t('workflow.node.note.placeholder')}
          onChange={(e) => update({ prompt: e.target.value })}
        />
      </div>
    </div>
  );
}

function OutputNode({ id, data }: NodeProps<WFNode>) {
  const t = useWorkflowT();
  const { portsExpanded, togglePorts } = usePortsExpanded(id);
  const displayUrl = data.resultUrl || (isHttpUrl(String(data.prompt || '')) ? String(data.prompt) : '');
  const displayText =
    !displayUrl && data.prompt ? String(data.prompt) : data.text ? String(data.text) : '';

  return (
    <div className={wfNodeClass({ status: data.status, portsExpanded, extra: 'wf-node-wide wf-node-output' })}>
      <NodeHead
        id={id}
        icon={<Package size={14} />}
        title={t('workflow.node.output')}
        status={data.status}
        collapsed={!portsExpanded}
        onToggleCollapse={togglePorts}
      />
      <WfNodePortsGrid ports={translatePorts(t, OUTPUT_PORTS)} expanded={portsExpanded} />
      <div className="wf-gen-body nodrag">
        {displayUrl ? (
          <>
            <Preview url={displayUrl} />
            <div className="wf-node-out-actions">
              <a
                className="wf-node-link nodrag"
                href={displayUrl}
                target="_blank"
                rel="noreferrer"
              >
                {t('workflow.open')}
              </a>
              <ProjectPicker
                snapshot={{
                  itemId: displayUrl,
                  type: guessProjectType(displayUrl),
                  prompt: t('workflow.fromWorkflow'),
                  thumbnailUrl: displayUrl,
                  downloadUrl: displayUrl,
                }}
              />
            </div>
          </>
        ) : displayText ? (
          <p className="wf-gen-prompt-snippet nodrag" title={displayText}>
            {displayText}
          </p>
        ) : (
          <p className="wf-node-empty">{t('workflow.node.output.empty')}</p>
        )}
        {data.error && <p className="wf-node-error">{data.error}</p>}
      </div>
    </div>
  );
}

function StartNode({ id, data }: NodeProps<WFNode>) {
  const t = useWorkflowT();
  const { portsExpanded } = usePortsExpanded(id);
  return (
    <div className={wfNodeClass({ status: data.status, portsExpanded, extra: 'wf-node-wide wf-node-start' })}>
      <NodeHead id={id} icon={<Play size={14} />} title={t('workflow.node.start')} status={data.status} />
      <div className="wf-gen-body nodrag">
        <p className="wf-node-empty">{t('workflow.node.start.empty')}</p>
      </div>
      <Port side="out" label={t('workflow.port.start')} color="#fbbf24" />
    </div>
  );
}

function EndNode({ id, data }: NodeProps<WFNode>) {
  const t = useWorkflowT();
  const { portsExpanded } = usePortsExpanded(id);
  return (
    <div className={wfNodeClass({ status: data.status, portsExpanded, extra: 'wf-node-wide wf-node-end' })}>
      <NodeHead id={id} icon={<Flag size={14} />} title={t('workflow.node.end')} status={data.status} />
      <Port side="in" label={t('workflow.port.end')} color="#fbbf24" />
      <div className="wf-gen-body nodrag">
        <p className="wf-node-empty">
          {data.status === 'done' ? t('workflow.node.end.complete') : t('workflow.node.end.empty')}
        </p>
      </div>
    </div>
  );
}

function RenderNode({ id, data }: NodeProps<WFNode>) {
  const t = useWorkflowT();
  const { portsExpanded, togglePorts } = usePortsExpanded(id);
  return (
    <div className={wfNodeClass({ status: data.status, portsExpanded, extra: 'wf-node-wide' })}>
      <NodeHead
        id={id}
        icon={<Film size={14} />}
        title={t('workflow.node.render')}
        status={data.status}
        collapsed={!portsExpanded}
        onToggleCollapse={togglePorts}
      />
      <WfNodePortsGrid ports={translatePorts(t, RENDER_PORTS)} expanded={portsExpanded} />
      <div className="wf-gen-body nodrag">
        <p className="wf-node-empty">
          {t('workflow.node.render.empty')}
          {data.exportMode ? ` · ${String(data.exportMode)}` : ''}
          {data.resolution ? ` · ${String(data.resolution)}` : ''}
        </p>
        <NodeLoadingResult
          resultUrl={data.resultUrl}
          status={data.status}
          statusText={data.statusText}
        />
        {data.error && <p className="wf-node-error">{data.error}</p>}
      </div>
    </div>
  );
}

function UpscaleImageNode({ id, data }: NodeProps<WFNode>) {
  const t = useWorkflowT();
  const update = useUpdateNode(id);
  const { portsExpanded, togglePorts } = usePortsExpanded(id);

  return (
    <div className={wfNodeClass({ status: data.status, portsExpanded, extra: 'wf-node-process-job' })}>
      <NodeHead
        id={id}
        icon={<ArrowUpCircle size={14} />}
        title={t('workflow.node.upscale-image')}
        status={data.status}
        collapsed={!portsExpanded}
        onToggleCollapse={togglePorts}
      />
      <WfNodePortsGrid ports={translatePorts(t, UPSCALE_IMAGE_PORTS, 'image')} expanded={portsExpanded} />
      <div className="wf-gen-body nodrag">
        <div className="wf-gen-model-block">
          <ModelSelect
            type="image-upscale"
            value={data.modelId}
            onChange={(v) => update({ modelId: v })}
            variant="gen"
          />
          <div className="wf-gen-config-pills">
            <select
              className="wf-gen-pill wf-gen-pill--select nodrag"
              value={data.mode || 'standard'}
              aria-label={t('workflow.config.mode')}
              onChange={(e) => update({ mode: e.target.value })}
            >
              <option value="standard">{t('workflow.config.modeStandard')}</option>
              <option value="creative">{t('workflow.config.modeCreative')}</option>
            </select>
            <select
              className="wf-gen-pill wf-gen-pill--select nodrag"
              value={data.resolution || '2k'}
              aria-label={t('workflow.config.resolution')}
              onChange={(e) => update({ resolution: e.target.value })}
            >
              <option value="2k">{t('workflow.config.res2k')}</option>
              <option value="4k">{t('workflow.config.res4k')}</option>
            </select>
          </div>
        </div>
        <NodeLoadingResult
          resultUrl={data.resultUrl}
          status={data.status}
          statusText={data.statusText}
        />
        {data.error && <p className="wf-node-error">{data.error}</p>}
      </div>
    </div>
  );
}

function LipsyncNode({ id, data }: NodeProps<WFNode>) {
  const t = useWorkflowT();
  const update = useUpdateNode(id);
  const { portsExpanded, togglePorts } = usePortsExpanded(id);

  return (
    <div className={wfNodeClass({ status: data.status, portsExpanded, extra: 'wf-node-process-job' })}>
      <NodeHead
        id={id}
        icon={<Video size={14} />}
        title={t('workflow.node.lipsync')}
        status={data.status}
        collapsed={!portsExpanded}
        onToggleCollapse={togglePorts}
      />
      <WfNodePortsGrid ports={translatePorts(t, LIPSYNC_PORTS, 'video')} expanded={portsExpanded} />
      <div className="wf-gen-body nodrag">
        <div className="wf-gen-model-block">
          <ModelSelect
            type="avatar-lipsync"
            value={data.modelId}
            onChange={(v) => update({ modelId: v })}
            variant="gen"
          />
        </div>
        <textarea
          className="wf-gen-prompt nodrag"
          value={data.prompt || ''}
          placeholder={t('workflow.node.lipsync.placeholder')}
          onChange={(e) => update({ prompt: e.target.value })}
        />
        <NodeLoadingResult
          resultUrl={data.resultUrl}
          status={data.status}
          statusText={data.statusText}
        />
        {data.error && <p className="wf-node-error">{data.error}</p>}
      </div>
    </div>
  );
}

function MergeNode({ id, data }: NodeProps<WFNode>) {
  const t = useWorkflowT();
  const { portsExpanded, togglePorts } = usePortsExpanded(id);
  const itemsRaw = typeof data.allJson === 'string' ? data.allJson : '';
  let count = 0;
  try {
    const parsed = itemsRaw ? (JSON.parse(itemsRaw) as unknown) : [];
    count = Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    count = 0;
  }
  const displayUrl =
    data.resultUrl || (isHttpUrl(String(data.prompt || '')) ? String(data.prompt) : '');
  const displayText = !displayUrl && data.prompt ? String(data.prompt) : '';

  return (
    <div className={wfNodeClass({ status: data.status, portsExpanded, extra: 'wf-node-wide' })}>
      <NodeHead
        id={id}
        icon={<Combine size={14} />}
        title={t('workflow.node.merge')}
        status={data.status}
        collapsed={!portsExpanded}
        onToggleCollapse={togglePorts}
      />
      <WfNodePortsGrid ports={translatePorts(t, MERGE_PORTS)} expanded={portsExpanded} />
      <div className="wf-gen-body nodrag">
        {displayUrl ? (
          <Preview url={displayUrl} />
        ) : displayText ? (
          <p className="wf-gen-prompt-snippet nodrag" title={displayText}>
            {displayText}
          </p>
        ) : (
          <p className="wf-node-empty">
            {t('workflow.node.merge.empty')}
            {count > 0 ? t('workflow.node.merge.itemCount', { count }) : ''}
          </p>
        )}
        {count > 0 && (
          <p className="wf-node-status">{t('workflow.node.merge.items', { count })}</p>
        )}
        {data.error && <p className="wf-node-error">{data.error}</p>}
      </div>
    </div>
  );
}

function ExtractMediaNode({ id, data }: NodeProps<WFNode>) {
  const t = useWorkflowT();
  const { portsExpanded, togglePorts } = usePortsExpanded(id);
  return (
    <div className={wfNodeClass({ status: data.status, portsExpanded, extra: 'wf-node-wide' })}>
      <NodeHead
        id={id}
        icon={<Download size={14} />}
        title={t('workflow.node.extract-media')}
        status={data.status}
        collapsed={!portsExpanded}
        onToggleCollapse={togglePorts}
      />
      <WfNodePortsGrid ports={translatePorts(t, EXTRACT_MEDIA_PORTS)} expanded={portsExpanded} />
      <div className="wf-gen-body nodrag">
        <p className="wf-node-empty">
          {t('workflow.node.extract.empty')}
          {data.statusText ? ` · ${data.statusText}` : ''}
        </p>
        <NodeLoadingResult
          resultUrl={data.resultUrl}
          status={data.status}
          statusText={data.statusText}
        />
        {data.error && <p className="wf-node-error">{data.error}</p>}
      </div>
    </div>
  );
}

function AgentNode({ id, data }: NodeProps<WFNode>) {
  const t = useWorkflowT();
  const update = useUpdateNode(id);
  const { portsExpanded, togglePorts } = usePortsExpanded(id);
  const chatModelId = String(data.modelId || loadAgentState().chatModelId);
  const reply = typeof data.text === 'string' ? data.text : '';

  return (
    <div className={wfNodeClass({ status: data.status, portsExpanded, extra: 'wf-node-agent' })}>
      <NodeHead
        id={id}
        icon={<Bot size={14} />}
        title={t('workflow.node.agent')}
        status={data.status}
        collapsed={!portsExpanded}
        onToggleCollapse={togglePorts}
      />
      <WfNodePortsGrid ports={translatePorts(t, AGENT_PORTS)} expanded={portsExpanded} />
      <div className="wf-gen-body nodrag">
        <div className="wf-gen-model-block">
          <WfNodeModelPicker
            value={chatModelId}
            options={AGENT_CHAT_MODELS.map((m) => ({ value: m.id, label: m.name, title: m.name }))}
            onChange={(v) => update({ modelId: v })}
            variant="gen"
          />
        </div>
        <textarea
          className="wf-gen-prompt nodrag"
          value={data.prompt || ''}
          placeholder={t('workflow.node.agent.placeholder')}
          onChange={(e) => update({ prompt: e.target.value })}
        />
        {data.status === 'running' && (
          <p className="wf-node-status">{data.statusText || t('workflow.node.agent.asking')}</p>
        )}
        {reply && (
          <div className="wf-gen-prompt-snippet nodrag" title={reply}>
            {reply.length > 120 ? `${reply.slice(0, 120)}…` : reply}
          </div>
        )}
        {!reply && data.status !== 'running' && (
          <p className="wf-node-empty">{t('workflow.node.agent.empty')}</p>
        )}
        {data.error && <p className="wf-node-error">{data.error}</p>}
      </div>
    </div>
  );
}

function ProcessJobNodeShell({
  id,
  data,
  title,
  icon,
  ports,
  jobType,
  placeholder,
  portContext,
  children,
}: {
  id: string;
  data: NodeData;
  title: string;
  icon: ReactNode;
  ports: { in: readonly { id: string; label: string; color?: string }[]; out: readonly { id: string; label: string; color?: string }[] };
  jobType: JobType;
  placeholder?: string;
  portContext?: string;
  children?: ReactNode;
}) {
  const t = useWorkflowT();
  const update = useUpdateNode(id);
  const { portsExpanded, togglePorts } = usePortsExpanded(id);

  return (
    <div className={wfNodeClass({ status: data.status, portsExpanded, extra: 'wf-node-process-job' })}>
      <NodeHead
        id={id}
        icon={icon}
        title={title}
        status={data.status}
        collapsed={!portsExpanded}
        onToggleCollapse={togglePorts}
      />
      <WfNodePortsGrid ports={translatePorts(t, ports, portContext)} expanded={portsExpanded} />
      <div className="wf-gen-body nodrag">
        <div className="wf-gen-model-block">
          <ModelSelect
            type={jobType}
            value={data.modelId}
            onChange={(v) => update({ modelId: v })}
            variant="gen"
          />
          {children}
        </div>
        {placeholder !== undefined && (
          <textarea
            className="wf-gen-prompt nodrag"
            value={data.prompt || ''}
            placeholder={placeholder}
            onChange={(e) => update({ prompt: e.target.value })}
          />
        )}
        <NodeLoadingResult
          resultUrl={data.resultUrl}
          status={data.status}
          statusText={data.statusText}
        />
        {data.error && <p className="wf-node-error">{data.error}</p>}
      </div>
    </div>
  );
}

function RemoveBgNode(props: NodeProps<WFNode>) {
  const t = useWorkflowT();
  const { id, data } = props;
  return (
    <ProcessJobNodeShell
      id={id}
      data={data}
      title={t('workflow.node.remove-bg')}
      icon={<Eraser size={14} />}
      ports={REMOVE_BG_PORTS}
      jobType="remove-bg"
      portContext="image"
    />
  );
}

function UpscaleVideoNode(props: NodeProps<WFNode>) {
  const t = useWorkflowT();
  const { id, data } = props;
  const update = useUpdateNode(id);
  return (
    <ProcessJobNodeShell
      id={id}
      data={data}
      title={t('workflow.node.upscale-video')}
      icon={<ArrowUpCircle size={14} />}
      ports={UPSCALE_VIDEO_PORTS}
      jobType="video-upscale"
      portContext="video"
    >
      <div className="wf-gen-config-pills">
        <select
          className="wf-gen-pill wf-gen-pill--select nodrag"
          value={data.resolution || '720p'}
          aria-label={t('workflow.config.resolution')}
          onChange={(e) => update({ resolution: e.target.value })}
        >
          <option value="720p">{t('workflow.config.res720p')}</option>
          <option value="1080p">{t('workflow.config.res1080p')}</option>
          <option value="2k">{t('workflow.config.res2k')}</option>
          <option value="4k">{t('workflow.config.res4k')}</option>
        </select>
      </div>
    </ProcessJobNodeShell>
  );
}

function VfxNode(props: NodeProps<WFNode>) {
  const t = useWorkflowT();
  const { id, data } = props;
  return (
    <ProcessJobNodeShell
      id={id}
      data={data}
      title={t('workflow.node.vfx')}
      icon={<Wand2 size={14} />}
      ports={VFX_PORTS}
      jobType="video-vfx"
      placeholder={t('workflow.node.vfx.placeholder')}
      portContext="video"
    />
  );
}

function SubtitleNode(props: NodeProps<WFNode>) {
  const t = useWorkflowT();
  const { id, data } = props;
  return (
    <ProcessJobNodeShell
      id={id}
      data={data}
      title={t('workflow.node.subtitle')}
      icon={<Captions size={14} />}
      ports={SUBTITLE_PORTS}
      jobType="video-subtitle"
      placeholder={t('workflow.node.subtitle.placeholder')}
      portContext="video"
    />
  );
}

function CutVideoNode({ id, data }: NodeProps<WFNode>) {
  const t = useWorkflowT();
  const update = useUpdateNode(id);
  return (
    <ProcessJobNodeShell
      id={id}
      data={data}
      title={t('workflow.node.cut')}
      icon={<Scissors size={14} />}
      ports={CUT_VIDEO_PORTS}
      jobType="video-cut"
      portContext="video"
    >
      <div className="wf-gen-config-pills">
        <input
          className="wf-gen-pill wf-gen-pill--select nodrag"
          type="number"
          min={0}
          step={0.1}
          value={data.startSec ?? 0}
          placeholder={t('workflow.config.startSec')}
          aria-label={t('workflow.config.startSec')}
          onChange={(e) => update({ startSec: Number(e.target.value) })}
        />
        <input
          className="wf-gen-pill wf-gen-pill--select nodrag"
          type="number"
          min={0}
          step={0.1}
          value={data.endSec ?? 0}
          placeholder={t('workflow.config.endSec')}
          aria-label={t('workflow.config.endSec')}
          onChange={(e) => update({ endSec: Number(e.target.value) })}
        />
      </div>
    </ProcessJobNodeShell>
  );
}

function KolsNode({ id, data }: NodeProps<WFNode>) {
  const t = useWorkflowT();
  const update = useUpdateNode(id);
  const { portsExpanded, togglePorts } = usePortsExpanded(id);
  const kolId = String(data.kolId || WORKFLOW_KOLS[0]?.id || '');
  const kol = getWorkflowKol(kolId) || WORKFLOW_KOLS[0];
  const imageUrl = String(data.customImageUrl || kol?.imageUrl || '');

  return (
    <div
      className={wfNodeClass({ status: data.status, portsExpanded, extra: 'wf-node-kols' })}
      onDoubleClick={() => update({ configured: true })}
      title={t('workflow.node.kols.confirmHint')}
    >
      <NodeHead
        id={id}
        icon={<Users size={14} />}
        title={t('workflow.node.kols')}
        status={data.status}
        collapsed={!portsExpanded}
        onToggleCollapse={togglePorts}
      />
      <WfNodePortsGrid ports={translatePorts(t, KOLS_PORTS, 'kols')} expanded={portsExpanded} />
      <div className="wf-gen-body nodrag">
        <div className="wf-gen-model-block">
          <WfNodeModelPicker
            value={kolId}
            options={WORKFLOW_KOLS.map((k) => ({ value: k.id, label: k.name }))}
            onChange={(v) => update({ kolId: v })}
            emptyLabel={t('workflow.node.kols.noKol')}
            variant="gen"
          />
        </div>
        <input
          className="wf-gen-url nodrag"
          type="text"
          value={data.customImageUrl || ''}
          placeholder={t('workflow.node.kols.imagePlaceholder')}
          onChange={(e) => update({ customImageUrl: e.target.value })}
        />
        {imageUrl ? <Preview url={imageUrl} /> : <p className="wf-node-empty">{t('workflow.node.kols.empty')}</p>}
        {kol && <p className="wf-node-status">{kol.name}</p>}
        {data.error && <p className="wf-node-error">{data.error}</p>}
      </div>
    </div>
  );
}

function DataTableNode({ id, data }: NodeProps<WFNode>) {
  const t = useWorkflowT();
  const update = useUpdateNode(id);
  const { portsExpanded, togglePorts } = usePortsExpanded(id);
  const raw = String(data.tableRaw || data.prompt || '');
  let table: ParsedTable = { rows: [], columns: [] };
  try {
    table = parseTableInput(raw);
  } catch {
    table = { rows: [], columns: [] };
  }
  const previewRows = table.rows.slice(0, 4);

  return (
    <div className={wfNodeClass({ status: data.status, portsExpanded, extra: 'wf-node-data-table' })}>
      <NodeHead
        id={id}
        icon={<Database size={14} />}
        title={t('workflow.node.data-table')}
        status={data.status}
        collapsed={!portsExpanded}
        onToggleCollapse={togglePorts}
      />
      <WfNodePortsGrid ports={translatePorts(t, DATA_TABLE_PORTS, 'data-table')} expanded={portsExpanded} />
      <div className="wf-gen-body nodrag">
        <textarea
          className="wf-gen-prompt nodrag"
          value={raw}
          placeholder={t('workflow.node.data-table.placeholder')}
          onChange={(e) => update({ tableRaw: e.target.value, prompt: e.target.value })}
        />
        {previewRows.length > 0 ? (
          <div className="wf-node-table-wrap nodrag">
            <table className="wf-node-table">
              <thead>
                <tr>
                  {table.columns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i}>
                    {table.columns.map((c) => (
                      <td key={c}>{row[c] ?? ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {table.rows.length > previewRows.length && (
              <p className="wf-node-status">
                {t('workflow.node.data-table.moreRows', {
                  count: table.rows.length - previewRows.length,
                })}
              </p>
            )}
          </div>
        ) : (
          <p className="wf-node-empty">{t('workflow.node.data-table.empty')}</p>
        )}
        {data.error && <p className="wf-node-error">{data.error}</p>}
      </div>
    </div>
  );
}

function ApiNode({ id, data }: NodeProps<WFNode>) {
  const t = useWorkflowT();
  const update = useUpdateNode(id);
  const { portsExpanded, togglePorts } = usePortsExpanded(id);
  return (
    <div className={wfNodeClass({ status: data.status, portsExpanded, extra: 'wf-node-wide' })}>
      <NodeHead
        id={id}
        icon={<Globe size={14} />}
        title={t('workflow.node.api')}
        status={data.status}
        collapsed={!portsExpanded}
        onToggleCollapse={togglePorts}
      />
      <Port side="in" label={t('workflow.port.payload')} hideLabel={!portsExpanded} />
      <div className="wf-gen-body nodrag">
        <div className="wf-gen-config-pills">
          <select
            className="wf-gen-pill wf-gen-pill--select nodrag"
            value={data.method || 'GET'}
            aria-label="HTTP method"
            onChange={(e) => update({ method: e.target.value })}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
        <input
          className="wf-gen-url nodrag"
          type="text"
          value={data.url || ''}
          placeholder={t('workflow.node.api.urlPlaceholder')}
          onChange={(e) => update({ url: e.target.value })}
        />
        <textarea
          className="wf-gen-prompt nodrag"
          value={data.prompt || ''}
          placeholder={t('workflow.node.api.bodyPlaceholder')}
          onChange={(e) => update({ prompt: e.target.value })}
        />
        {data.statusText && <p className="wf-node-status">{data.statusText}</p>}
        {data.error && <p className="wf-node-error">{data.error}</p>}
      </div>
      <Port side="out" label={t('workflow.port.response')} hideLabel={!portsExpanded} />
    </div>
  );
}

function ConditionNode({ id, data }: NodeProps<WFNode>) {
  const t = useWorkflowT();
  const update = useUpdateNode(id);
  const { portsExpanded, togglePorts } = usePortsExpanded(id);
  const op = data.op || 'not_empty';
  const needsCompare = op !== 'not_empty' && op !== 'empty';
  return (
    <div className={wfNodeClass({ status: data.status, portsExpanded, extra: 'wf-node-control' })}>
      <NodeHead
        id={id}
        icon={<GitBranch size={14} />}
        title={t('workflow.node.condition')}
        status={data.status}
        collapsed={!portsExpanded}
        onToggleCollapse={togglePorts}
      />
      <Port side="in" label={t('workflow.port.value')} hideLabel={!portsExpanded} />
      <div className="wf-gen-body nodrag">
        <div className="wf-gen-config-pills">
          <select
            className="wf-gen-pill wf-gen-pill--select nodrag"
            value={op}
            aria-label={t('workflow.condition.ariaLabel')}
            onChange={(e) => update({ op: e.target.value })}
          >
            <option value="not_empty">{t('workflow.condition.notEmpty')}</option>
            <option value="empty">{t('workflow.condition.empty')}</option>
            <option value="contains">{t('workflow.condition.contains')}</option>
            <option value="equals">{t('workflow.condition.equals')}</option>
            <option value="gt">{t('workflow.condition.gt')}</option>
            <option value="lt">{t('workflow.condition.lt')}</option>
          </select>
        </div>
        {needsCompare && (
          <input
            className="wf-gen-url nodrag"
            type="text"
            value={data.compare || ''}
            placeholder={t('workflow.condition.comparePlaceholder')}
            onChange={(e) => update({ compare: e.target.value })}
          />
        )}
        {data.statusText && <p className="wf-node-status">{data.statusText}</p>}
      </div>
      <Port side="out" label={t('workflow.port.true')} color="#31c992" handleId="true" hideLabel={!portsExpanded} />
      <Port side="out" label={t('workflow.port.false')} color="#f87171" handleId="false" hideLabel={!portsExpanded} />
    </div>
  );
}

function DelayNode({ id, data }: NodeProps<WFNode>) {
  const t = useWorkflowT();
  const update = useUpdateNode(id);
  const { portsExpanded, togglePorts } = usePortsExpanded(id);
  return (
    <div className={wfNodeClass({ status: data.status, portsExpanded, extra: 'wf-node-control' })}>
      <NodeHead
        id={id}
        icon={<Timer size={14} />}
        title={t('workflow.node.delay')}
        status={data.status}
        collapsed={!portsExpanded}
        onToggleCollapse={togglePorts}
      />
      <Port side="in" label={t('workflow.port.activate')} hideLabel={!portsExpanded} />
      <div className="wf-gen-body nodrag">
        <div className="wf-node-row wf-node-inline">
          <input
            className="wf-gen-url nodrag"
            type="number"
            min={0}
            step={0.5}
            value={data.seconds ?? 1}
            onChange={(e) => update({ seconds: Number(e.target.value) })}
          />
          <span className="wf-node-suffix">{t('workflow.delay.seconds')}</span>
        </div>
        {data.statusText && <p className="wf-node-status">{data.statusText}</p>}
      </div>
      <Port side="out" label={t('workflow.port.done')} hideLabel={!portsExpanded} />
    </div>
  );
}

function LoopNode({ id, data }: NodeProps<WFNode>) {
  const t = useWorkflowT();
  const update = useUpdateNode(id);
  const { portsExpanded, togglePorts } = usePortsExpanded(id);
  return (
    <div className={wfNodeClass({ status: data.status, portsExpanded, extra: 'wf-node-control' })}>
      <NodeHead
        id={id}
        icon={<Repeat size={14} />}
        title={t('workflow.node.loop')}
        status={data.status}
        collapsed={!portsExpanded}
        onToggleCollapse={togglePorts}
      />
      <Port side="in" label={t('workflow.port.activate')} hideLabel={!portsExpanded} />
      <div className="wf-gen-body nodrag">
        <div className="wf-node-row wf-node-inline">
          <span className="wf-node-suffix">{t('workflow.loop.repeat')}</span>
          <input
            className="wf-gen-url nodrag"
            type="number"
            min={1}
            step={1}
            value={data.count ?? 3}
            onChange={(e) => update({ count: Number(e.target.value) })}
          />
          <span className="wf-node-suffix">{t('workflow.loop.times')}</span>
        </div>
        {data.statusText && <p className="wf-node-status">{data.statusText}</p>}
      </div>
      <Port side="out" label={t('workflow.port.eachLoop')} color="#fbbf24" handleId="each" hideLabel={!portsExpanded} />
      <Port side="out" label={t('workflow.port.loopDone')} handleId="done" hideLabel={!portsExpanded} />
    </div>
  );
}

function CloneNode({ id, data }: NodeProps<WFNode>) {
  const t = useWorkflowT();
  const { portsExpanded, togglePorts } = usePortsExpanded(id);
  return (
    <div className={wfNodeClass({ status: data.status, portsExpanded, extra: 'wf-node-control' })}>
      <NodeHead
        id={id}
        icon={<Copy size={14} />}
        title={t('workflow.node.clone')}
        status={data.status}
        collapsed={!portsExpanded}
        onToggleCollapse={togglePorts}
      />
      <Port side="in" label={t('workflow.port.input')} hideLabel={!portsExpanded} />
      <div className="wf-gen-body nodrag">
        <p className="wf-node-empty">{t('workflow.node.clone.empty')}</p>
      </div>
      <Port side="out" label={t('workflow.port.copy')} hideLabel={!portsExpanded} />
    </div>
  );
}

function NotifyNode({ id, data }: NodeProps<WFNode>) {
  const t = useWorkflowT();
  const update = useUpdateNode(id);
  const { portsExpanded, togglePorts } = usePortsExpanded(id);
  return (
    <div className={wfNodeClass({ status: data.status, portsExpanded, extra: 'wf-node-control' })}>
      <NodeHead
        id={id}
        icon={<Bell size={14} />}
        title={t('workflow.node.notify')}
        status={data.status}
        collapsed={!portsExpanded}
        onToggleCollapse={togglePorts}
      />
      <Port side="in" label={t('workflow.port.activate')} hideLabel={!portsExpanded} />
      <div className="wf-gen-body nodrag">
        <textarea
          className="wf-gen-prompt nodrag"
          value={data.prompt || ''}
          placeholder={t('workflow.node.notify.placeholder')}
          onChange={(e) => update({ prompt: e.target.value })}
        />
        {data.statusText && <p className="wf-node-status">{data.statusText}</p>}
      </div>
      <Port side="out" label={t('workflow.port.done')} hideLabel={!portsExpanded} />
    </div>
  );
}

const nodeTypes = {
  start: StartNode,
  text: TextNode,
  'input-image': InputImageNode,
  'input-video': InputVideoNode,
  image: ImageNode,
  video: VideoNode,
  tts: TtsNode,
  music: MusicNode,
  api: ApiNode,
  condition: ConditionNode,
  delay: DelayNode,
  loop: LoopNode,
  clone: CloneNode,
  notify: NotifyNode,
  note: NoteNode,
  output: OutputNode,
  end: EndNode,
  render: RenderNode,
  'upscale-image': UpscaleImageNode,
  lipsync: LipsyncNode,
  merge: MergeNode,
  'extract-media': ExtractMediaNode,
  agent: AgentNode,
  'remove-bg': RemoveBgNode,
  'upscale-video': UpscaleVideoNode,
  vfx: VfxNode,
  subtitle: SubtitleNode,
  cut: CutVideoNode,
  kols: KolsNode,
  'data-table': DataTableNode,
};

function WfEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  selected,
}: EdgeProps) {
  const t = useWorkflowT();
  const { deleteElements } = useReactFlow();
  const [hovered, setHovered] = useState(false);
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const active = hovered || selected;
  return (
    <g onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        interactionWidth={26}
        style={{
          ...style,
          stroke: active ? 'var(--brand, #2dd4bf)' : (style?.stroke as string | undefined),
          strokeWidth: active ? 2.5 : (style?.strokeWidth as number | undefined),
        }}
      />
      <EdgeLabelRenderer>
        <button
          type="button"
          className="wf-edge-del nodrag nopan"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            opacity: active ? 1 : 0,
          }}
          title={t('workflow.disconnectEdge')}
          onClick={() => deleteElements({ edges: [{ id }] })}
        >
          <X size={11} />
        </button>
      </EdgeLabelRenderer>
    </g>
  );
}

const edgeTypes = { wf: WfEdge };

function Palette({
  onAdd,
  open,
  onToggle,
}: {
  onAdd: (type: string) => void;
  open: boolean;
  onToggle: () => void;
}) {
  const t = useWorkflowT();
  const nodeGroups = useMemo(() => getNodeGroups(t), [t]);
  const [query, setQuery] = useState('');
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(nodeGroups.map((g) => [g.id, Boolean(g.defaultOpen)])),
  );
  const q = query.trim().toLowerCase();

  const onDragStart = (e: DragEvent, key: string) => {
    e.dataTransfer.setData('application/wf-node', key);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className={`wf-palette${open ? '' : ' collapsed'}`}>
      <div className="wf-palette-head">
        <span>{t('workflow.palette.title')}</span>
        <button
          type="button"
          className="wf-palette-toggle"
          onClick={onToggle}
          title={t('workflow.palette.collapseSidebar')}
        >
          <PanelLeftClose size={16} />
        </button>
      </div>
      <div className="wf-palette-search">
        <Search size={14} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('workflow.palette.searchPlaceholder')}
        />
      </div>

      <div className="wf-palette-groups">
        {nodeGroups.map((g) => {
          const nodes = q ? g.nodes.filter((n) => n.label.toLowerCase().includes(q)) : g.nodes;
          if (q && nodes.length === 0) return null;
          const groupOpen = q ? true : openMap[g.id];
          return (
            <section key={g.id} className="wf-group">
              <button
                type="button"
                className="wf-group-head"
                onClick={() => setOpenMap((m) => ({ ...m, [g.id]: !m[g.id] }))}
              >
                <span className="wf-group-icon">
                  <g.icon size={13} />
                </span>
                <span className="wf-group-name">{g.label}</span>
                <span className="wf-group-count">{g.nodes.length}</span>
                <ChevronDown size={14} className={`wf-group-caret${groupOpen ? ' open' : ''}`} />
              </button>
              {groupOpen && (
                <div className="wf-group-grid">
                  {nodes.map((n, i) => (
                    <button
                      key={`${g.id}-${n.key}-${i}`}
                      type="button"
                      className={`wf-tile${n.implemented ? '' : ' soon'}`}
                      draggable={n.implemented}
                      onDragStart={n.implemented ? (e) => onDragStart(e, n.key) : undefined}
                      onClick={n.implemented ? () => onAdd(n.key) : undefined}
                      disabled={!n.implemented}
                      title={
                        n.implemented
                          ? n.label
                          : t('workflow.soonTitle', { label: n.label })
                      }
                    >
                      <span className="wf-tile-icon">
                        <n.icon size={18} />
                      </span>
                      <span className="wf-tile-label">{n.label}</span>
                      {!n.implemented && <span className="wf-tile-soon">{t('workflow.soon')}</span>}
                    </button>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <button type="button" className="wf-mini-app" disabled title={t('workflow.soon')}>
        <LayoutGrid size={15} /> {t('workflow.miniApp')}
      </button>
    </aside>
  );
}

function defaultGraph(): { nodes: WFNode[]; edges: Edge[] } {
  return {
    nodes: [
      { id: 'start-1', type: 'start', position: { x: 20, y: 140 }, data: {} },
      { id: 'text-1', type: 'text', position: { x: 250, y: 100 }, data: { prompt: '' } },
      { id: 'image-1', type: 'image', position: { x: 540, y: 80 }, data: {} },
      { id: 'output-1', type: 'output', position: { x: 850, y: 100 }, data: {} },
      { id: 'end-1', type: 'end', position: { x: 1140, y: 150 }, data: {} },
    ],
    edges: [
      { id: 'e0', source: 'start-1', target: 'text-1', type: 'wf' },
      { id: 'e1', source: 'text-1', target: 'image-1', type: 'wf' },
      { id: 'e2', source: 'image-1', target: 'output-1', type: 'wf' },
      { id: 'e3', source: 'output-1', target: 'end-1', type: 'wf' },
    ],
  };
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

/** Đánh giá điều kiện cho node Điều kiện. */
function evalCondition(value: string, op: string, compare?: string): boolean {
  const v = (value ?? '').trim();
  const c = (compare ?? '').trim();
  switch (op) {
    case 'empty':
      return v.length === 0;
    case 'contains':
      return v.toLowerCase().includes(c.toLowerCase());
    case 'equals':
      return v === c;
    case 'gt':
      return Number(v) > Number(c);
    case 'lt':
      return Number(v) < Number(c);
    case 'not_empty':
    default:
      return v.length > 0;
  }
}

/** Sắp xếp topo; trả null nếu có chu trình. */
function topoSort(nodes: WFNode[], edges: Edge[]): WFNode[] | null {
  const indeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  nodes.forEach((n) => {
    indeg.set(n.id, 0);
    adj.set(n.id, []);
  });
  edges.forEach((e) => {
    if (!indeg.has(e.source) || !indeg.has(e.target)) return;
    adj.get(e.source)!.push(e.target);
    indeg.set(e.target, (indeg.get(e.target) || 0) + 1);
  });
  const queue = nodes.filter((n) => (indeg.get(n.id) || 0) === 0).map((n) => n.id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const next of adj.get(id) || []) {
      indeg.set(next, (indeg.get(next) || 0) - 1);
      if ((indeg.get(next) || 0) === 0) queue.push(next);
    }
  }
  if (order.length !== nodes.length) return null;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return order.map((id) => byId.get(id)!);
}

let nodeCounter = 100;

/** Tự dàn các node theo lớp (longest-path) — không cần thư viện ngoài. */
function autoLayout(nodes: WFNode[], edges: Edge[]): Record<string, { x: number; y: number }> {
  const adj = new Map<string, string[]>();
  const indeg = new Map<string, number>();
  nodes.forEach((n) => {
    adj.set(n.id, []);
    indeg.set(n.id, 0);
  });
  edges.forEach((e) => {
    if (!adj.has(e.source) || !indeg.has(e.target)) return;
    adj.get(e.source)!.push(e.target);
    indeg.set(e.target, (indeg.get(e.target) || 0) + 1);
  });

  // Layer bằng longest-path qua thứ tự Kahn (an toàn cả khi có chu trình).
  const layer = new Map<string, number>();
  nodes.forEach((n) => layer.set(n.id, 0));
  const queue = nodes.filter((n) => (indeg.get(n.id) || 0) === 0).map((n) => n.id);
  const localIndeg = new Map(indeg);
  let processed = 0;
  while (queue.length) {
    const id = queue.shift()!;
    processed++;
    for (const next of adj.get(id) || []) {
      layer.set(next, Math.max(layer.get(next) || 0, (layer.get(id) || 0) + 1));
      localIndeg.set(next, (localIndeg.get(next) || 0) - 1);
      if ((localIndeg.get(next) || 0) === 0) queue.push(next);
    }
  }
  if (processed < nodes.length) {
    // Có chu trình: xếp node còn lại vào lớp cuối.
    const maxLayer = Math.max(0, ...Array.from(layer.values()));
    nodes.forEach((n) => {
      if ((localIndeg.get(n.id) || 0) > 0) layer.set(n.id, maxLayer + 1);
    });
  }

  const COL_W = 300;
  const ROW_H = 170;
  const X0 = 60;
  const Y0 = 60;
  const perLayer = new Map<number, number>();
  const pos: Record<string, { x: number; y: number }> = {};
  // Giữ thứ tự ổn định theo vị trí hiện tại.
  const ordered = [...nodes].sort((a, b) => a.position.y - b.position.y);
  for (const n of ordered) {
    const l = layer.get(n.id) || 0;
    const row = perLayer.get(l) || 0;
    perLayer.set(l, row + 1);
    pos[n.id] = { x: X0 + l * COL_W, y: Y0 + row * ROW_H };
  }
  return pos;
}

interface BottomBarProps {
  running: boolean;
  error: string;
  onRun: () => void;
  onStop: () => void;
  onAutoLayout: () => void;
}

function BottomBar({ running, error, onRun, onStop, onAutoLayout }: BottomBarProps) {
  const t = useWorkflowT();
  const { zoomIn, zoomOut, fitView, deleteElements, getNodes } = useReactFlow();
  const zoom = useStore((s) => s.transform[2]);

  const deleteSelected = () => {
    const sel = getNodes().filter((n) => n.selected);
    if (sel.length) deleteElements({ nodes: sel });
  };

  return (
    <Panel position="bottom-center" className="wf-bottombar">
      <button type="button" className="wf-bb-btn" onClick={() => zoomOut()} title={t('workflow.toolbar.zoomOut')}>
        <ZoomOut size={16} />
      </button>
      <span className="wf-bb-zoom">{Math.round((zoom || 1) * 100)}%</span>
      <button type="button" className="wf-bb-btn" onClick={() => zoomIn()} title={t('workflow.toolbar.zoomIn')}>
        <ZoomIn size={16} />
      </button>
      <span className="wf-bb-sep" />
      <button
        type="button"
        className="wf-bb-btn"
        onClick={() => fitView({ duration: 300 })}
        title={t('workflow.toolbar.fitView')}
      >
        <Maximize size={16} />
      </button>
      <button
        type="button"
        className="wf-bb-btn"
        onClick={onAutoLayout}
        title={t('workflow.toolbar.autoLayout')}
      >
        <Workflow size={16} />
      </button>
      <button
        type="button"
        className="wf-bb-btn wf-bb-danger"
        onClick={deleteSelected}
        title={t('workflow.toolbar.deleteSelected')}
      >
        <Trash2 size={16} />
      </button>
      <span className="wf-bb-sep" />
      {error && <span className="wf-bb-error" title={error}>{error}</span>}
      {running ? (
        <button type="button" className="wf-bb-run wf-bb-stop" onClick={onStop}>
          <Square size={15} /> {t('workflow.toolbar.stop')}
        </button>
      ) : (
        <button type="button" className="wf-bb-run" onClick={onRun}>
          <Play size={15} /> {t('workflow.toolbar.run')}
        </button>
      )}
    </Panel>
  );
}

interface NewWorkflowModalProps {
  open: boolean;
  onCreate: (name: string) => void;
  onClose: () => void;
}

function NewWorkflowModal({ open, onCreate, onClose }: NewWorkflowModalProps) {
  const t = useWorkflowT();
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  const canCreate = name.trim().length > 0;
  const submit = () => {
    if (canCreate) onCreate(name);
  };

  return (
    <div className="wf-new-overlay" onClick={onClose}>
      <div className="wf-new-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="wf-new-title">{t('workflow.new.title')}</h3>
        <input
          ref={inputRef}
          className="wf-new-input"
          placeholder={t('workflow.new.placeholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') onClose();
          }}
        />
        <div className="wf-new-actions">
          <button type="button" className="wf-new-cancel" onClick={onClose}>
            {t('workflow.new.cancel')}
          </button>
          <button type="button" className="wf-new-create" onClick={submit} disabled={!canCreate}>
            {t('workflow.new.create')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Flow() {
  const { t } = useLocale();
  const initialState = useMemo(() => loadTabsState(defaultGraph()), []);
  const initialTab =
    initialState.tabs.find((t) => t.id === initialState.activeId) ?? initialState.tabs[0];

  const [tabs, setTabs] = useState<WorkflowTab[]>(initialState.tabs);
  const [activeId, setActiveId] = useState(initialState.activeId);
  const [nodes, setNodes, onNodesChange] = useNodesState<WFNode>(
    ensureImageSlots(initialTab.nodes as WFNode[]) as WFNode[],
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialTab.edges);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [libOpen, setLibOpen] = useState(false);
  const [libCount, setLibCount] = useState(() => loadTemplates().length);
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [canvasHintOpen, setCanvasHintOpen] = useState(() => !isWorkflowOnboardingDismissed());
  const [newOpen, setNewOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [mediaModal, setMediaModal] = useState<{
    nodeId: string;
    kind: MediaInputKind;
    draft: MediaInputDraft;
    isNew: boolean;
    position: { x: number; y: number };
  } | null>(null);
  const [portsExpandedNodeId, setPortsExpandedNodeId] = useState<string | null>(null);
  const [resultPreview, setResultPreview] = useState<{
    items: FeedItem[];
    index: number;
    kind: 'image' | 'video';
  } | null>(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const openedWftRef = useRef<string | null>(null);
  const togglePortsExpanded = useCallback((nodeId: string) => {
    setPortsExpandedNodeId((prev) => (prev === nodeId ? null : nodeId));
  }, []);

  const expandPortsOnNode = useCallback((nodeId: string) => {
    setPortsExpandedNodeId(nodeId);
  }, []);

  const collapsePorts = useCallback(() => {
    setPortsExpandedNodeId(null);
  }, []);

  const openResultPreview = useCallback(
    (nodeId: string, kind: 'image' | 'video') => {
      const items = collectWorkflowPreviewItems(nodes, kind);
      if (!items.length) return;
      const index = Math.max(
        0,
        items.findIndex((it) => it.id_base === nodeId),
      );
      setResultPreview({ items, index: index >= 0 ? index : 0, kind });
    },
    [nodes],
  );

  const abortRef = useRef<AbortController | null>(null);
  const { screenToFlowPosition, fitView, deleteElements } = useReactFlow();

  useEffect(() => {
    if (nodes.length > 0) setCanvasHintOpen(false);
  }, [nodes.length]);

  useEffect(() => {
    if (portsExpandedNodeId && !nodes.some((n) => n.id === portsExpandedNodeId)) {
      setPortsExpandedNodeId(null);
    }
  }, [nodes, portsExpandedNodeId]);

  useEffect(() => {
    setPortsExpandedNodeId(null);
  }, [activeId]);

  useEffect(() => onLibraryUpdated(() => setLibCount(loadTemplates().length)), []);

  const handleAutoLayout = () => {
    const pos = autoLayout(nodes, edges);
    setNodes((nds) => nds.map((n) => (pos[n.id] ? { ...n, position: pos[n.id] } : n)));
    setTimeout(() => fitView({ duration: 300 }), 60);
  };

  /** Agent apply graph lên canvas + lưu tab. */
  const applyAgentGraph = useCallback(
    (nextNodes: Node[], nextEdges: Edge[], opts?: { focusView?: boolean }) => {
      const patched = ensureImageSlots(nextNodes as WFNode[]) as WFNode[];
      setNodes(patched);
      setEdges(nextEdges);
      const now = new Date().toISOString();
      const updated = tabs.map((t) =>
        t.id === activeId ? { ...t, nodes: patched, edges: nextEdges, updatedAt: now } : t,
      );
      setTabs(updated);
      saveTabsState({ tabs: updated, activeId });
      if (opts?.focusView) {
        setTimeout(() => fitView({ duration: 300 }), 60);
      }
    },
    [tabs, activeId, setNodes, setEdges, fitView],
  );

  /** Ghi graph hiện tại vào tab đang mở. */
  const commitActive = useCallback((): WorkflowTab[] => {
    const now = new Date().toISOString();
    return tabs.map((t) =>
      t.id === activeId ? { ...t, nodes, edges, updatedAt: now } : t,
    );
  }, [tabs, activeId, nodes, edges]);

  const selectTab = (id: string) => {
    if (id === activeId) return;
    const updated = commitActive();
    const target = updated.find((t) => t.id === id);
    if (!target) return;
    setTabs(updated);
    setActiveId(id);
    setNodes(ensureImageSlots(target.nodes as WFNode[]) as WFNode[]);
    setEdges(target.edges);
    saveTabsState({ tabs: updated, activeId: id });
  };

  const newTab = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const updated = commitActive();
    const g = defaultGraph();
    const tpl = saveTemplate(trimmed, g);
    const tab = makeTab(tpl.name, g, tpl.id);
    const next = [...updated, tab];
    setTabs(next);
    setActiveId(tab.id);
    setNodes(g.nodes);
    setEdges(g.edges);
    saveTabsState({ tabs: next, activeId: tab.id });
    setNewOpen(false);
  };

  const closeTab = (id: string) => {
    if (tabs.length <= 1) return;
    const idx = tabs.findIndex((t) => t.id === id);
    const updated = commitActive().filter((t) => t.id !== id);
    let nextActive = activeId;
    if (id === activeId) {
      const neighbor = updated[Math.max(0, idx - 1)] ?? updated[0];
      nextActive = neighbor.id;
      setActiveId(nextActive);
      setNodes(ensureImageSlots(neighbor.nodes as WFNode[]) as WFNode[]);
      setEdges(neighbor.edges);
    }
    setTabs(updated);
    saveTabsState({ tabs: updated, activeId: nextActive });
  };

  const togglePin = (id: string) => {
    const base = id === activeId ? commitActive() : tabs;
    const updated = base.map((t) => (t.id === id ? { ...t, pinned: !t.pinned } : t));
    setTabs(updated);
    saveTabsState({ tabs: updated, activeId });
  };

  const updateNode = useCallback(
    (id: string, patch: Partial<NodeData>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
      );
    },
    [setNodes],
  );

  const isMediaNodeType = (type: string) => type === 'input-image' || type === 'input-video';

  const openMediaInputModal = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node?.type || !isMediaNodeType(node.type)) return;
      setMediaModal({
        nodeId,
        kind: node.type === 'input-image' ? 'image' : 'video',
        draft: draftFromNodeData(node.data as Record<string, unknown>),
        isNew: false,
        position: node.position,
      });
    },
    [nodes],
  );

  const ctx = useMemo<WorkflowCtxValue>(
    () => ({
      updateNode,
      openMediaInputModal,
      portsExpandedNodeId,
      togglePortsExpanded,
      imageSlotForNode: (nodeId: string) => getImageSlotForNode(nodeId, nodes),
      openResultPreview,
    }),
    [
      updateNode,
      openMediaInputModal,
      portsExpandedNodeId,
      togglePortsExpanded,
      nodes,
      openResultPreview,
    ],
  );

  const resultPreviewHandlers = useMemo((): ComposerPreviewHandlers => {
    if (!resultPreview) return {};
    const item = resultPreview.items[resultPreview.index];
    const mediaUrl = item
      ? feedMediaUrl(item) || feedThumb(item) || ''
      : '';
    const nodeId = item?.id_base;

    return {
      onRegenerate: nodeId
        ? () => {
            updateNode(nodeId, {
              status: 'idle',
              resultUrl: undefined,
              statusText: undefined,
              error: undefined,
              runStartedAt: undefined,
              runEndedAt: undefined,
            });
            setResultPreview(null);
          }
        : undefined,
      onCreateVideo:
        resultPreview.kind === 'image' && mediaUrl
          ? () => {
              setResultPreview(null);
              navigate('/video', {
                state: {
                  reuseHistory: {
                    type: 'video',
                    prompt: item?.prompt || '',
                    meta: { references: mediaUrl },
                  },
                },
              });
            }
          : undefined,
      onEdit: mediaUrl
        ? () => {
            setResultPreview(null);
            navigate('/image', {
              state: {
                reuseHistory: {
                  type: 'image',
                  prompt: item?.prompt || '',
                  meta: {},
                },
              },
            });
          }
        : undefined,
      onDelete: nodeId
        ? () => {
            updateNode(nodeId, {
              status: 'idle',
              resultUrl: undefined,
              statusText: undefined,
              error: undefined,
              runStartedAt: undefined,
              runEndedAt: undefined,
            });
            setResultPreview(null);
          }
        : undefined,
      onUpscaleDone: (url) => {
        void downloadMediaUrl(url);
        setResultPreview(null);
      },
    };
  }, [resultPreview, updateNode, navigate]);

  const onConnect = useCallback(
    (c: Connection) => setEdges((eds) => addEdge({ ...c, type: 'wf' }, eds)),
    [setEdges],
  );

  const addNodeAt = useCallback(
    (type: string, position: { x: number; y: number }) => {
      if (!(type in nodeTypes)) return;
      if (isMediaNodeType(type)) {
        const id = `${type}-${nodeCounter++}`;
        setMediaModal({
          nodeId: id,
          kind: type === 'input-image' ? 'image' : 'video',
          draft: defaultMediaInputDraft(),
          isNew: true,
          position,
        });
        return;
      }
      const id = `${type}-${nodeCounter++}`;
      const node: WFNode = { id, type, position, data: {} };
      setNodes((nds) => [...nds, node]);
    },
    [setNodes],
  );

  const addNode = useCallback(
    (type: string) =>
      addNodeAt(type, { x: 120 + Math.random() * 240, y: 80 + Math.random() * 240 }),
    [addNodeAt],
  );

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('application/wf-node');
      if (!type) return;
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addNodeAt(type, position);
    },
    [addNodeAt, screenToFlowPosition],
  );

  const handleSave = () => {
    saveWorkflow(nodes, edges);
    const updated = commitActive();
    setTabs(updated);
    saveTabsState({ tabs: updated, activeId });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const openTemplate = useCallback(
    (t: SavedTemplate) => {
      const updated = commitActive();
      const patched = ensureImageSlots(t.nodes as WFNode[]) as WFNode[];
      const tab = makeTab(t.name, { nodes: patched, edges: t.edges }, t.id);
      const next = [...updated, tab];
      setTabs(next);
      setActiveId(tab.id);
      setNodes(patched);
      setEdges(t.edges);
      saveWorkflow(patched, t.edges);
      saveTabsState({ tabs: next, activeId: tab.id });
    },
    [commitActive, setTabs, setActiveId, setNodes, setEdges],
  );

  useEffect(() => {
    const wftId = searchParams.get('wft')?.trim();
    if (!wftId || openedWftRef.current === wftId) return;
    const tpl = getTemplate(wftId);
    if (!tpl) return;
    openedWftRef.current = wftId;
    openTemplate(tpl);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('wft');
        return next;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams, openTemplate]);

  const handleClear = () => {
    if (!window.confirm(t('workflow.confirm.clearDiagram'))) return;
    clearWorkflow();
    const g = defaultGraph();
    setNodes(g.nodes);
    setEdges(g.edges);
    const now = new Date().toISOString();
    const updated = tabs.map((t) =>
      t.id === activeId ? { ...t, nodes: g.nodes, edges: g.edges, updatedAt: now } : t,
    );
    setTabs(updated);
    saveTabsState({ tabs: updated, activeId });
  };

  const stop = () => {
    abortRef.current?.abort();
    setRunning(false);
  };

  const saveMediaModal = (draft: MediaInputDraft) => {
    if (!mediaModal) return;
    const data: Partial<NodeData> = {
      ...draft,
      configured: true,
      resultUrl: draft.mediaUrls[0] || '',
    };
    if (mediaModal.isNew) {
      setNodes((nds) => {
        const nodeData: Partial<NodeData> = { ...data };
        if (mediaModal.kind === 'image') {
          nodeData.imageSlot = nextImageSlot(nds);
        }
        return [
          ...nds,
          {
            id: mediaModal.nodeId,
            type: mediaModal.kind === 'image' ? 'input-image' : 'input-video',
            position: mediaModal.position,
            data: nodeData,
          },
        ];
      });
    } else {
      updateNode(mediaModal.nodeId, data);
    }
    setMediaModal(null);
  };

  const deleteMediaModalNode = () => {
    if (!mediaModal) return;
    if (!mediaModal.isNew) {
      deleteElements({ nodes: [{ id: mediaModal.nodeId }] });
    }
    setMediaModal(null);
  };

  async function runWorkflow() {
    setError('');

    const hasControl = nodes.some((n) => n.type === 'condition' || n.type === 'loop');
    let order: WFNode[] | null = null;
    if (!hasControl) {
      order = topoSort(nodes, edges);
      if (!order) {
        setError(t('workflow.error.cycle'));
        return;
      }
    }

    const ac = new AbortController();
    abortRef.current = ac;
    const signal = ac.signal;
    setRunning(true);

    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          status: 'idle' as WFStatus,
          statusText: undefined,
          error: undefined,
          runStartedAt: undefined,
          runEndedAt: undefined,
        },
      })),
    );

    const outputs: Record<string, string> = {};
    const outputByHandle: Record<string, Record<string, string>> = {};
    const usedMediaUrls = new Set<string>();
    const incoming = (id: string) => edges.filter((e) => e.target === id).map((e) => e.source);

    const resolveEdgeOutput = (edge: Edge): string | undefined => {
      const byHandle = outputByHandle[edge.source];
      if (edge.sourceHandle && byHandle?.[edge.sourceHandle]) {
        return byHandle[edge.sourceHandle];
      }
      return outputs[edge.source];
    };

    const getInputs = (id: string) => {
      const ins = edges.filter((e) => e.target === id);
      const ups = ins
        .map((e) => resolveEdgeOutput(e))
        .filter((u): u is string => Boolean(u));
      return {
        upText: ups.find((u) => !/^https?:\/\//i.test(u)),
        upUrl: ups.find((u) => /^https?:\/\//i.test(u)),
      };
    };

    const inputOnHandle = (nodeId: string, handleId: string): string | undefined => {
      const edge = edges.find(
        (e) => e.target === nodeId && (e.targetHandle ?? null) === handleId,
      );
      if (!edge) return undefined;
      return resolveEdgeOutput(edge);
    };

    /** Chạy một node; trả về output (chuỗi) và/hoặc nhánh rẽ cho node Điều kiện. */
    async function processNode(
      node: WFNode,
      upText?: string,
      upUrl?: string,
    ): Promise<{ output?: string; branch?: 'true' | 'false' }> {
      switch (node.type) {
        case 'note':
          return {};
        case 'start':
          updateNode(node.id, { status: 'done' });
          return {};
        case 'end':
          updateNode(node.id, { status: 'done', statusText: t('workflow.status.complete') });
          return {};
        case 'delay': {
          const secs = Math.max(0, Number(node.data.seconds ?? 1));
          updateNode(node.id, {
            status: 'running',
            statusText: t('workflow.status.waitSeconds', { secs }),
          });
          await sleep(secs * 1000, signal);
          updateNode(node.id, { status: 'done', statusText: undefined });
          return { output: upUrl || upText || '' };
        }
        case 'clone':
          updateNode(node.id, { status: 'done' });
          return { output: upUrl || upText || '' };
        case 'notify': {
          const msg = String(
            node.data.prompt || upText || upUrl || t('workflow.status.empty'),
          );
          updateNode(node.id, {
            status: 'done',
            statusText: t('workflow.status.sent', { msg: msg.slice(0, 40) }),
          });
          return { output: upUrl || upText || '' };
        }
        case 'condition': {
          const value = upText || upUrl || '';
          const ok = evalCondition(value, String(node.data.op || 'not_empty'), node.data.compare);
          updateNode(node.id, {
            status: 'done',
            statusText: ok ? t('workflow.status.true') : t('workflow.status.false'),
          });
          return { output: value, branch: ok ? 'true' : 'false' };
        }
        case 'loop':
          // Vòng lặp được xử lý ở activate(); ở đây chỉ truyền dữ liệu qua.
          return { output: upUrl || upText || '' };
        case 'text': {
          const wired = inputOnHandle(node.id, 'text-in');
          const value = String(wired || node.data.prompt || '');
          updateNode(node.id, { status: 'done', prompt: value });
          outputByHandle[node.id] = {
            done: value || 'ok',
            'text-out': value,
          };
          outputs[node.id] = value;
          return { output: value };
        }
        case 'input-image':
        case 'input-video': {
          const draft = draftFromNodeData(node.data as Record<string, unknown>);
          const resolved = resolveMediaInputUrls(
            node.id,
            node.data as Record<string, unknown>,
            edges,
            outputs,
            usedMediaUrls,
          );
          let primary = resolved.primary;
          let frameUrl = resolved.firstFrame;

          if (node.type === 'input-video' && primary) {
            updateNode(node.id, { status: 'running', statusText: t('workflow.status.extractFrame') });
            frameUrl = await extractVideoFirstFrame(primary);
          }

          if (!primary && draft.required) {
            updateNode(node.id, { status: 'error', error: t('workflow.error.noMediaRequired') });
            throw new Error(t('workflow.error.noMediaRequired'));
          }

          if (!primary && !draft.required) {
            updateNode(node.id, { status: 'done', statusText: t('workflow.status.skipOptional') });
            outputByHandle[node.id] = { done: 'ok', 'media-out': '', all: '[]', 'first-frame': '' };
            return { output: '' };
          }

          outputByHandle[node.id] =
            node.type === 'input-image'
              ? {
                  done: primary,
                  'media-out': primary,
                  all: JSON.stringify(resolved.all),
                }
              : {
                  done: primary,
                  'media-out': primary,
                  'first-frame': frameUrl || primary,
                };

          outputs[node.id] = primary;
          updateNode(node.id, {
            status: 'done',
            resultUrl: primary,
            statusText: undefined,
            error: undefined,
          });
          return { output: primary };
        }
        case 'api': {
          const url = String(node.data.url || '').trim();
          if (!url) {
            updateNode(node.id, { status: 'error', error: t('workflow.error.noUrl') });
            throw new Error(t('workflow.error.noUrl'));
          }
          const method = String(node.data.method || 'GET').toUpperCase();
          const body = String(node.data.prompt || upText || '').trim();
          updateNode(node.id, { status: 'running', statusText: `${method}…` });
          try {
            const hasBody = method !== 'GET' && method !== 'HEAD' && body.length > 0;
            const res = await fetch(url, {
              method,
              headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
              body: hasBody ? body : undefined,
              signal,
            });
            const text = await res.text();
            updateNode(node.id, {
              status: res.ok ? 'done' : 'error',
              statusText: `HTTP ${res.status}`,
              error: res.ok ? undefined : `HTTP ${res.status}`,
            });
            if (!res.ok) throw new Error(`Gọi API lỗi HTTP ${res.status}`);
            return { output: text };
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            updateNode(node.id, { status: 'error', statusText: undefined, error: msg });
            throw err;
          }
        }
        case 'output': {
          const imageUrl = inputOnHandle(node.id, 'image');
          const videoUrl = inputOnHandle(node.id, 'video');
          const audioUrl = inputOnHandle(node.id, 'audio');
          const textVal = inputOnHandle(node.id, 'text');
          const dataVal = inputOnHandle(node.id, 'data');
          const noteVal = inputOnHandle(node.id, 'note');
          const primary =
            imageUrl ||
            videoUrl ||
            audioUrl ||
            upUrl ||
            textVal ||
            dataVal ||
            noteVal ||
            upText ||
            '';
          const mediaUrl = [imageUrl, videoUrl, audioUrl, upUrl].find(
            (u): u is string => Boolean(u && isHttpUrl(u)),
          );
          updateNode(node.id, {
            resultUrl: mediaUrl,
            text: !mediaUrl && primary ? primary : undefined,
            prompt: !mediaUrl && primary ? primary : undefined,
            status: primary ? 'done' : 'error',
            error: primary ? undefined : t('workflow.error.noInput'),
          });
          outputByHandle[node.id] = {
            done: primary || 'ok',
            out: primary,
          };
          outputs[node.id] = primary;
          return { output: primary };
        }
        case 'render': {
          const videoUrl = inputOnHandle(node.id, 'video') || upUrl;
          if (!videoUrl) {
            updateNode(node.id, { status: 'error', error: t('workflow.error.noVideoInput') });
            throw new Error(t('workflow.error.noVideoInput'));
          }
          updateNode(node.id, {
            status: 'done',
            resultUrl: videoUrl,
            statusText: t('workflow.status.mergedPassThrough'),
          });
          outputByHandle[node.id] = { done: videoUrl, video: videoUrl };
          outputs[node.id] = videoUrl;
          return { output: videoUrl };
        }
        case 'upscale-image': {
          const imageUrl = inputOnHandle(node.id, 'image') || upUrl;
          if (!imageUrl) {
            updateNode(node.id, { status: 'error', error: t('workflow.error.noImageInput') });
            throw new Error(t('workflow.error.noImageInput'));
          }
          const mode = String(node.data.mode || 'standard');
          const resolution = String(node.data.resolution || '2k');
          const modelId = String(node.data.modelId || '');
          updateNode(node.id, { status: 'running', statusText: t('workflow.status.upscaling') });
          try {
            const url = await runImageUpscale(
              imageUrl,
              { mode, resolution, modelId: modelId || undefined },
              (s) => updateNode(node.id, { statusText: s }),
            );
            outputByHandle[node.id] = { done: url, 'media-out': url };
            outputs[node.id] = url;
            updateNode(node.id, {
              status: 'done',
              resultUrl: url,
              statusText: undefined,
              error: undefined,
            });
            return { output: url };
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            updateNode(node.id, { status: 'error', statusText: undefined, error: msg });
            throw err;
          }
        }
        case 'lipsync': {
          const imageUrl = inputOnHandle(node.id, 'image') || upUrl;
          const audioUrl = inputOnHandle(node.id, 'audio');
          const promptText = String(
            inputOnHandle(node.id, 'text') || node.data.prompt || upText || '',
          );
          if (!imageUrl) {
            updateNode(node.id, { status: 'error', error: t('workflow.error.noFaceImage') });
            throw new Error(t('workflow.error.noFaceImage'));
          }
          if (!audioUrl) {
            updateNode(node.id, { status: 'error', error: t('workflow.error.noAudio') });
            throw new Error(t('workflow.error.noAudio'));
          }
          const modelId = String(node.data.modelId || '');
          if (!modelId) {
            updateNode(node.id, { status: 'error', error: t('workflow.error.noModel') });
            throw new Error(t('workflow.error.noModel'));
          }
          const selections: JobSelections = {
            prompt: promptText || undefined,
            images: [imageUrl],
            references: [imageUrl, audioUrl],
            subjects: [imageUrl],
            extra: { audio_url: audioUrl, audio: audioUrl },
          };
          updateNode(node.id, { status: 'running', statusText: t('workflow.status.starting') });
          try {
            const url = await runNodeJob({
              type: 'avatar-lipsync',
              modelId,
              selections,
              onStatus: (s) => updateNode(node.id, { statusText: s }),
              signal,
            });
            outputByHandle[node.id] = { done: url, 'media-out': url };
            outputs[node.id] = url;
            updateNode(node.id, {
              status: 'done',
              resultUrl: url,
              statusText: undefined,
              error: undefined,
            });
            return { output: url };
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            updateNode(node.id, { status: 'error', statusText: undefined, error: msg });
            throw err;
          }
        }
        case 'merge': {
          const handleIds = ['data', 'image', 'video', 'audio', 'text'] as const;
          const items: string[] = [];
          for (const h of handleIds) {
            const v = inputOnHandle(node.id, h);
            if (v?.trim()) items.push(v.trim());
          }
          if (upUrl && !items.includes(upUrl)) items.push(upUrl);
          if (upText && !items.includes(upText)) items.push(upText);
          const unique = [...new Set(items.filter(Boolean))];
          const primary =
            unique.find((u) => isHttpUrl(u)) || unique[0] || '';
          const mediaUrl = unique.find((u) => isHttpUrl(u));
          const allJson = JSON.stringify(unique);
          updateNode(node.id, {
            resultUrl: mediaUrl,
            prompt: !mediaUrl && primary ? primary : undefined,
            allJson,
            status: unique.length ? 'done' : 'error',
            error: unique.length ? undefined : t('workflow.error.noMergeData'),
          });
          outputByHandle[node.id] = {
            done: primary || 'ok',
            out: primary,
            all: allJson,
          };
          outputs[node.id] = primary;
          return { output: primary };
        }
        case 'extract-media': {
          const mediaUrl = inputOnHandle(node.id, 'media-in') || upUrl || '';
          if (!mediaUrl) {
            updateNode(node.id, { status: 'error', error: t('workflow.error.noMediaInput') });
            throw new Error(t('workflow.error.noMediaInput'));
          }
          const lower = mediaUrl.toLowerCase();
          const isVideo = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(lower);
          const isAudio = /\.(mp3|wav|ogg|m4a|aac)(\?|$)/i.test(lower);
          const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(lower);

          let firstFrame = '';
          if (isVideo) {
            updateNode(node.id, { status: 'running', statusText: t('workflow.status.extractFrame') });
            try {
              firstFrame = await extractVideoFirstFrame(mediaUrl);
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              updateNode(node.id, { status: 'error', statusText: undefined, error: msg });
              throw err;
            }
          }

          const kindLabel = isVideo
            ? t('workflow.status.kindVideo')
            : isAudio
              ? t('workflow.status.kindAudio')
              : isImage
                ? t('workflow.status.kindImage')
                : t('workflow.status.kindMedia');
          outputByHandle[node.id] = {
            done: mediaUrl,
            'media-out': mediaUrl,
            'first-frame': firstFrame || (isImage ? mediaUrl : ''),
            image: isImage ? mediaUrl : firstFrame || '',
            video: isVideo ? mediaUrl : '',
            audio: isAudio ? mediaUrl : '',
          };
          outputs[node.id] = mediaUrl;
          updateNode(node.id, {
            status: 'done',
            resultUrl: firstFrame || mediaUrl,
            statusText: kindLabel,
            error: undefined,
          });
          return { output: mediaUrl };
        }
        case 'agent': {
          const promptText = String(
            inputOnHandle(node.id, 'text-in') || node.data.prompt || upText || '',
          ).trim();
          if (!promptText) {
            updateNode(node.id, { status: 'error', error: t('workflow.error.noPrompt') });
            throw new Error(t('workflow.error.noPrompt'));
          }
          if (!isGommoChatConfigured()) {
            updateNode(node.id, { status: 'error', error: t('workflow.error.notLoggedIn') });
            throw new Error(t('workflow.error.notLoggedIn'));
          }
          const chatModel = resolveAgentChatModel(String(node.data.modelId || ''));
          const tabName = tabs.find((t) => t.id === activeId)?.name || 'Workflow';
          const snapshot = buildWorkflowSnapshot(tabName, nodes, edges);
          updateNode(node.id, { status: 'running', statusText: t('workflow.status.askingAgent') });
          try {
            const raw = await askGommo(promptText, {
              history: [],
              firstTurn: true,
              sessionId: `wf-node-${node.id}`,
              workflowSnapshot: snapshot,
              signal,
              config: {
                ...WORKFLOW_CHAT_CONFIG,
                model: chatModel.model,
                server: chatModel.server,
              },
              onDelta: () => updateNode(node.id, { statusText: t('workflow.status.receivingAgent') }),
            });
            const reply = formatAgentDisplayContent(raw) || raw.trim();
            outputByHandle[node.id] = { done: reply || 'ok', 'text-out': reply };
            outputs[node.id] = reply;
            updateNode(node.id, {
              status: 'done',
              text: reply,
              prompt: promptText,
              statusText: undefined,
              error: undefined,
            });
            return { output: reply };
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            updateNode(node.id, { status: 'error', statusText: undefined, error: msg });
            throw err;
          }
        }
        case 'remove-bg':
        case 'upscale-video':
        case 'vfx':
        case 'subtitle':
        case 'cut': {
          const modelId = String(node.data.modelId || '');
          if (!modelId) {
            updateNode(node.id, { status: 'error', error: t('workflow.error.noModel') });
            throw new Error(t('workflow.error.noModel'));
          }
          const imageUrl = inputOnHandle(node.id, 'image') || (node.type === 'remove-bg' ? upUrl : undefined);
          const videoUrl =
            inputOnHandle(node.id, 'video') ||
            (node.type !== 'remove-bg' ? upUrl : undefined);
          const audioUrl = inputOnHandle(node.id, 'audio');
          const textVal = String(
            inputOnHandle(node.id, 'text') || node.data.prompt || upText || '',
          );
          if (node.type === 'remove-bg' && !imageUrl) {
            updateNode(node.id, { status: 'error', error: t('workflow.error.noImageInput') });
            throw new Error(t('workflow.error.noImageInput'));
          }
          if (node.type !== 'remove-bg' && !videoUrl) {
            updateNode(node.id, { status: 'error', error: t('workflow.error.noVideoInput') });
            throw new Error(t('workflow.error.noVideoInput'));
          }
          updateNode(node.id, { status: 'running', statusText: t('workflow.status.starting') });
          try {
            const url = await runWorkflowProcessJob(
              node.type,
              modelId,
              {
                imageUrl,
                videoUrl,
                audioUrl,
                text: textVal,
                mode: String(node.data.mode || ''),
                resolution: String(node.data.resolution || ''),
                startSec: Number(node.data.startSec ?? 0),
                endSec: Number(node.data.endSec ?? 0),
              },
              {
                onStatus: (s) => updateNode(node.id, { statusText: s }),
                signal,
              },
            );
            outputByHandle[node.id] = { done: url, 'media-out': url };
            outputs[node.id] = url;
            updateNode(node.id, {
              status: 'done',
              resultUrl: url,
              statusText: undefined,
              error: undefined,
            });
            return { output: url };
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            updateNode(node.id, { status: 'error', statusText: undefined, error: msg });
            throw err;
          }
        }
        case 'kols': {
          const kol = getWorkflowKol(String(node.data.kolId)) || WORKFLOW_KOLS[0];
          const imageUrl = String(node.data.customImageUrl || kol?.imageUrl || '');
          const name = kol?.name || '';
          if (!imageUrl) {
            updateNode(node.id, { status: 'error', error: t('workflow.error.noKolImage') });
            throw new Error(t('workflow.error.noKolImage'));
          }
          updateNode(node.id, {
            status: 'done',
            resultUrl: imageUrl,
            prompt: name,
            error: undefined,
          });
          outputByHandle[node.id] = {
            done: imageUrl,
            image: imageUrl,
            'text-out': name,
          };
          outputs[node.id] = imageUrl;
          return { output: imageUrl };
        }
        case 'data-table': {
          const wired =
            inputOnHandle(node.id, 'data') || inputOnHandle(node.id, 'text') || upText || '';
          const raw = String(wired || node.data.tableRaw || node.data.prompt || '');
          const table = parseTableInput(raw);
          if (!table.rows.length) {
            updateNode(node.id, { status: 'error', error: t('workflow.error.parseTable') });
            throw new Error(t('workflow.error.parseTable'));
          }
          const json = tableToJson(table.rows);
          const first = Object.values(table.rows[0]).join(', ');
          updateNode(node.id, {
            status: 'done',
            tableRaw: raw,
            allJson: json,
            prompt: json,
            error: undefined,
          });
          outputByHandle[node.id] = {
            done: json,
            'text-out': json,
            out: first,
          };
          outputs[node.id] = json;
          return { output: json };
        }
        default: {
          const type = node.type as JobType;
          const selections: JobSelections = {};
          const promptWire = inputOnHandle(node.id, 'prompt');
          const refWire = inputOnHandle(node.id, 'ref');
          const promptText = String(
            node.data.prompt || (type !== 'tts' ? promptWire : '') || upText || '',
          );

          if (type === 'tts') {
            selections.text = node.data.text || promptWire || upText || node.data.prompt || '';
          } else {
            selections.prompt = promptText;
          }

          if (type === 'image') {
            const references = resolveImageReferencesForJob({
              prompt: promptText,
              nodes,
              outputs,
              outputByHandle,
              targetNodeId: node.id,
              edges,
              resolveEdgeOutput,
              fallbackUrl: refWire || upUrl,
            });
            if (references.length) selections.references = references;
          } else if (type === 'video') {
            const frameUrl = refWire || upUrl;
            if (frameUrl && /^https?:\/\//i.test(frameUrl)) {
              selections.images = [frameUrl];
            }
          }

          if (node.data.ratio) selections.ratio = String(node.data.ratio);
          if (node.data.mode) selections.mode = String(node.data.mode);
          if (node.data.resolution) selections.resolution = String(node.data.resolution);
          if (node.data.duration) selections.duration = String(node.data.duration);

          const modelId = String(node.data.modelId || '');
          if (!modelId) {
            updateNode(node.id, { status: 'error', error: t('workflow.error.noModel') });
            throw new Error(t('workflow.error.noModel'));
          }

          const startedAt = Date.now();
          updateNode(node.id, {
            status: 'running',
            statusText: t('workflow.status.starting'),
            runStartedAt: startedAt,
            runEndedAt: undefined,
          });
          try {
            const url = await runNodeJob({
              type,
              modelId,
              selections,
              onStatus: (s) => updateNode(node.id, { statusText: s }),
              signal,
            });
            if (type === 'image' || type === 'video') {
              outputByHandle[node.id] = {
                done: url,
                'media-out': url,
                all: JSON.stringify([url]),
                prompt: promptText,
              };
            }
            outputs[node.id] = url;
            updateNode(node.id, {
              status: 'done',
              resultUrl: url,
              statusText: undefined,
              runEndedAt: Date.now(),
              prompt: promptText || String(node.data.prompt || ''),
              modelName: String(node.data._modelName || node.data.modelName || modelId),
            });
            return { output: url };
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            updateNode(node.id, {
              status: 'error',
              statusText: undefined,
              error: msg,
              runEndedAt: Date.now(),
            });
            throw err;
          }
        }
      }
    }

    try {
      if (!hasControl && order) {
        // Đồ thị tuyến tính: chạy 1 lượt theo topo (xử lý join chính xác).
        for (const node of order) {
          const { upText, upUrl } = getInputs(node.id);
          const res = await processNode(node, upText, upUrl);
          if (res.output !== undefined) outputs[node.id] = res.output;
        }
      } else {
        // Có node điều khiển: chạy theo activation, hỗ trợ rẽ nhánh + lặp.
        const byId = new Map(nodes.map((n) => [n.id, n]));
        const targetsOf = (id: string, handle?: string) =>
          edges
            .filter(
              (e) => e.source === id && (handle == null || (e.sourceHandle ?? null) === handle),
            )
            .map((e) => e.target);
        const reachable = (starts: string[], stopId: string) => {
          const seen = new Set<string>();
          const stack = [...starts];
          while (stack.length) {
            const cur = stack.pop()!;
            if (cur === stopId || seen.has(cur)) continue;
            seen.add(cur);
            for (const t of edges.filter((e) => e.source === cur).map((e) => e.target)) {
              stack.push(t);
            }
          }
          return seen;
        };

        const done = new Set<string>();
        let steps = 0;

        const activate = async (id: string): Promise<void> => {
          if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
          if (++steps > 2000) throw new Error(t('workflow.error.tooManySteps'));
          const node = byId.get(id);
          if (!node || done.has(id)) return;

          const { upText, upUrl } = getInputs(id);
          const res = await processNode(node, upText, upUrl);
          if (res.output !== undefined) outputs[id] = res.output;
          done.add(id);

          if (node.type === 'condition') {
            for (const t of targetsOf(id, res.branch === 'true' ? 'true' : 'false')) {
              await activate(t);
            }
            return;
          }

          if (node.type === 'loop') {
            const eachTargets = targetsOf(id, 'each');
            const body = reachable(eachTargets, id);
            const count = Math.max(1, Math.floor(Number(node.data.count ?? 3)));
            for (let i = 0; i < count; i++) {
              if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
              updateNode(id, {
                status: 'running',
                statusText: t('workflow.status.loopRound', { current: i + 1, total: count }),
              });
              for (const b of body) done.delete(b);
              for (const tgt of eachTargets) await activate(tgt);
            }
            updateNode(id, { status: 'done', statusText: t('workflow.status.loopDone', { count }) });
            for (const t of targetsOf(id, 'done')) await activate(t);
            return;
          }

          for (const t of targetsOf(id)) await activate(t);
        };

        const roots = nodes.filter((n) => incoming(n.id).length === 0);
        if (roots.length === 0) throw new Error(t('workflow.error.noStartNode'));
        for (const r of roots) await activate(r.id);
      }
    } catch (err) {
      if ((err as { name?: string })?.name !== 'AbortError') {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setRunning(false);
    }
  }

  return (
    <WorkflowI18nCtx.Provider value={t}>
    <WorkflowCtx.Provider value={ctx}>
      <AiGenControlsProvider cancelWorkflow={stop} workflowRunning={running}>
      <div className="wf-page">
        <WorkflowTopBar
          tabs={tabs}
          activeId={activeId}
          libraryCount={libCount}
          onSelect={selectTab}
          onClose={closeTab}
          onNew={() => setNewOpen(true)}
          onTogglePin={togglePin}
          onOpenLibrary={() => setLibOpen(true)}
          saved={saved}
          onSave={handleSave}
          onClear={handleClear}
        />
        <div className={`wf-shell${agentOpen ? ' agent-open' : ''}`}>
        <Palette onAdd={addNode} open={paletteOpen} onToggle={() => setPaletteOpen(false)} />

        <div className="wf-canvas" onDragOver={onDragOver} onDrop={onDrop}>
          {!paletteOpen && (
            <button
              type="button"
              className="wf-palette-reopen"
              onClick={() => setPaletteOpen(true)}
              title={t('workflow.palette.reopenSidebar')}
            >
              <PanelLeftOpen size={16} />
            </button>
          )}
          {canvasHintOpen && nodes.length === 0 && (
            <WorkflowStudioOnboarding
              onOpenPalette={() => {
                setPaletteOpen(true);
                setCanvasHintOpen(false);
              }}
              onOpenLibrary={() => {
                setLibOpen(true);
                setCanvasHintOpen(false);
              }}
              onDismiss={() => setCanvasHintOpen(false)}
            />
          )}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            minZoom={0.1}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => expandPortsOnNode(node.id)}
            onPaneClick={collapsePorts}
            onNodeDoubleClick={(_, node) => {
              if (node.type && isMediaNodeType(node.type)) {
                openMediaInputModal(node.id);
              }
            }}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={{ type: 'wf' }}
            fitView
            deleteKeyCode={['Backspace', 'Delete']}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={18} />
            <MiniMap
              pannable
              zoomable
              bgColor="#101a14"
              maskColor="rgba(10, 15, 13, 0.55)"
              nodeColor="#1a2e24"
              nodeStrokeColor="rgba(79, 223, 98, 0.209)"
              nodeBorderRadius={4}
            />
            <BottomBar
              running={running}
              error={error}
              onRun={runWorkflow}
              onStop={stop}
              onAutoLayout={handleAutoLayout}
            />
          </ReactFlow>
        </div>

        <WorkflowAgentPanel
          open={agentOpen}
          onOpenChange={setAgentOpen}
          tabName={tabs.find((t) => t.id === activeId)?.name ?? 'Workflow'}
          nodes={nodes}
          edges={edges}
          onApplyGraph={applyAgentGraph}
        />
        </div>
      </div>

      <WorkflowLibrary
        open={libOpen}
        currentGraph={() => ({ nodes, edges })}
        onOpenTemplate={openTemplate}
        onClose={() => setLibOpen(false)}
      />

      <NewWorkflowModal open={newOpen} onCreate={newTab} onClose={() => setNewOpen(false)} />

      {mediaModal && (
        <WorkflowMediaInputModal
          open
          kind={mediaModal.kind}
          draft={mediaModal.draft}
          isNew={mediaModal.isNew}
          onSave={saveMediaModal}
          onDelete={deleteMediaModalNode}
          onClose={() => setMediaModal(null)}
        />
      )}

      {resultPreview && resultPreview.items.length > 0 && (
        <ComposerLibraryPreviewModal
          items={resultPreview.items}
          index={Math.min(resultPreview.index, resultPreview.items.length - 1)}
          kind={resultPreview.kind}
          onClose={() => setResultPreview(null)}
          onNavigate={(i) => setResultPreview((p) => (p ? { ...p, index: i } : p))}
          handlers={resultPreviewHandlers}
        />
      )}
      </AiGenControlsProvider>
    </WorkflowCtx.Provider>
    </WorkflowI18nCtx.Provider>
  );
}

export default function WorkflowPage() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  );
}
