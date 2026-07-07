import type { Edge, Node } from '@xyflow/react';
import type { TemplateGraph } from './workflowLibraryStore';

/** Node theo định dạng file .wfl (79ai-workflow) export từ vmedia. */
interface WflNode {
  id: string;
  type: string;
  position?: { x: number; y: number };
  data?: Record<string, unknown>;
}

interface WflConnection {
  id?: string;
  sourceNodeId: string;
  sourcePortId?: string;
  targetNodeId: string;
  targetPortId?: string;
}

interface WflFile {
  type?: string;
  version?: number;
  name?: string;
  nodes?: WflNode[];
  connections?: WflConnection[];
}

export interface WflImportResult {
  name: string;
  graph: TemplateGraph;
}

/** Map type node WFL → type node nội bộ của app. */
const NODE_TYPE_MAP: Record<string, string> = {
  start: 'start',
  end: 'end',
  'image-input': 'input-image',
  'video-input': 'input-video',
  'generate-image': 'image',
  'generate-video': 'video',
  'generate-tts': 'tts',
  'generate-music': 'music',
  'render-video': 'render',
  output: 'output',
  note: 'note',
  'api-call': 'api',
};

const MEDIA_NODE_TYPES = new Set(['input-image', 'input-video']);

function isWflFile(value: unknown): value is WflFile {
  if (!value || typeof value !== 'object') return false;
  const v = value as WflFile;
  return Array.isArray(v.nodes);
}

/** Chuyển data node WFL sang data node nội bộ. */
function convertNodeData(type: string, data: Record<string, unknown>): Record<string, unknown> {
  const prompt = (data.prompt_text ?? data.prompt ?? '') as string;

  if (type === 'image' || type === 'video' || type === 'music') {
    return {
      prompt,
      modelId: (data.model as string) || '',
      ratio: data.ratio,
      resolution: data.resolution,
      mode: data.mode,
      duration: data.duration,
      _modelName: data.model_name,
    };
  }

  if (type === 'tts') {
    return { text: prompt, modelId: (data.model as string) || '' };
  }

  if (MEDIA_NODE_TYPES.has(type)) {
    const urls = Array.isArray(data.urls)
      ? (data.urls as string[])
      : data.url
        ? [data.url as string]
        : [];
    return {
      mediaUrls: urls,
      fileNames: urls.map(() => (data.label as string) || 'Đã import'),
      resultUrl: urls[0] || '',
      required: Boolean(data.required),
      configured: urls.length > 0,
      randomOutput: false,
      useOnce: false,
      sourceTab: 'url',
    };
  }

  if (type === 'note') {
    return { prompt };
  }

  if (type === 'render') {
    return {
      exportMode: data.export_mode,
      profile: data.profile,
      resolution: data.resolution,
    };
  }

  if (type === 'output') {
    return {
      action: data.action,
      mode: data.mode,
      gridCols: data.gridCols,
    };
  }

  return { ...data };
}

/** Xác định handle nguồn/đích dựa trên type node để React Flow nối đúng. */
function resolveHandles(
  sourceType: string | undefined,
  targetType: string | undefined,
): { sourceHandle?: string; targetHandle?: string } {
  const sourceHandle = sourceType && MEDIA_NODE_TYPES.has(sourceType) ? 'media-out' : undefined;
  const targetHandle = targetType && MEDIA_NODE_TYPES.has(targetType) ? 'media-in' : undefined;
  return { sourceHandle, targetHandle };
}

/** Parse chuỗi JSON file .wfl → graph nội bộ; throw nếu format sai. */
export function parseWflFile(raw: string): WflImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('File không phải JSON hợp lệ.');
  }
  if (!isWflFile(parsed)) {
    throw new Error('File không đúng định dạng workflow (thiếu danh sách nodes).');
  }

  const wfl = parsed;
  const typeById = new Map<string, string>();

  const nodes: Node[] = (wfl.nodes ?? []).map((n) => {
    const mappedType = NODE_TYPE_MAP[n.type] ?? n.type;
    typeById.set(n.id, mappedType);
    return {
      id: n.id,
      type: mappedType,
      position: n.position ?? { x: 0, y: 0 },
      data: convertNodeData(mappedType, n.data ?? {}),
    } as Node;
  });

  const edges: Edge[] = (wfl.connections ?? []).map((c, i) => {
    const { sourceHandle, targetHandle } = resolveHandles(
      typeById.get(c.sourceNodeId),
      typeById.get(c.targetNodeId),
    );
    return {
      id: c.id || `wfl-edge-${i}`,
      source: c.sourceNodeId,
      target: c.targetNodeId,
      sourceHandle,
      targetHandle,
      type: 'wf',
    } as Edge;
  });

  return {
    name: wfl.name?.trim() || 'Workflow import',
    graph: { nodes, edges },
  };
}
