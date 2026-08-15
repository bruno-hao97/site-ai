import type { Edge, Node } from '@xyflow/react';
import {
  createProject,
  loadProjects,
  updateProject,
  type Project,
} from './projectStore';
import { authUserKey } from './authStore';

export type WorkflowGroup = Project;

export interface SavedTemplate {
  id: string;
  name: string;
  groupId: string | null;
  nodes: Node[];
  edges: Edge[];
  nodeCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Dữ liệu graph tối thiểu để lưu một template. */
export interface TemplateGraph {
  nodes: Node[];
  edges: Edge[];
}

export const WORKFLOW_GROUP_COLORS = [
  '#2dd4bf',
  '#a78bfa',
  '#fbbf24',
  '#f87171',
  '#31c992',
  '#60a5fa',
  '#f472b6',
  '#fb923c',
];

const EVENT = 'wf-library:updated';

interface LegacyWorkflowGroup {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

function userKey(): string {
  return authUserKey();
}

function legacyGroupsKey(): string {
  return `ai_wf_groups:${userKey()}`;
}

function migrationFlagKey(): string {
  return `ai_wf_groups_migrated:${userKey()}`;
}

function templatesKey(): string {
  return `ai_wf_templates:${userKey()}`;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function dispatch(): void {
  document.dispatchEvent(new CustomEvent(EVENT));
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Bỏ trạng thái chạy (status/resultUrl…) khi lưu template. */
function stripRuntime(nodes: Node[]): Node[] {
  return nodes.map((n) => {
    const data = (n.data ?? {}) as Record<string, unknown>;
    const { status, statusText, resultUrl, error, ...rest } = data;
    void status;
    void statusText;
    void resultUrl;
    void error;
    return { id: n.id, type: n.type, position: n.position, data: rest } as Node;
  });
}

function migrateLegacyGroups(): void {
  if (localStorage.getItem(migrationFlagKey())) return;

  const legacy = readJson<LegacyWorkflowGroup[]>(legacyGroupsKey(), []);
  if (!Array.isArray(legacy) || legacy.length === 0) {
    localStorage.setItem(migrationFlagKey(), '1');
    return;
  }

  const projects = loadProjects();
  const idMap = new Map<string, string>();

  for (const g of legacy) {
    const existing =
      projects.find((p) => p.id === g.id) || projects.find((p) => p.name === g.name);
    if (existing) {
      idMap.set(g.id, existing.id);
    } else {
      const created = createProject(g.name, g.color);
      idMap.set(g.id, created.id);
      projects.unshift(created);
    }
  }

  const templates = loadTemplates();
  let changed = false;
  const updated = templates.map((t) => {
    if (t.groupId && idMap.has(t.groupId)) {
      changed = true;
      return { ...t, groupId: idMap.get(t.groupId)! };
    }
    return t;
  });
  if (changed) saveTemplates(updated);

  localStorage.removeItem(legacyGroupsKey());
  localStorage.setItem(migrationFlagKey(), '1');
  dispatch();
}

/* ---------- Groups (unified with projectStore) ---------- */

export function loadGroups(): WorkflowGroup[] {
  migrateLegacyGroups();
  return loadProjects();
}

export function createGroup(name: string, color?: string): WorkflowGroup {
  migrateLegacyGroups();
  return createProject(name, color);
}

export function updateGroup(
  id: string,
  patch: Partial<Pick<WorkflowGroup, 'name' | 'color'>>,
): void {
  updateProject(id, patch);
  dispatch();
}

/** Chỉ gỡ workflow khỏi nhóm — không xóa dự án trên /projects. */
export function deleteGroup(id: string): void {
  unassignTemplatesFromProject(id);
}

export function unassignTemplatesFromProject(projectId: string): void {
  const templates = loadTemplates();
  let changed = false;
  const updated = templates.map((t) => {
    if (t.groupId !== projectId) return t;
    changed = true;
    return { ...t, groupId: null, updatedAt: new Date().toISOString() };
  });
  if (changed) {
    saveTemplates(updated);
    dispatch();
  }
}

/* ---------- Templates ---------- */

export function loadTemplates(): SavedTemplate[] {
  const arr = readJson<SavedTemplate[]>(templatesKey(), []);
  return Array.isArray(arr) ? arr : [];
}

function saveTemplates(list: SavedTemplate[]): void {
  localStorage.setItem(templatesKey(), JSON.stringify(list));
}

export function saveTemplate(
  name: string,
  graph: TemplateGraph,
  groupId: string | null = null,
): SavedTemplate {
  const nodes = stripRuntime(graph.nodes);
  const now = new Date().toISOString();
  const template: SavedTemplate = {
    id: newId('wft'),
    name: name.trim() || 'Workflow mới',
    groupId,
    nodes,
    edges: graph.edges,
    nodeCount: nodes.length,
    createdAt: now,
    updatedAt: now,
  };
  saveTemplates([template, ...loadTemplates()]);
  dispatch();
  return template;
}

export function renameTemplate(id: string, name: string): void {
  const list = loadTemplates().map((t) =>
    t.id === id ? { ...t, name: name.trim() || t.name, updatedAt: new Date().toISOString() } : t,
  );
  saveTemplates(list);
  dispatch();
}

export function deleteTemplate(id: string): void {
  saveTemplates(loadTemplates().filter((t) => t.id !== id));
  dispatch();
}

export function assignTemplateToGroup(id: string, groupId: string | null): void {
  const list = loadTemplates().map((t) =>
    t.id === id ? { ...t, groupId, updatedAt: new Date().toISOString() } : t,
  );
  saveTemplates(list);
  dispatch();
}

export function getTemplate(id: string): SavedTemplate | null {
  return loadTemplates().find((t) => t.id === id) ?? null;
}

export function listTemplates(groupId: string | null | undefined): SavedTemplate[] {
  const all = loadTemplates();
  const scoped = groupId ? all.filter((t) => t.groupId === groupId) : all;
  return scoped
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function countByGroup(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of loadTemplates()) {
    if (t.groupId) counts[t.groupId] = (counts[t.groupId] ?? 0) + 1;
  }
  return counts;
}

export function onLibraryUpdated(handler: () => void): () => void {
  document.addEventListener(EVENT, handler);
  return () => document.removeEventListener(EVENT, handler);
}
