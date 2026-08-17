import { authUserKey } from './authStore';

export interface Project {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export type ProjectItemType = 'image' | 'video' | 'tts' | 'music' | 'chat' | string;

export interface ProjectItem {
  itemId: string;
  projectId: string;
  type: ProjectItemType;
  prompt?: string;
  thumbnailUrl?: string;
  downloadUrl?: string;
  createdTime?: string | number;
  addedAt: string;
}

/** Dữ liệu tối thiểu để gắn một item Gommo vào project. */
export type ProjectItemSnapshot = Omit<ProjectItem, 'projectId' | 'addedAt'>;

export const DEFAULT_PROJECT_COLOR = '#64748b';

export const PROJECT_COLORS = [
  DEFAULT_PROJECT_COLOR,
];

interface ProjectPrefs {
  defaultProjectId?: string | null;
  autoAssign?: boolean;
}

const EVENT = 'projects:updated';

function userKey(): string {
  return authUserKey();
}

function projectsKey(): string {
  return `ai_projects:${userKey()}`;
}

function itemsKey(): string {
  return `ai_project_items:${userKey()}`;
}

function prefsKey(): string {
  return `ai_project_prefs:${userKey()}`;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed as T;
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

function loadPrefs(): ProjectPrefs {
  return readJson<ProjectPrefs>(prefsKey(), {});
}

function savePrefs(prefs: ProjectPrefs): void {
  localStorage.setItem(prefsKey(), JSON.stringify(prefs));
  dispatch();
}

export function loadProjects(): Project[] {
  const arr = readJson<Project[]>(projectsKey(), []);
  return Array.isArray(arr) ? arr : [];
}

function saveProjects(list: Project[]): void {
  localStorage.setItem(projectsKey(), JSON.stringify(list));
}

export function loadProjectItems(): ProjectItem[] {
  const arr = readJson<ProjectItem[]>(itemsKey(), []);
  return Array.isArray(arr) ? arr : [];
}

function saveProjectItems(list: ProjectItem[]): void {
  localStorage.setItem(itemsKey(), JSON.stringify(list));
}

export function getDefaultProjectId(): string | null {
  const id = loadPrefs().defaultProjectId;
  if (!id) return null;
  return loadProjects().some((p) => p.id === id) ? id : null;
}

export function setDefaultProjectId(id: string | null): void {
  const prefs = loadPrefs();
  prefs.defaultProjectId = id;
  savePrefs(prefs);
}

export function isAutoAssignEnabled(): boolean {
  return loadPrefs().autoAssign === true;
}

export function setAutoAssignEnabled(enabled: boolean): void {
  const prefs = loadPrefs();
  prefs.autoAssign = enabled;
  savePrefs(prefs);
}

export function buildProjectSnapshot(params: {
  itemId: string;
  type: ProjectItemType;
  prompt?: string;
  resultUrl: string;
  coverUrl?: string | null;
  createdTime?: string | number;
}): ProjectItemSnapshot {
  const url = params.resultUrl.trim();
  const cover = params.coverUrl?.trim();
  return {
    itemId: params.itemId,
    type: params.type,
    prompt: params.prompt,
    thumbnailUrl: cover || url || undefined,
    downloadUrl: url || undefined,
    createdTime: params.createdTime ?? new Date().toISOString(),
  };
}

export function tryAutoAssign(snapshot: ProjectItemSnapshot): void {
  if (!isAutoAssignEnabled()) return;
  const projectId = getDefaultProjectId();
  if (!projectId) return;
  if (getItemProjectId(snapshot.itemId)) return;
  assignItem(snapshot, projectId);
}

export function buildChatProjectSnapshot(params: {
  sessionId: string;
  title: string;
  updatedAt?: number;
}): ProjectItemSnapshot {
  return {
    itemId: params.sessionId,
    type: 'chat',
    prompt: params.title,
    createdTime: params.updatedAt ?? Date.now(),
  };
}

/** Gán chat vào dự án đang chọn sidebar, hoặc auto-assign nếu bật. */
export function assignChatSession(
  sessionId: string,
  title: string,
  opts?: { projectId?: string | null; updatedAt?: number },
): void {
  if (getItemProjectId(sessionId)) return;
  const snapshot = buildChatProjectSnapshot({
    sessionId,
    title,
    updatedAt: opts?.updatedAt,
  });
  const explicit = opts?.projectId?.trim();
  if (explicit) {
    assignItem(snapshot, explicit);
    return;
  }
  tryAutoAssign(snapshot);
}

/** Cập nhật title chat đã gán project (sau khi đổi tên session). */
export function syncChatProjectItem(
  sessionId: string,
  title: string,
  updatedAt?: number,
): void {
  const projectId = getItemProjectId(sessionId);
  if (!projectId) return;
  assignItem(
    buildChatProjectSnapshot({ sessionId, title, updatedAt }),
    projectId,
  );
}

export function countChatByProject(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const it of loadProjectItems()) {
    if (it.type !== 'chat') continue;
    counts[it.projectId] = (counts[it.projectId] ?? 0) + 1;
  }
  return counts;
}

export function createProject(name: string, color?: string): Project {
  const list = loadProjects();
  const now = new Date().toISOString();
  const project: Project = {
    id: newId('proj'),
    name: name.trim() || 'Dự án mới',
    color: color || DEFAULT_PROJECT_COLOR,
    createdAt: now,
    updatedAt: now,
  };
  saveProjects([project, ...list]);
  dispatch();
  return project;
}

export function updateProject(id: string, patch: Partial<Pick<Project, 'name' | 'color'>>): void {
  const list = loadProjects().map((p) =>
    p.id === id
      ? {
          ...p,
          name: patch.name != null ? patch.name.trim() || p.name : p.name,
          color: patch.color ?? p.color,
          updatedAt: new Date().toISOString(),
        }
      : p,
  );
  saveProjects(list);
  dispatch();
}

export function deleteProject(id: string): void {
  saveProjects(loadProjects().filter((p) => p.id !== id));
  saveProjectItems(loadProjectItems().filter((it) => it.projectId !== id));
  const prefs = loadPrefs();
  if (prefs.defaultProjectId === id) {
    prefs.defaultProjectId = null;
    localStorage.setItem(prefsKey(), JSON.stringify(prefs));
  }
  dispatch();
}

/** Item chỉ thuộc 1 project: gán = upsert (ghi đè project cũ nếu có). */
export function assignItem(snapshot: ProjectItemSnapshot, projectId: string): void {
  const rest = loadProjectItems().filter((it) => it.itemId !== snapshot.itemId);
  const record: ProjectItem = {
    ...snapshot,
    projectId,
    addedAt: new Date().toISOString(),
  };
  saveProjectItems([record, ...rest]);
  dispatch();
}

export function removeItem(itemId: string): void {
  saveProjectItems(loadProjectItems().filter((it) => it.itemId !== itemId));
  dispatch();
}

export function getItemProjectId(itemId: string): string | null {
  return loadProjectItems().find((it) => it.itemId === itemId)?.projectId ?? null;
}

export function listItemsByProject(projectId: string | null): ProjectItem[] {
  const all = loadProjectItems();
  const scoped = projectId ? all.filter((it) => it.projectId === projectId) : all;
  return scoped.slice().sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
}

export function countByProject(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const it of loadProjectItems()) {
    counts[it.projectId] = (counts[it.projectId] ?? 0) + 1;
  }
  return counts;
}

export function totalAssigned(): number {
  return loadProjectItems().length;
}

export function onProjectsUpdated(handler: () => void): () => void {
  document.addEventListener(EVENT, handler);
  return () => document.removeEventListener(EVENT, handler);
}
