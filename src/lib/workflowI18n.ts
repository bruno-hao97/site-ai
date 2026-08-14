import type { ComponentType } from 'react';
import {
  ArrowUpCircle,
  Bell,
  Bot,
  Captions,
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
  Music,
  Package,
  Play,
  Repeat,
  Scissors,
  Sparkles,
  StickyNote,
  Timer,
  Type,
  Users,
  Video,
  Volume2,
  Wand2,
} from 'lucide-react';
import type { TranslateFn } from '../i18n/LanguageProvider';
import type { WorkflowKeys } from '../i18n/locales/partials/workflow.en';
import type { WfPortDef } from '../services/workflowAiGenPorts';

type IconType = ComponentType<{ size?: number }>;

export interface NodeDef {
  key: string;
  label: string;
  icon: IconType;
  implemented: boolean;
}

export interface NodeGroup {
  id: string;
  label: string;
  color: string;
  icon: IconType;
  defaultOpen?: boolean;
  nodes: NodeDef[];
}

const NODE_LABEL_KEYS: Record<string, WorkflowKeys> = {
  start: 'workflow.node.start',
  end: 'workflow.node.end',
  api: 'workflow.node.api',
  image: 'workflow.node.image',
  agent: 'workflow.node.agent',
  text: 'workflow.node.text',
  condition: 'workflow.node.condition',
  delay: 'workflow.node.delay',
  loop: 'workflow.node.loop',
  clone: 'workflow.node.clone',
  notify: 'workflow.node.notify',
  video: 'workflow.node.video',
  tts: 'workflow.node.tts',
  music: 'workflow.node.music',
  prompt: 'workflow.node.prompt',
  storyboard: 'workflow.node.storyboard',
  'upscale-image': 'workflow.node.upscale-image',
  'upscale-video': 'workflow.node.upscale-video',
  'remove-bg': 'workflow.node.remove-bg',
  lipsync: 'workflow.node.lipsync',
  vfx: 'workflow.node.vfx',
  subtitle: 'workflow.node.subtitle',
  render: 'workflow.node.render',
  cut: 'workflow.node.cut',
  'input-image': 'workflow.node.input-image',
  'input-video': 'workflow.node.input-video',
  output: 'workflow.node.output',
  merge: 'workflow.node.merge',
  note: 'workflow.node.note',
  'data-table': 'workflow.node.data-table',
  'extract-media': 'workflow.node.extract-media',
  kols: 'workflow.node.kols',
};

const GROUP_LABEL_KEYS: Record<string, WorkflowKeys> = {
  frequent: 'workflow.group.frequent',
  control: 'workflow.group.control',
  content: 'workflow.group.content',
  process: 'workflow.group.process',
  io: 'workflow.group.io',
};

const PORT_ID_KEYS: Record<string, WorkflowKeys> = {
  trigger: 'workflow.port.trigger',
  'text-in': 'workflow.port.textIn',
  'text-out': 'workflow.port.textOut',
  done: 'workflow.port.done',
  text: 'workflow.port.text',
  data: 'workflow.port.data',
  image: 'workflow.port.image',
  video: 'workflow.port.video',
  audio: 'workflow.port.audio',
  note: 'workflow.port.note',
  out: 'workflow.port.out',
  all: 'workflow.port.all',
  'media-out': 'workflow.port.mediaOut',
  'media-in': 'workflow.port.mediaIn',
  merge: 'workflow.port.mergeImage',
  'first-frame': 'workflow.port.firstFrame',
  prompt: 'workflow.port.prompt',
  ref: 'workflow.port.ref',
  subtitle: 'workflow.port.subtitle',
};

const PORT_CONTEXT_KEYS: Record<string, Record<string, WorkflowKeys>> = {
  'media-in': {
    image: 'workflow.port.imageIn',
    video: 'workflow.port.videoIn',
  },
  merge: {
    image: 'workflow.port.mergeImage',
    video: 'workflow.port.mergeVideo',
  },
  all: {
    image: 'workflow.port.allImages',
    video: 'workflow.port.allVideos',
  },
  'media-out': {
    image: 'workflow.port.urlImage',
    video: 'workflow.port.urlVideo',
    audio: 'workflow.port.urlAudio',
    music: 'workflow.port.urlMusic',
  },
  image: {
    kols: 'workflow.port.kolImage',
  },
  'text-out': {
    kols: 'workflow.port.kolName',
    'data-table': 'workflow.port.json',
  },
  out: {
    'data-table': 'workflow.port.firstRow',
  },
  'first-frame': {
    video: 'workflow.port.firstFrame',
  },
};

const INLINE_PORT_KEYS: Record<string, WorkflowKeys> = {
  payload: 'workflow.port.payload',
  response: 'workflow.port.response',
  value: 'workflow.port.value',
  true: 'workflow.port.true',
  false: 'workflow.port.false',
  activate: 'workflow.port.activate',
  input: 'workflow.port.input',
  copy: 'workflow.port.copy',
  each: 'workflow.port.eachLoop',
  'loop-done': 'workflow.port.loopDone',
  start: 'workflow.port.start',
  end: 'workflow.port.end',
  json: 'workflow.port.json',
  'first-row': 'workflow.port.firstRow',
  'kol-image': 'workflow.port.kolImage',
  'kol-name': 'workflow.port.kolName',
};

function soon(key: string, icon: IconType, t: TranslateFn): NodeDef {
  return {
    key,
    label: resolveNodeLabel(t, key),
    icon,
    implemented: false,
  };
}

type NodeGroupDef = {
  id: string;
  color: string;
  icon: IconType;
  defaultOpen?: boolean;
  nodeKeys: Array<{ key: string; icon: IconType; implemented: boolean }>;
};

const NODE_GROUP_DEFS: NodeGroupDef[] = [
  {
    id: 'frequent',
    color: '#fbbf24',
    icon: Sparkles,
    defaultOpen: true,
    nodeKeys: [
      { key: 'start', icon: Play, implemented: true },
      { key: 'api', icon: Globe, implemented: true },
      { key: 'end', icon: Flag, implemented: true },
      { key: 'image', icon: Image, implemented: true },
      { key: 'agent', icon: Bot, implemented: true },
      { key: 'text', icon: Type, implemented: true },
    ],
  },
  {
    id: 'control',
    color: '#a78bfa',
    icon: GitBranch,
    nodeKeys: [
      { key: 'start', icon: Play, implemented: true },
      { key: 'end', icon: Flag, implemented: true },
      { key: 'condition', icon: GitBranch, implemented: true },
      { key: 'delay', icon: Timer, implemented: true },
      { key: 'loop', icon: Repeat, implemented: true },
      { key: 'clone', icon: Copy, implemented: true },
      { key: 'notify', icon: Bell, implemented: true },
    ],
  },
  {
    id: 'content',
    color: '#2dd4bf',
    icon: Sparkles,
    defaultOpen: true,
    nodeKeys: [
      { key: 'image', icon: Image, implemented: true },
      { key: 'video', icon: Video, implemented: true },
      { key: 'tts', icon: Volume2, implemented: true },
      { key: 'music', icon: Music, implemented: true },
      { key: 'prompt', icon: Wand2, implemented: false },
      { key: 'storyboard', icon: LayoutGrid, implemented: false },
    ],
  },
  {
    id: 'process',
    color: '#a78bfa',
    icon: Wand2,
    nodeKeys: [
      { key: 'api', icon: Globe, implemented: true },
      { key: 'upscale-image', icon: ArrowUpCircle, implemented: true },
      { key: 'upscale-video', icon: ArrowUpCircle, implemented: true },
      { key: 'remove-bg', icon: Eraser, implemented: true },
      { key: 'lipsync', icon: Video, implemented: true },
      { key: 'vfx', icon: Wand2, implemented: true },
      { key: 'subtitle', icon: Captions, implemented: true },
      { key: 'render', icon: Film, implemented: true },
      { key: 'cut', icon: Scissors, implemented: true },
    ],
  },
  {
    id: 'io',
    color: '#34d399',
    icon: Package,
    nodeKeys: [
      { key: 'agent', icon: Bot, implemented: true },
      { key: 'text', icon: Type, implemented: true },
      { key: 'input-image', icon: Image, implemented: true },
      { key: 'input-video', icon: Video, implemented: true },
      { key: 'output', icon: Package, implemented: true },
      { key: 'merge', icon: Combine, implemented: true },
      { key: 'note', icon: StickyNote, implemented: true },
      { key: 'data-table', icon: Database, implemented: true },
      { key: 'extract-media', icon: Download, implemented: true },
      { key: 'kols', icon: Users, implemented: true },
    ],
  },
];

export function resolveNodeLabel(t: TranslateFn, key: string): string {
  const labelKey = NODE_LABEL_KEYS[key];
  return labelKey ? t(labelKey) : key;
}

export function resolvePortLabel(
  t: TranslateFn,
  portId: string,
  fallback?: string,
  context?: string,
): string {
  const ctxKey = context && PORT_CONTEXT_KEYS[portId]?.[context];
  if (ctxKey) return t(ctxKey);
  const inlineKey = INLINE_PORT_KEYS[portId];
  if (inlineKey) return t(inlineKey);
  const idKey = PORT_ID_KEYS[portId];
  if (idKey) return t(idKey);
  return fallback ?? portId;
}

export function translatePorts(
  t: TranslateFn,
  ports: { in: readonly WfPortDef[]; out: readonly WfPortDef[] },
  context?: string,
): { in: WfPortDef[]; out: WfPortDef[] } {
  const mapPort = (p: WfPortDef) => ({
    ...p,
    label: resolvePortLabel(t, p.id, p.label, context),
  });
  return {
    in: ports.in.map(mapPort),
    out: ports.out.map(mapPort),
  };
}

export function getNodeGroups(t: TranslateFn): NodeGroup[] {
  return NODE_GROUP_DEFS.map((g) => ({
    id: g.id,
    color: g.color,
    icon: g.icon,
    defaultOpen: g.defaultOpen,
    label: t(GROUP_LABEL_KEYS[g.id] ?? 'workflow.group.frequent'),
    nodes: g.nodeKeys.map((n) =>
      n.implemented
        ? {
            key: n.key,
            label: resolveNodeLabel(t, n.key),
            icon: n.icon,
            implemented: true,
          }
        : soon(n.key, n.icon, t),
    ),
  }));
}
