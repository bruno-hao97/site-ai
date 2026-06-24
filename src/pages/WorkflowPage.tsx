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
  Background,
  Controls,
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
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  ArrowUpCircle,
  Bot,
  Captions,
  ChevronDown,
  Combine,
  Database,
  Download,
  Eraser,
  Film,
  FolderOpen,
  Globe,
  Image,
  LayoutGrid,
  Loader2,
  Maximize,
  Music,
  Package,
  Play,
  Save,
  Scissors,
  Search,
  Sparkles,
  Square,
  StickyNote,
  Trash2,
  Type,
  Users,
  Video,
  Volume2,
  Wand2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { GommoModel, JobType } from '../services/api';
import { fetchModelsForType, pickDefaultModel, runNodeJob } from '../services/workflowEngine';
import { modelSlug } from '../services/modelSchema';
import type { JobSelections } from '../services/modelSchema';
import { clearWorkflow, loadWorkflow, saveWorkflow } from '../services/workflowStore';
import WorkflowLibrary from '../components/WorkflowLibrary';
import type { SavedTemplate } from '../services/workflowLibraryStore';
import ProjectPicker from '../components/ProjectPicker';
import type { ProjectItemType } from '../services/projectStore';

type WFStatus = 'idle' | 'running' | 'done' | 'error';

interface NodeData {
  modelId?: string;
  prompt?: string;
  text?: string;
  status?: WFStatus;
  statusText?: string;
  resultUrl?: string;
  error?: string;
  [key: string]: unknown;
}

type WFNode = Node<NodeData>;

interface WorkflowCtxValue {
  updateNode: (id: string, patch: Partial<NodeData>) => void;
}

const WorkflowCtx = createContext<WorkflowCtxValue>({ updateNode: () => {} });

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
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function ImageNode({ id, data }: NodeProps<WFNode>) {
  const update = useUpdateNode(id);
  return (
    <div className={`wf-node status-${data.status || 'idle'}`}>
      <Handle type="target" position={Position.Left} />
      <NodeHead id={id} icon={<Image size={14} />} title="Tạo ảnh" status={data.status} />
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
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function VideoNode({ id, data }: NodeProps<WFNode>) {
  const update = useUpdateNode(id);
  return (
    <div className={`wf-node status-${data.status || 'idle'}`}>
      <Handle type="target" position={Position.Left} />
      <NodeHead id={id} icon={<Video size={14} />} title="Tạo video" status={data.status} />
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
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function TtsNode({ id, data }: NodeProps<WFNode>) {
  const update = useUpdateNode(id);
  return (
    <div className={`wf-node status-${data.status || 'idle'}`}>
      <Handle type="target" position={Position.Left} />
      <NodeHead id={id} icon={<Volume2 size={14} />} title="Đọc giọng" status={data.status} />
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
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function MusicNode({ id, data }: NodeProps<WFNode>) {
  const update = useUpdateNode(id);
  return (
    <div className={`wf-node status-${data.status || 'idle'}`}>
      <Handle type="target" position={Position.Left} />
      <NodeHead id={id} icon={<Music size={14} />} title="Tạo nhạc AI" status={data.status} />
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
      <Handle type="source" position={Position.Right} />
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
      <Handle type="target" position={Position.Left} />
      <NodeHead id={id} icon={<Package size={14} />} title="Kết quả" status={data.status} />
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
    </div>
  );
}

const nodeTypes = {
  text: TextNode,
  image: ImageNode,
  video: VideoNode,
  tts: TtsNode,
  music: MusicNode,
  note: NoteNode,
  output: OutputNode,
};

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
      { key: 'text', label: 'Nhập text', icon: Type, implemented: true },
      { key: 'image', label: 'Tạo ảnh AI', icon: Image, implemented: true },
      { key: 'output', label: 'Đầu ra', icon: Package, implemented: true },
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
      soon('api', 'Gọi API', Globe),
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
      soon('input-image', 'Nhập ảnh', Image),
      soon('input-video', 'Nhập Video', Video),
      { key: 'output', label: 'Đầu ra', icon: Package, implemented: true },
      soon('merge', 'Gộp dữ liệu', Combine),
      { key: 'note', label: 'Ghi chú', icon: StickyNote, implemented: true },
      soon('data-table', 'Bảng dữ liệu', Database),
      soon('extract-media', 'Trích xuất Media', Download),
      soon('kols', 'KOLs', Users),
    ],
  },
];

function Palette({ onAdd }: { onAdd: (type: string) => void }) {
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
    <aside className="wf-palette">
      <div className="wf-palette-head">CÁC NODE</div>
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
      { id: 'text-1', type: 'text', position: { x: 40, y: 120 }, data: { prompt: '' } },
      { id: 'image-1', type: 'image', position: { x: 340, y: 80 }, data: {} },
      { id: 'output-1', type: 'output', position: { x: 660, y: 100 }, data: {} },
    ],
    edges: [
      { id: 'e1', source: 'text-1', target: 'image-1' },
      { id: 'e2', source: 'image-1', target: 'output-1' },
    ],
  };
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

function BottomBar() {
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
      <span className="wf-bb-sep" />
      <button
        type="button"
        className="wf-bb-btn wf-bb-danger"
        onClick={deleteSelected}
        title="Xóa node đang chọn (hoặc nhấn Delete)"
      >
        <Trash2 size={16} />
      </button>
    </Panel>
  );
}

function Flow() {
  const initial = useMemo(() => {
    const saved = loadWorkflow();
    if (saved && saved.nodes.length) {
      return { nodes: saved.nodes as WFNode[], edges: saved.edges };
    }
    return defaultGraph();
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState<WFNode>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [libOpen, setLibOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const { screenToFlowPosition } = useReactFlow();

  const updateNode = useCallback(
    (id: string, patch: Partial<NodeData>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
      );
    },
    [setNodes],
  );

  const ctx = useMemo<WorkflowCtxValue>(() => ({ updateNode }), [updateNode]);

  const onConnect = useCallback(
    (c: Connection) => setEdges((eds) => addEdge(c, eds)),
    [setEdges],
  );

  const addNodeAt = useCallback(
    (type: string, position: { x: number; y: number }) => {
      if (!(type in nodeTypes)) return;
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
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const openTemplate = useCallback(
    (t: SavedTemplate) => {
      setNodes(t.nodes as WFNode[]);
      setEdges(t.edges);
      saveWorkflow(t.nodes as WFNode[], t.edges);
    },
    [setNodes, setEdges],
  );

  const handleClear = () => {
    if (!window.confirm('Xóa toàn bộ sơ đồ hiện tại?')) return;
    clearWorkflow();
    const g = defaultGraph();
    setNodes(g.nodes);
    setEdges(g.edges);
  };

  const stop = () => {
    abortRef.current?.abort();
    setRunning(false);
  };

  async function runWorkflow() {
    setError('');
    const order = topoSort(nodes, edges);
    if (!order) {
      setError('Sơ đồ có vòng lặp — không chạy được.');
      return;
    }

    abortRef.current = new AbortController();
    setRunning(true);

    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, status: 'idle' as WFStatus, statusText: undefined, error: undefined },
      })),
    );

    const outputs: Record<string, string> = {};
    const incoming = (id: string) => edges.filter((e) => e.target === id).map((e) => e.source);

    try {
      for (const node of order) {
        const ups = incoming(node.id)
          .map((sid) => outputs[sid])
          .filter(Boolean);
        const upText = ups.find((u) => !/^https?:\/\//i.test(u));
        const upUrl = ups.find((u) => /^https?:\/\//i.test(u));

        if (node.type === 'note') {
          continue;
        }

        if (node.type === 'text') {
          outputs[node.id] = String(node.data.prompt || '');
          updateNode(node.id, { status: 'done' });
          continue;
        }

        if (node.type === 'output') {
          updateNode(node.id, {
            resultUrl: upUrl,
            status: upUrl ? 'done' : 'error',
            error: upUrl ? undefined : 'Không có đầu vào',
          });
          continue;
        }

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
            signal: abortRef.current.signal,
          });
          outputs[node.id] = url;
          updateNode(node.id, { status: 'done', resultUrl: url, statusText: undefined });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          updateNode(node.id, { status: 'error', statusText: undefined, error: msg });
          throw err;
        }
      }
    } catch (err) {
      if (!error) setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <WorkflowCtx.Provider value={ctx}>
      <div className="wf-shell">
        <Palette onAdd={addNode} />

        <div className="wf-canvas" onDragOver={onDragOver} onDrop={onDrop}>
          <div className="wf-toolbar">
            {running ? (
              <button type="button" className="wf-btn wf-btn-stop" onClick={stop}>
                <Square size={15} /> Dừng
              </button>
            ) : (
              <button type="button" className="wf-btn wf-btn-run" onClick={runWorkflow}>
                <Play size={15} /> Chạy quy trình
              </button>
            )}
            <button type="button" className="wf-btn" onClick={handleSave}>
              <Save size={15} /> {saved ? 'Đã lưu' : 'Lưu'}
            </button>
            <button type="button" className="wf-btn" onClick={() => setLibOpen(true)}>
              <FolderOpen size={15} /> Thư viện
            </button>
            <button type="button" className="wf-btn wf-btn-danger" onClick={handleClear}>
              <Trash2 size={15} /> Xóa sơ đồ
            </button>
            {error && <span className="wf-toolbar-error">{error}</span>}
          </div>

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            deleteKeyCode={['Backspace', 'Delete']}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={18} />
            <Controls />
            <MiniMap
              pannable
              zoomable
              bgColor="#0d0e12"
              maskColor="rgba(8, 9, 12, 0.6)"
              nodeColor="#2b303a"
              nodeStrokeColor="#3a4150"
              nodeBorderRadius={4}
            />
            <BottomBar />
          </ReactFlow>
        </div>
      </div>

      <WorkflowLibrary
        open={libOpen}
        currentGraph={() => ({ nodes, edges })}
        onOpenTemplate={openTemplate}
        onClose={() => setLibOpen(false)}
      />
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
