import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type DragEvent,
  type ReactNode,
} from 'react';
import {
  addEdge,
  BaseEdge,
  Background,
  EdgeLabelRenderer,
  getBezierPath,
  Handle,
  MiniMap,
  Panel,
  Position,
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
  Sparkles,
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
import WorkflowAgentPanel from '../components/workflow/WorkflowAgentPanel';
import WorkflowMediaInputModal from '../components/workflow/WorkflowMediaInputModal';
import {
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
import type { ProjectItemType } from '../services/projectStore';
import {
  defaultMediaInputDraft,
  draftFromNodeData,
  extractVideoFirstFrame,
  MEDIA_INPUT_PORTS,
  resolveMediaInputUrls,
  type MediaInputDraft,
  type MediaInputKind,
} from '../services/workflowMediaInput';

type WFStatus = 'idle' | 'running' | 'done' | 'error';

interface NodeData {
  modelId?: string;
  prompt?: string;
  text?: string;
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
  [key: string]: unknown;
}

type WFNode = Node<NodeData>;

interface WorkflowCtxValue {
  updateNode: (id: string, patch: Partial<NodeData>) => void;
  openMediaInputModal: (nodeId: string) => void;
}

const WorkflowCtx = createContext<WorkflowCtxValue>({
  updateNode: () => {},
  openMediaInputModal: () => {},
});

function useUpdateNode(id: string) {
  const { updateNode } = useContext(WorkflowCtx);
  return useCallback((patch: Partial<NodeData>) => updateNode(id, patch), [id, updateNode]);
}

function guessProjectType(url: string): ProjectItemType {
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)) return 'video';
  if (/\.(mp3|wav|ogg|m4a)(\?|$)/i.test(url)) return 'tts';
  return 'image';
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
}: {
  id: string;
  icon: ReactNode;
  title: string;
  status?: WFStatus;
  showStatus?: boolean;
}) {
  const del = useDeleteNode(id);
  return (
    <div className="wf-node-head">
      <span className="wf-node-title">
        {icon} {title}
      </span>
      <span className="wf-node-head-right">
        {showStatus && <StatusDot status={status} />}
        <button type="button" className="wf-node-del nodrag" title="Xóa node" onClick={del}>
          <X size={13} />
        </button>
      </span>
    </div>
  );
}

function Port({
  side,
  label,
  color,
  handleId,
}: {
  side: 'in' | 'out';
  label: string;
  color?: string;
  handleId?: string;
}) {
  return (
    <div className={`wf-port wf-port--${side}`}>
      <Handle
        type={side === 'in' ? 'target' : 'source'}
        position={side === 'in' ? Position.Left : Position.Right}
        id={handleId}
        className="wf-handle"
        style={color ? { background: color, borderColor: color } : undefined}
      />
      <span className="wf-port-label">{label}</span>
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
}: {
  type: JobType;
  value?: string;
  onChange: (v: string) => void;
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

  return (
    <select
      className="wf-node-select nodrag"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
    >
      {loading && <option value="">Đang tải model…</option>}
      {!loading && models.length === 0 && <option value="">Không có model</option>}
      {models.map((m) => {
        const slug = modelSlug(m);
        return (
          <option key={slug} value={slug}>
            {m.name || slug}
          </option>
        );
      })}
    </select>
  );
}

function TextNode({ id, data }: NodeProps<WFNode>) {
  const update = useUpdateNode(id);
  return (
    <div className={`wf-node status-${data.status || 'idle'}`}>
      <NodeHead id={id} icon={<Type size={14} />} title="Nhập text" status={data.status} />
      <textarea
        className="wf-node-input nodrag"
        value={data.prompt || ''}
        placeholder="Nhập mô tả / prompt…"
        onChange={(e) => update({ prompt: e.target.value })}
      />
      <Port side="out" label="Văn bản" />
    </div>
  );
}

function CompactMediaInputNode({
  id,
  data,
  kind,
}: NodeProps<WFNode> & { kind: MediaInputKind }) {
  const { openMediaInputModal } = useContext(WorkflowCtx);
  const ports = MEDIA_INPUT_PORTS[kind];
  const title = kind === 'image' ? 'Nhập ảnh' : 'Nhập Video';
  const Icon = kind === 'image' ? Image : Video;

  const mediaUrls: string[] = Array.isArray(data.mediaUrls)
    ? (data.mediaUrls as string[])
    : data.resultUrl
      ? [data.resultUrl as string]
      : [];

  const count = mediaUrls.length;

  const [page, setPage] = useState(0);
  const COLS = 2;
  const ROWS = 2;
  const PER_PAGE = COLS * ROWS;
  const totalPages = Math.max(1, Math.ceil(count / PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const pageUrls = mediaUrls.slice(safePage * PER_PAGE, safePage * PER_PAGE + PER_PAGE);
  const globalIndex = (localIndex: number) => safePage * PER_PAGE + localIndex + 1;
  const noun = kind === 'image' ? 'image' : 'video';

  return (
    <div
      className={`wf-node wf-node-media-compact status-${data.status || 'idle'}`}
      onDoubleClick={() => openMediaInputModal(id)}
      title="Double-click để chỉnh sửa"
    >
      <NodeHead id={id} icon={<Icon size={14} />} title={title} status={data.status} />

      <div className="wf-node-media-ports">
        {ports.in.map((p) => (
          <Port key={p.id} side="in" label={p.label} color={p.color} handleId={p.id} />
        ))}
        {ports.out.map((p) => (
          <Port key={p.id} side="out" label={p.label} color={p.color} handleId={p.id} />
        ))}
      </div>

      {count > 0 ? (
        <div className="wf-media-thumb-area nodrag">
          <div
            className="wf-media-thumb-grid"
            style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
          >
            {pageUrls.map((url, i) => (
              <div key={`${url}-${i}`} className="wf-media-thumb-cell">
                {kind === 'image' ? (
                  <img
                    src={url}
                    alt={`@${noun}${globalIndex(i)}`}
                    className="wf-media-thumb-img"
                  />
                ) : (
                  <video src={url} className="wf-media-thumb-img" muted preload="metadata" />
                )}
                <span className="wf-media-thumb-label">
                  @{noun}
                  {globalIndex(i)}
                </span>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="wf-media-thumb-pagination">
              <button
                type="button"
                className="wf-media-thumb-page-btn"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
              >
                ‹
              </button>
              {Array.from({ length: Math.min(totalPages, 6) }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`wf-media-thumb-page-dot${safePage === i ? ' active' : ''}`}
                  onClick={() => setPage(i)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
                className="wf-media-thumb-page-btn"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={safePage === totalPages - 1}
              >
                ›
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="wf-media-thumb-empty nodrag" onClick={() => openMediaInputModal(id)}>
          <Icon size={20} className="wf-media-thumb-empty-icon" />
          <span>Double-click để thêm {kind === 'image' ? 'ảnh' : 'video'}</span>
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
  const update = useUpdateNode(id);
  return (
    <div className={`wf-node status-${data.status || 'idle'}`}>
      <NodeHead id={id} icon={<Image size={14} />} title="Tạo ảnh" status={data.status} />
      <Port side="in" label="Văn bản" />
      <ModelSelect type="image" value={data.modelId} onChange={(v) => update({ modelId: v })} />
      <textarea
        className="wf-node-input nodrag"
        value={data.prompt || ''}
        placeholder="Prompt (bỏ trống nếu nối từ node text)"
        onChange={(e) => update({ prompt: e.target.value })}
      />
      {data.resultUrl && <Preview url={data.resultUrl} />}
      {data.statusText && <p className="wf-node-status">{data.statusText}</p>}
      {data.error && <p className="wf-node-error">{data.error}</p>}
      <Port side="out" label="URL Ảnh" />
    </div>
  );
}

function VideoNode({ id, data }: NodeProps<WFNode>) {
  const update = useUpdateNode(id);
  return (
    <div className={`wf-node status-${data.status || 'idle'}`}>
      <NodeHead id={id} icon={<Video size={14} />} title="Tạo video" status={data.status} />
      <Port side="in" label="Văn bản / Ảnh" />
      <ModelSelect type="video" value={data.modelId} onChange={(v) => update({ modelId: v })} />
      <textarea
        className="wf-node-input nodrag"
        value={data.prompt || ''}
        placeholder="Prompt mô tả chuyển động"
        onChange={(e) => update({ prompt: e.target.value })}
      />
      {data.resultUrl && <Preview url={data.resultUrl} />}
      {data.statusText && <p className="wf-node-status">{data.statusText}</p>}
      {data.error && <p className="wf-node-error">{data.error}</p>}
      <Port side="out" label="URL Video" />
    </div>
  );
}

function TtsNode({ id, data }: NodeProps<WFNode>) {
  const update = useUpdateNode(id);
  return (
    <div className={`wf-node status-${data.status || 'idle'}`}>
      <NodeHead id={id} icon={<Volume2 size={14} />} title="Đọc giọng" status={data.status} />
      <Port side="in" label="Văn bản" />
      <ModelSelect type="tts" value={data.modelId} onChange={(v) => update({ modelId: v })} />
      <textarea
        className="wf-node-input nodrag"
        value={data.text || ''}
        placeholder="Văn bản (bỏ trống nếu nối từ node text)"
        onChange={(e) => update({ text: e.target.value })}
      />
      {data.resultUrl && <Preview url={data.resultUrl} />}
      {data.statusText && <p className="wf-node-status">{data.statusText}</p>}
      {data.error && <p className="wf-node-error">{data.error}</p>}
      <Port side="out" label="URL Âm thanh" />
    </div>
  );
}

function MusicNode({ id, data }: NodeProps<WFNode>) {
  const update = useUpdateNode(id);
  return (
    <div className={`wf-node status-${data.status || 'idle'}`}>
      <NodeHead id={id} icon={<Music size={14} />} title="Tạo nhạc AI" status={data.status} />
      <Port side="in" label="Văn bản" />
      <ModelSelect type="music" value={data.modelId} onChange={(v) => update({ modelId: v })} />
      <textarea
        className="wf-node-input nodrag"
        value={data.prompt || ''}
        placeholder="Mô tả bản nhạc (hoặc nối từ node text)"
        onChange={(e) => update({ prompt: e.target.value })}
      />
      {data.resultUrl && <Preview url={data.resultUrl} />}
      {data.statusText && <p className="wf-node-status">{data.statusText}</p>}
      {data.error && <p className="wf-node-error">{data.error}</p>}
      <Port side="out" label="URL Nhạc" />
    </div>
  );
}

function NoteNode({ id, data }: NodeProps<WFNode>) {
  const update = useUpdateNode(id);
  return (
    <div className="wf-node wf-node-note">
      <NodeHead id={id} icon={<StickyNote size={14} />} title="Ghi chú" showStatus={false} />
      <textarea
        className="wf-node-input nodrag"
        value={data.prompt || ''}
        placeholder="Ghi chú…"
        onChange={(e) => update({ prompt: e.target.value })}
      />
    </div>
  );
}

function OutputNode({ id, data }: NodeProps<WFNode>) {
  return (
    <div className={`wf-node wf-node-output status-${data.status || 'idle'}`}>
      <NodeHead id={id} icon={<Package size={14} />} title="Kết quả" status={data.status} />
      <Port side="in" label="Kết quả" />
      {data.resultUrl ? (
        <>
          <Preview url={data.resultUrl} />
          <div className="wf-node-out-actions">
            <a className="wf-node-link nodrag" href={data.resultUrl} target="_blank" rel="noreferrer">
              Mở
            </a>
            <ProjectPicker
              snapshot={{
                itemId: data.resultUrl,
                type: guessProjectType(data.resultUrl),
                prompt: 'Từ workflow',
                thumbnailUrl: data.resultUrl,
                downloadUrl: data.resultUrl,
              }}
            />
          </div>
        </>
      ) : (
        <p className="wf-node-empty">Chạy quy trình để nhận kết quả.</p>
      )}
      {data.error && <p className="wf-node-error">{data.error}</p>}
      <Port side="out" label="Đầu ra" />
    </div>
  );
}

function StartNode({ id, data }: NodeProps<WFNode>) {
  return (
    <div className={`wf-node wf-node-start status-${data.status || 'idle'}`}>
      <NodeHead id={id} icon={<Play size={14} />} title="Bắt đầu" status={data.status} />
      <p className="wf-node-empty">Điểm khởi động quy trình.</p>
      <Port side="out" label="Bắt đầu" color="#fbbf24" />
    </div>
  );
}

function EndNode({ id, data }: NodeProps<WFNode>) {
  return (
    <div className={`wf-node wf-node-end status-${data.status || 'idle'}`}>
      <NodeHead id={id} icon={<Flag size={14} />} title="Kết thúc" status={data.status} />
      <Port side="in" label="Kết thúc" color="#fbbf24" />
      <p className="wf-node-empty">
        {data.status === 'done' ? 'Quy trình hoàn tất.' : 'Điểm kết thúc quy trình.'}
      </p>
    </div>
  );
}

function RenderNode({ id, data }: NodeProps<WFNode>) {
  return (
    <div className={`wf-node status-${data.status || 'idle'}`}>
      <NodeHead id={id} icon={<Film size={14} />} title="Render Video" status={data.status} />
      <Port side="in" label="Video" color="#60a5fa" handleId="video" />
      <p className="wf-node-empty">
        Ghép các video đầu vào{data.exportMode ? ` · ${String(data.exportMode)}` : ''}
        {data.resolution ? ` · ${String(data.resolution)}` : ''}
      </p>
      {data.statusText && <p className="wf-node-status">{data.statusText}</p>}
      {data.error && <p className="wf-node-error">{data.error}</p>}
      <Port side="out" label="Video" color="#60a5fa" handleId="video" />
    </div>
  );
}

function ApiNode({ id, data }: NodeProps<WFNode>) {
  const update = useUpdateNode(id);
  return (
    <div className={`wf-node status-${data.status || 'idle'}`}>
      <NodeHead id={id} icon={<Globe size={14} />} title="Gọi API" status={data.status} />
      <Port side="in" label="Payload" />
      <div className="wf-node-row">
        <select
          className="wf-node-select wf-node-method nodrag"
          value={data.method || 'GET'}
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
        className="wf-node-input wf-node-url nodrag"
        type="text"
        value={data.url || ''}
        placeholder="https://api.example.com/…"
        onChange={(e) => update({ url: e.target.value })}
      />
      <textarea
        className="wf-node-input nodrag"
        value={data.prompt || ''}
        placeholder="Body JSON (bỏ trống nếu nối từ node text)"
        onChange={(e) => update({ prompt: e.target.value })}
      />
      {data.statusText && <p className="wf-node-status">{data.statusText}</p>}
      {data.error && <p className="wf-node-error">{data.error}</p>}
      <Port side="out" label="Phản hồi" />
    </div>
  );
}

function ConditionNode({ id, data }: NodeProps<WFNode>) {
  const update = useUpdateNode(id);
  const op = data.op || 'not_empty';
  const needsCompare = op !== 'not_empty' && op !== 'empty';
  return (
    <div className={`wf-node wf-node-control status-${data.status || 'idle'}`}>
      <NodeHead id={id} icon={<GitBranch size={14} />} title="Điều kiện" status={data.status} />
      <Port side="in" label="Giá trị" />
      <div className="wf-node-row">
        <select
          className="wf-node-select nodrag"
          value={op}
          onChange={(e) => update({ op: e.target.value })}
        >
          <option value="not_empty">Không rỗng</option>
          <option value="empty">Rỗng</option>
          <option value="contains">Chứa</option>
          <option value="equals">Bằng</option>
          <option value="gt">Lớn hơn (số)</option>
          <option value="lt">Nhỏ hơn (số)</option>
        </select>
      </div>
      {needsCompare && (
        <input
          className="wf-node-input wf-node-url nodrag"
          type="text"
          value={data.compare || ''}
          placeholder="Giá trị so sánh"
          onChange={(e) => update({ compare: e.target.value })}
        />
      )}
      {data.statusText && <p className="wf-node-status">{data.statusText}</p>}
      <Port side="out" label="Đúng" color="#34d399" handleId="true" />
      <Port side="out" label="Sai" color="#f87171" handleId="false" />
    </div>
  );
}

function DelayNode({ id, data }: NodeProps<WFNode>) {
  const update = useUpdateNode(id);
  return (
    <div className={`wf-node wf-node-control status-${data.status || 'idle'}`}>
      <NodeHead id={id} icon={<Timer size={14} />} title="Trì hoãn" status={data.status} />
      <Port side="in" label="Kích hoạt" />
      <div className="wf-node-row wf-node-inline">
        <input
          className="wf-node-input wf-node-url nodrag"
          type="number"
          min={0}
          step={0.5}
          value={data.seconds ?? 1}
          onChange={(e) => update({ seconds: Number(e.target.value) })}
        />
        <span className="wf-node-suffix">giây</span>
      </div>
      {data.statusText && <p className="wf-node-status">{data.statusText}</p>}
      <Port side="out" label="Xong" />
    </div>
  );
}

function LoopNode({ id, data }: NodeProps<WFNode>) {
  const update = useUpdateNode(id);
  return (
    <div className={`wf-node wf-node-control status-${data.status || 'idle'}`}>
      <NodeHead id={id} icon={<Repeat size={14} />} title="Vòng lặp" status={data.status} />
      <Port side="in" label="Kích hoạt" />
      <div className="wf-node-row wf-node-inline">
        <span className="wf-node-suffix">Lặp</span>
        <input
          className="wf-node-input wf-node-url nodrag"
          type="number"
          min={1}
          step={1}
          value={data.count ?? 3}
          onChange={(e) => update({ count: Number(e.target.value) })}
        />
        <span className="wf-node-suffix">lần</span>
      </div>
      {data.statusText && <p className="wf-node-status">{data.statusText}</p>}
      <Port side="out" label="Mỗi vòng" color="#fbbf24" handleId="each" />
      <Port side="out" label="Hoàn tất" handleId="done" />
    </div>
  );
}

function CloneNode({ id, data }: NodeProps<WFNode>) {
  return (
    <div className={`wf-node wf-node-control status-${data.status || 'idle'}`}>
      <NodeHead id={id} icon={<Copy size={14} />} title="Nhân Bản" status={data.status} />
      <Port side="in" label="Đầu vào" />
      <p className="wf-node-empty">Sao chép dữ liệu sang nhiều nhánh.</p>
      <Port side="out" label="Bản sao" />
    </div>
  );
}

function NotifyNode({ id, data }: NodeProps<WFNode>) {
  const update = useUpdateNode(id);
  return (
    <div className={`wf-node wf-node-control status-${data.status || 'idle'}`}>
      <NodeHead id={id} icon={<Bell size={14} />} title="Gửi thông báo" status={data.status} />
      <Port side="in" label="Kích hoạt" />
      <textarea
        className="wf-node-input nodrag"
        value={data.prompt || ''}
        placeholder="Nội dung (bỏ trống để dùng dữ liệu nối vào)"
        onChange={(e) => update({ prompt: e.target.value })}
      />
      {data.statusText && <p className="wf-node-status">{data.statusText}</p>}
      <Port side="out" label="Xong" />
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
          title="Hủy nối"
          onClick={() => deleteElements({ edges: [{ id }] })}
        >
          <X size={11} />
        </button>
      </EdgeLabelRenderer>
    </g>
  );
}

const edgeTypes = { wf: WfEdge };

type IconType = ComponentType<{ size?: number }>;

interface NodeDef {
  key: string;
  label: string;
  icon: IconType;
  implemented: boolean;
}

interface NodeGroup {
  id: string;
  label: string;
  color: string;
  icon: IconType;
  defaultOpen?: boolean;
  nodes: NodeDef[];
}

const soon = (key: string, label: string, icon: IconType): NodeDef => ({
  key,
  label,
  icon,
  implemented: false,
});

const NODE_GROUPS: NodeGroup[] = [
  {
    id: 'frequent',
    label: 'Dùng thường xuyên',
    color: '#fbbf24',
    icon: Sparkles,
    defaultOpen: true,
    nodes: [
      { key: 'start', label: 'Bắt đầu', icon: Play, implemented: true },
      { key: 'api', label: 'Gọi API', icon: Globe, implemented: true },
      { key: 'end', label: 'Kết thúc', icon: Flag, implemented: true },
      { key: 'image', label: 'Tạo ảnh AI', icon: Image, implemented: true },
      soon('agent', 'Tác Nhân AI', Bot),
      { key: 'text', label: 'Nhập văn bản', icon: Type, implemented: true },
    ],
  },
  {
    id: 'control',
    label: 'Luồng điều khiển',
    color: '#a78bfa',
    icon: GitBranch,
    nodes: [
      { key: 'start', label: 'Bắt đầu', icon: Play, implemented: true },
      { key: 'end', label: 'Kết thúc', icon: Flag, implemented: true },
      { key: 'condition', label: 'Điều kiện', icon: GitBranch, implemented: true },
      { key: 'delay', label: 'Trì hoãn', icon: Timer, implemented: true },
      { key: 'loop', label: 'Vòng lặp', icon: Repeat, implemented: true },
      { key: 'clone', label: 'Nhân Bản', icon: Copy, implemented: true },
      { key: 'notify', label: 'Gửi thông báo', icon: Bell, implemented: true },
    ],
  },
  {
    id: 'content',
    label: 'Tạo nội dung AI',
    color: '#2dd4bf',
    icon: Sparkles,
    defaultOpen: true,
    nodes: [
      { key: 'image', label: 'Tạo ảnh AI', icon: Image, implemented: true },
      { key: 'video', label: 'Tạo video AI', icon: Video, implemented: true },
      { key: 'tts', label: 'Tạo giọng nói', icon: Volume2, implemented: true },
      { key: 'music', label: 'Tạo nhạc AI', icon: Music, implemented: true },
      soon('prompt', 'Tạo Prompt AI', Wand2),
      soon('storyboard', 'Storyboard', LayoutGrid),
    ],
  },
  {
    id: 'process',
    label: 'Xử lý',
    color: '#a78bfa',
    icon: Wand2,
    nodes: [
      { key: 'api', label: 'Gọi API', icon: Globe, implemented: true },
      soon('upscale-image', 'Nâng cấp ảnh', ArrowUpCircle),
      soon('upscale-video', 'Nâng cấp video', ArrowUpCircle),
      soon('remove-bg', 'Xóa nền ảnh', Eraser),
      soon('lipsync', 'Video khẩu hình', Video),
      soon('vfx', 'Tạo hiệu ứng video', Wand2),
      soon('subtitle', 'Subtitle', Captions),
      soon('render', 'Render Video', Film),
      soon('cut', 'Cắt Video', Scissors),
    ],
  },
  {
    id: 'io',
    label: 'Đầu vào / Đầu ra',
    color: '#34d399',
    icon: Package,
    nodes: [
      soon('agent', 'Tác Nhân AI', Bot),
      { key: 'text', label: 'Nhập văn bản', icon: Type, implemented: true },
      { key: 'input-image', label: 'Nhập ảnh', icon: Image, implemented: true },
      { key: 'input-video', label: 'Nhập Video', icon: Video, implemented: true },
      { key: 'output', label: 'Đầu ra', icon: Package, implemented: true },
      soon('merge', 'Gộp dữ liệu', Combine),
      { key: 'note', label: 'Ghi chú', icon: StickyNote, implemented: true },
      soon('data-table', 'Bảng dữ liệu', Database),
      soon('extract-media', 'Trích xuất Media', Download),
      soon('kols', 'KOLs', Users),
    ],
  },
];

function Palette({
  onAdd,
  open,
  onToggle,
}: {
  onAdd: (type: string) => void;
  open: boolean;
  onToggle: () => void;
}) {
  const [query, setQuery] = useState('');
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NODE_GROUPS.map((g) => [g.id, Boolean(g.defaultOpen)])),
  );
  const q = query.trim().toLowerCase();

  const onDragStart = (e: DragEvent, key: string) => {
    e.dataTransfer.setData('application/wf-node', key);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className={`wf-palette${open ? '' : ' collapsed'}`}>
      <div className="wf-palette-head">
        <span>CÁC NODE</span>
        <button
          type="button"
          className="wf-palette-toggle"
          onClick={onToggle}
          title="Thu gọn sidebar"
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
          placeholder="Tìm node…"
        />
      </div>

      <div className="wf-palette-groups">
        {NODE_GROUPS.map((g) => {
          const nodes = q ? g.nodes.filter((n) => n.label.toLowerCase().includes(q)) : g.nodes;
          if (q && nodes.length === 0) return null;
          const open = q ? true : openMap[g.id];
          return (
            <section key={g.id} className="wf-group">
              <button
                type="button"
                className="wf-group-head"
                style={{ ['--g' as string]: g.color }}
                onClick={() => setOpenMap((m) => ({ ...m, [g.id]: !m[g.id] }))}
              >
                <span className="wf-group-icon">
                  <g.icon size={13} />
                </span>
                <span className="wf-group-name">{g.label}</span>
                <span className="wf-group-count">{g.nodes.length}</span>
                <ChevronDown size={14} className={`wf-group-caret${open ? ' open' : ''}`} />
              </button>
              {open && (
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
                      title={n.implemented ? n.label : `${n.label} (Sắp có)`}
                    >
                      <n.icon size={20} />
                      <span className="wf-tile-label">{n.label}</span>
                      {!n.implemented && <span className="wf-tile-soon">Sắp có</span>}
                    </button>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <button type="button" className="wf-mini-app" disabled title="Sắp có">
        <LayoutGrid size={15} /> Tạo Mini App
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
  const { zoomIn, zoomOut, fitView, deleteElements, getNodes } = useReactFlow();
  const zoom = useStore((s) => s.transform[2]);

  const deleteSelected = () => {
    const sel = getNodes().filter((n) => n.selected);
    if (sel.length) deleteElements({ nodes: sel });
  };

  return (
    <Panel position="bottom-center" className="wf-bottombar">
      <button type="button" className="wf-bb-btn" onClick={() => zoomOut()} title="Thu nhỏ">
        <ZoomOut size={16} />
      </button>
      <span className="wf-bb-zoom">{Math.round((zoom || 1) * 100)}%</span>
      <button type="button" className="wf-bb-btn" onClick={() => zoomIn()} title="Phóng to">
        <ZoomIn size={16} />
      </button>
      <span className="wf-bb-sep" />
      <button
        type="button"
        className="wf-bb-btn"
        onClick={() => fitView({ duration: 300 })}
        title="Vừa màn hình"
      >
        <Maximize size={16} />
      </button>
      <button
        type="button"
        className="wf-bb-btn"
        onClick={onAutoLayout}
        title="Sắp xếp tự động"
      >
        <Workflow size={16} />
      </button>
      <button
        type="button"
        className="wf-bb-btn wf-bb-danger"
        onClick={deleteSelected}
        title="Xóa node đang chọn (hoặc nhấn Delete)"
      >
        <Trash2 size={16} />
      </button>
      <span className="wf-bb-sep" />
      {error && <span className="wf-bb-error" title={error}>{error}</span>}
      {running ? (
        <button type="button" className="wf-bb-run wf-bb-stop" onClick={onStop}>
          <Square size={15} /> Dừng
        </button>
      ) : (
        <button type="button" className="wf-bb-run" onClick={onRun}>
          <Play size={15} /> Chạy quy trình
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
        <h3 className="wf-new-title">Quy trình mới</h3>
        <input
          ref={inputRef}
          className="wf-new-input"
          placeholder="Tên quy trình..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') onClose();
          }}
        />
        <div className="wf-new-actions">
          <button type="button" className="wf-new-cancel" onClick={onClose}>
            Quay lại
          </button>
          <button type="button" className="wf-new-create" onClick={submit} disabled={!canCreate}>
            Tạo
          </button>
        </div>
      </div>
    </div>
  );
}

function Flow() {
  const initialState = useMemo(() => loadTabsState(defaultGraph()), []);
  const initialTab =
    initialState.tabs.find((t) => t.id === initialState.activeId) ?? initialState.tabs[0];

  const [tabs, setTabs] = useState<WorkflowTab[]>(initialState.tabs);
  const [activeId, setActiveId] = useState(initialState.activeId);
  const [nodes, setNodes, onNodesChange] = useNodesState<WFNode>(initialTab.nodes as WFNode[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialTab.edges);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [libOpen, setLibOpen] = useState(false);
  const [libCount, setLibCount] = useState(() => loadTemplates().length);
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [mediaModal, setMediaModal] = useState<{
    nodeId: string;
    kind: MediaInputKind;
    draft: MediaInputDraft;
    isNew: boolean;
    position: { x: number; y: number };
  } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { screenToFlowPosition, fitView, deleteElements } = useReactFlow();

  useEffect(() => onLibraryUpdated(() => setLibCount(loadTemplates().length)), []);

  const handleAutoLayout = () => {
    const pos = autoLayout(nodes, edges);
    setNodes((nds) => nds.map((n) => (pos[n.id] ? { ...n, position: pos[n.id] } : n)));
    setTimeout(() => fitView({ duration: 300 }), 60);
  };

  /** Agent apply graph lên canvas + lưu tab. */
  const applyAgentGraph = useCallback(
    (nextNodes: Node[], nextEdges: Edge[], opts?: { focusView?: boolean }) => {
      setNodes(nextNodes as WFNode[]);
      setEdges(nextEdges);
      const now = new Date().toISOString();
      const updated = tabs.map((t) =>
        t.id === activeId
          ? { ...t, nodes: nextNodes as WFNode[], edges: nextEdges, updatedAt: now }
          : t,
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
    setNodes(target.nodes as WFNode[]);
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
      setNodes(neighbor.nodes as WFNode[]);
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
    () => ({ updateNode, openMediaInputModal }),
    [updateNode, openMediaInputModal],
  );

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

  const openTemplate = (t: SavedTemplate) => {
    const updated = commitActive();
    const tab = makeTab(t.name, { nodes: t.nodes, edges: t.edges }, t.id);
    const next = [...updated, tab];
    setTabs(next);
    setActiveId(tab.id);
    setNodes(t.nodes as WFNode[]);
    setEdges(t.edges);
    saveWorkflow(t.nodes as WFNode[], t.edges);
    saveTabsState({ tabs: next, activeId: tab.id });
  };

  const handleClear = () => {
    if (!window.confirm('Xóa toàn bộ sơ đồ trong tab này?')) return;
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
      setNodes((nds) => [
        ...nds,
        {
          id: mediaModal.nodeId,
          type: mediaModal.kind === 'image' ? 'input-image' : 'input-video',
          position: mediaModal.position,
          data,
        },
      ]);
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
        setError('Sơ đồ có vòng lặp — thêm node Vòng lặp để lặp lại.');
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
        data: { ...n.data, status: 'idle' as WFStatus, statusText: undefined, error: undefined },
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
          updateNode(node.id, { status: 'done', statusText: 'Hoàn tất' });
          return {};
        case 'delay': {
          const secs = Math.max(0, Number(node.data.seconds ?? 1));
          updateNode(node.id, { status: 'running', statusText: `Chờ ${secs}s…` });
          await sleep(secs * 1000, signal);
          updateNode(node.id, { status: 'done', statusText: undefined });
          return { output: upUrl || upText || '' };
        }
        case 'clone':
          updateNode(node.id, { status: 'done' });
          return { output: upUrl || upText || '' };
        case 'notify': {
          const msg = String(node.data.prompt || upText || upUrl || '(trống)');
          updateNode(node.id, { status: 'done', statusText: `Đã gửi: ${msg.slice(0, 40)}` });
          return { output: upUrl || upText || '' };
        }
        case 'condition': {
          const value = upText || upUrl || '';
          const ok = evalCondition(value, String(node.data.op || 'not_empty'), node.data.compare);
          updateNode(node.id, { status: 'done', statusText: ok ? 'Đúng ✓' : 'Sai ✗' });
          return { output: value, branch: ok ? 'true' : 'false' };
        }
        case 'loop':
          // Vòng lặp được xử lý ở activate(); ở đây chỉ truyền dữ liệu qua.
          return { output: upUrl || upText || '' };
        case 'text':
          updateNode(node.id, { status: 'done' });
          return { output: String(node.data.prompt || '') };
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
            updateNode(node.id, { status: 'running', statusText: 'Trích frame…' });
            frameUrl = await extractVideoFirstFrame(primary);
          }

          if (!primary && draft.required) {
            updateNode(node.id, { status: 'error', error: 'Chưa có ảnh/video (bắt buộc)' });
            throw new Error('Chưa có ảnh/video');
          }

          if (!primary && !draft.required) {
            updateNode(node.id, { status: 'done', statusText: 'Bỏ qua (không bắt buộc)' });
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
            updateNode(node.id, { status: 'error', error: 'Chưa nhập URL' });
            throw new Error('Gọi API: chưa nhập URL');
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
          updateNode(node.id, {
            resultUrl: upUrl,
            status: upUrl ? 'done' : 'error',
            error: upUrl ? undefined : 'Không có đầu vào',
          });
          return { output: upUrl };
        }
        case 'render': {
          if (!upUrl) {
            updateNode(node.id, { status: 'error', error: 'Không có video đầu vào' });
            throw new Error('Render: không có video đầu vào');
          }
          updateNode(node.id, { status: 'done', statusText: 'Đã ghép (pass-through)' });
          return { output: upUrl };
        }
        default: {
          const type = node.type as JobType;
          const selections: JobSelections = {};
          if (type === 'tts') {
            selections.text = node.data.text || upText || node.data.prompt || '';
          } else {
            selections.prompt = node.data.prompt || upText || '';
          }
          if (type === 'video' && upUrl) selections.images = [upUrl];

          const modelId = String(node.data.modelId || '');
          if (!modelId) {
            updateNode(node.id, { status: 'error', error: 'Chưa chọn model' });
            throw new Error('Chưa chọn model');
          }

          updateNode(node.id, { status: 'running', statusText: 'Bắt đầu…' });
          try {
            const url = await runNodeJob({
              type,
              modelId,
              selections,
              onStatus: (s) => updateNode(node.id, { statusText: s }),
              signal,
            });
            updateNode(node.id, { status: 'done', resultUrl: url, statusText: undefined });
            return { output: url };
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            updateNode(node.id, { status: 'error', statusText: undefined, error: msg });
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
          if (++steps > 2000) throw new Error('Quá nhiều bước — kiểm tra vòng lặp.');
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
              updateNode(id, { status: 'running', statusText: `Vòng ${i + 1}/${count}` });
              for (const b of body) done.delete(b);
              for (const t of eachTargets) await activate(t);
            }
            updateNode(id, { status: 'done', statusText: `Xong ${count} vòng` });
            for (const t of targetsOf(id, 'done')) await activate(t);
            return;
          }

          for (const t of targetsOf(id)) await activate(t);
        };

        const roots = nodes.filter((n) => incoming(n.id).length === 0);
        if (roots.length === 0) throw new Error('Không tìm thấy node bắt đầu (không có đầu vào).');
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
    <WorkflowCtx.Provider value={ctx}>
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
              title="Mở sidebar node"
            >
              <PanelLeftOpen size={16} />
            </button>
          )}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            minZoom={0.1}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
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
              bgColor="#0d0e12"
              maskColor="rgba(8, 9, 12, 0.6)"
              nodeColor="#2b303a"
              nodeStrokeColor="#3a4150"
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
    </WorkflowCtx.Provider>
  );
}

export default function WorkflowPage() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  );
}
