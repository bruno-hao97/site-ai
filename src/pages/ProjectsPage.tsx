import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Check,
  FileAudio,
  FolderOpen,
  GitBranch,
  MessageCircle,
  Music,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  countByProject,
  createProject,
  deleteProject,
  getDefaultProjectId,
  isAutoAssignEnabled,
  listItemsByProject,
  loadProjectItems,
  loadProjects,
  onProjectsUpdated,
  removeItem,
  setAutoAssignEnabled,
  setDefaultProjectId,
  updateProject,
  PROJECT_COLORS,
  type Project,
  type ProjectItem,
} from '../services/projectStore';
import {
  countByGroup,
  deleteTemplate,
  listTemplates,
  onLibraryUpdated,
  unassignTemplatesFromProject,
  type SavedTemplate,
} from '../services/workflowLibraryStore';
import { useLocale } from '../i18n';
import type { TranslationKey } from '../i18n';

type CatFilter = 'all' | 'image' | 'video' | 'tts' | 'music' | 'chat' | 'workflow';

const CAT_KEYS: { value: CatFilter; labelKey: TranslationKey }[] = [
  { value: 'all', labelKey: 'projects.filter.all' },
  { value: 'image', labelKey: 'projects.filter.image' },
  { value: 'video', labelKey: 'projects.filter.video' },
  { value: 'tts', labelKey: 'projects.filter.tts' },
  { value: 'music', labelKey: 'projects.filter.music' },
  { value: 'chat', labelKey: 'projects.filter.chat' },
  { value: 'workflow', labelKey: 'projects.filter.workflow' },
];

function renderMedia(it: ProjectItem) {
  const url = it.downloadUrl || it.thumbnailUrl || '';
  if (it.type === 'image' || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url)) {
    return <img src={it.thumbnailUrl || url} alt="" loading="lazy" />;
  }
  if (it.type === 'video' || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)) {
    if (it.thumbnailUrl) return <img src={it.thumbnailUrl} alt="" loading="lazy" />;
    return <video src={url} preload="metadata" muted playsInline />;
  }
  if (it.type === 'music') {
    return (
      <span className="project-item-icon" aria-hidden>
        <Music size={28} strokeWidth={1.5} />
      </span>
    );
  }
  return (
    <span className="project-item-icon" aria-hidden>
      <FileAudio size={28} strokeWidth={1.5} />
    </span>
  );
}

function matchesMediaSearch(it: ProjectItem, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = [it.prompt, it.downloadUrl, it.thumbnailUrl, it.itemId]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(needle);
}

function matchesWorkflowSearch(tpl: SavedTemplate, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = [tpl.name, tpl.id].filter(Boolean).join(' ').toLowerCase();
  return hay.includes(needle);
}

export default function ProjectsPage() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [wfCounts, setWfCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [totalWorkflows, setTotalWorkflows] = useState(0);
  const [selected, setSelected] = useState<string | null>(searchParams.get('p'));
  const [cat, setCat] = useState<CatFilter>('all');
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [defaultProjectId, setDefaultProjectIdState] = useState<string | null>(null);
  const [autoAssign, setAutoAssignState] = useState(false);
  const [libTick, setLibTick] = useState(0);

  const refresh = () => {
    setProjects(loadProjects());
    setCounts(countByProject());
    setWfCounts(countByGroup());
    setTotal(loadProjectItems().length);
    setTotalWorkflows(listTemplates(null).length);
    setDefaultProjectIdState(getDefaultProjectId());
    setAutoAssignState(isAutoAssignEnabled());
    setLibTick((n) => n + 1);
  };

  useEffect(() => {
    refresh();
    const unsubProj = onProjectsUpdated(refresh);
    const unsubLib = onLibraryUpdated(refresh);
    return () => {
      unsubProj();
      unsubLib();
    };
  }, []);

  const isWorkflowTab = cat === 'workflow';
  const isChatTab = cat === 'chat';
  const isAllTab = cat === 'all';
  const showWorkflows = (isWorkflowTab || isAllTab) && !isChatTab;
  const showChat = !isWorkflowTab && (isChatTab || isAllTab);
  const showMedia = !isWorkflowTab && !isChatTab;

  const items = useMemo(() => {
    const base = listItemsByProject(selected);
    const byCat = cat === 'all' ? base : base.filter((it) => it.type === cat);
    return byCat.filter((it) => matchesMediaSearch(it, search));
  }, [selected, cat, search, projects, counts]);

  const chatItems = useMemo(
    () => items.filter((it) => it.type === 'chat'),
    [items],
  );

  const mediaItems = useMemo(
    () => items.filter((it) => it.type !== 'chat'),
    [items],
  );

  const workflows = useMemo(() => {
    void libTick;
    const scoped = selected ? listTemplates(selected) : listTemplates(null);
    return scoped.filter((tpl) => matchesWorkflowSearch(tpl, search));
  }, [selected, search, libTick]);

  const selectedProject = projects.find((p) => p.id === selected) || null;

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    const p = createProject(name);
    setNewName('');
    setSelected(p.id);
  };

  const startEdit = (p: Project) => {
    setEditing(p.id);
    setEditName(p.name);
  };

  const saveEdit = (id: string) => {
    updateProject(id, { name: editName });
    setEditing(null);
  };

  const handleDelete = (p: Project) => {
    if (!window.confirm(t('projects.deleteConfirm', { name: p.name }))) return;
    deleteProject(p.id);
    unassignTemplatesFromProject(p.id);
    if (selected === p.id) setSelected(null);
  };

  const onDefaultChange = (id: string) => {
    const next = id || null;
    setDefaultProjectId(next);
    setDefaultProjectIdState(next);
  };

  const onAutoAssignChange = (enabled: boolean) => {
    setAutoAssignEnabled(enabled);
    setAutoAssignState(enabled);
  };

  const openWorkflow = (tpl: SavedTemplate) => {
    navigate(`/workflow?wft=${encodeURIComponent(tpl.id)}`);
  };

  const handleDeleteWorkflow = (tpl: SavedTemplate) => {
    if (!window.confirm(t('projects.deleteWorkflowConfirm', { name: tpl.name }))) return;
    deleteTemplate(tpl.id);
  };

  const searchPlaceholder = isWorkflowTab
    ? t('projects.searchWorkflowPlaceholder')
    : isChatTab
      ? t('projects.searchChatPlaceholder')
      : isAllTab
        ? t('projects.searchAllPlaceholder')
        : t('projects.searchPlaceholder');

  const showEmpty =
    (showChat ? chatItems.length === 0 : true) &&
    (showMedia ? mediaItems.length === 0 : true) &&
    (showWorkflows ? workflows.length === 0 : true);

  const openChat = (sessionId: string) => {
    navigate(`/chat?session=${encodeURIComponent(sessionId)}`);
  };

  const renderChatGrid = () => (
    <div className="projects-chat-grid">
      {chatItems.map((it) => {
        const group = projects.find((p) => p.id === it.projectId) || null;
        const title = it.prompt?.trim() || t('chat.newSession');
        const preview = it.prompt?.trim() || t('projects.chatPreviewEmpty');
        return (
          <article key={it.itemId} className="project-chat-item">
            <div
              className="project-chat-thumb"
              style={group ? { borderColor: `${group.color}55` } : undefined}
            >
              <span className="project-chat-icon-wrap" aria-hidden>
                <MessageCircle size={24} strokeWidth={1.85} />
              </span>
              <p className="project-chat-preview" title={preview}>
                {preview}
              </p>
              {group && (
                <span className="project-chat-dot" style={{ background: group.color }} />
              )}
            </div>
            <div className="project-chat-body">
              <h3 className="project-chat-name" title={title}>
                {title}
              </h3>
              <p className="project-chat-meta">{t('projects.chatMeta')}</p>
              {!selected && group && (
                <p className="project-chat-group">
                  <span className="project-pick-dot" style={{ background: group.color }} />
                  {group.name}
                </p>
              )}
            </div>
            <div className="project-chat-actions">
              <button
                type="button"
                className="project-chat-open"
                onClick={() => openChat(it.itemId)}
              >
                <MessageCircle size={13} />
                {t('projects.openChat')}
              </button>
              <button
                type="button"
                className="project-chat-del"
                aria-label={t('projects.removeAria')}
                onClick={() => removeItem(it.itemId)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );

  const renderWorkflowGrid = () => (
    <div className="projects-wf-grid">
      {workflows.map((tpl) => {
        const group = projects.find((p) => p.id === tpl.groupId) || null;
        return (
          <article key={tpl.id} className="project-wf-item">
            <div
              className="project-wf-thumb"
              style={group ? { borderColor: group.color } : undefined}
            >
              <GitBranch size={28} strokeWidth={1.5} />
              {group && <span className="project-wf-dot" style={{ background: group.color }} />}
            </div>
            <div className="project-wf-body">
              <h3 className="project-wf-name" title={tpl.name}>
                {tpl.name}
              </h3>
              <p className="project-wf-meta">
                {t('workflow.lib.nodeCount', { count: tpl.nodeCount })}
              </p>
              {!selected && group && (
                <p className="project-wf-group">
                  <span className="project-pick-dot" style={{ background: group.color }} />
                  {group.name}
                </p>
              )}
            </div>
            <div className="project-wf-actions">
              <button type="button" className="project-wf-open" onClick={() => openWorkflow(tpl)}>
                <Play size={13} />
                {t('workflow.lib.open')}
              </button>
              <button
                type="button"
                className="project-wf-del"
                aria-label={t('projects.deleteWorkflowAria')}
                onClick={() => handleDeleteWorkflow(tpl)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );

  const renderMediaGrid = () => (
    <div className="projects-grid">
      {mediaItems.map((it) => (
        <article key={it.itemId} className="project-item">
          <a
            className="project-item-thumb"
            href={it.downloadUrl || it.thumbnailUrl || '#'}
            target="_blank"
            rel="noreferrer"
          >
            {renderMedia(it)}
          </a>
          <button
            type="button"
            className="project-item-remove"
            aria-label={t('projects.removeAria')}
            onClick={() => removeItem(it.itemId)}
          >
            <X size={14} />
          </button>
          {it.prompt && (
            <p className="project-item-prompt" title={it.prompt}>
              {it.prompt}
            </p>
          )}
        </article>
      ))}
    </div>
  );

  return (
    <div className="projects-dashboard">
      <div className="projects-layout">
        <aside className="projects-sidebar">
          <div className="projects-create">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('projects.createPlaceholder')}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <button type="button" onClick={handleCreate} aria-label={t('projects.createAria')}>
              <Plus size={16} />
            </button>
          </div>

          <button
            type="button"
            className={`projects-nav-item${selected === null ? ' active' : ''}`}
            onClick={() => setSelected(null)}
          >
            <FolderOpen size={16} strokeWidth={1.75} />
            <span className="projects-nav-name">{t('projects.all')}</span>
            <span className="projects-nav-counts">
              <span className="projects-nav-count">{total}</span>
              {totalWorkflows > 0 && (
                <span className="projects-nav-wf" title={t('projects.workflowNavHint')}>
                  <GitBranch size={11} />
                  {totalWorkflows}
                </span>
              )}
            </span>
          </button>

          <div className="projects-nav-list">
            {projects.map((p) => (
              <div
                key={p.id}
                className={`projects-nav-item${selected === p.id ? ' active' : ''}`}
                onClick={() => setSelected(p.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelected(p.id);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <span className="project-pick-dot" style={{ background: p.color }} />
                {editing === p.id ? (
                  <input
                    className="projects-edit-input"
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit(p.id);
                      if (e.key === 'Escape') setEditing(null);
                    }}
                    onBlur={() => saveEdit(p.id)}
                  />
                ) : (
                  <span className="projects-nav-name">{p.name}</span>
                )}
                <span className="projects-nav-counts">
                  <span className="projects-nav-count">{counts[p.id] ?? 0}</span>
                  {(wfCounts[p.id] ?? 0) > 0 && (
                    <span className="projects-nav-wf" title={t('projects.workflowNavHint')}>
                      <GitBranch size={11} />
                      {wfCounts[p.id]}
                    </span>
                  )}
                </span>
              </div>
            ))}
            {projects.length === 0 && (
              <p className="projects-sidebar-empty">{t('projects.sidebarEmpty')}</p>
            )}
          </div>

          {projects.length > 0 && (
            <div className="projects-prefs">
              <label className="projects-prefs-label" htmlFor="projects-default">
                {t('projects.defaultProject')}
              </label>
              <select
                id="projects-default"
                className="projects-prefs-select"
                value={defaultProjectId ?? ''}
                onChange={(e) => onDefaultChange(e.target.value)}
              >
                <option value="">{t('projects.defaultNone')}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <label className="projects-prefs-toggle">
                <input
                  type="checkbox"
                  checked={autoAssign}
                  disabled={!defaultProjectId}
                  onChange={(e) => onAutoAssignChange(e.target.checked)}
                />
                <span>{t('projects.autoAssign')}</span>
              </label>
            </div>
          )}
        </aside>

        <section className="projects-main">
          <header className="projects-main-head">
            <div className="projects-main-title">
              {selectedProject && (
                <span className="project-pick-dot" style={{ background: selectedProject.color }} />
              )}
              <h1 className="projects-main-heading">
                {selectedProject ? selectedProject.name : t('projects.allTitle')}
              </h1>
              {selectedProject && editing !== selectedProject.id && (
                <div className="projects-main-actions">
                  <button
                    type="button"
                    onClick={() => startEdit(selectedProject)}
                    aria-label={t('projects.renameAria')}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => handleDelete(selectedProject)}
                    aria-label={t('projects.deleteAria')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>

            <div className="projects-search">
              <Search size={15} aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
              />
            </div>

            {selectedProject && (
              <div className="projects-color-row">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`projects-color${selectedProject.color === c ? ' active' : ''}`}
                    style={{ background: c }}
                    onClick={() => updateProject(selectedProject.id, { color: c })}
                    aria-label={t('projects.colorAria')}
                  >
                    {selectedProject.color === c && <Check size={12} />}
                  </button>
                ))}
              </div>
            )}

            <div className="projects-cats" role="tablist" aria-label={t('projects.allTitle')}>
              {CAT_KEYS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  role="tab"
                  aria-selected={cat === c.value}
                  className={cat === c.value ? 'active' : ''}
                  onClick={() => setCat(c.value)}
                >
                  {t(c.labelKey)}
                </button>
              ))}
            </div>
          </header>

          {showEmpty ? (
            <div className="projects-empty">
              <p>
                {search.trim()
                  ? t('projects.emptySearch')
                  : isWorkflowTab
                    ? t('projects.emptyWorkflow')
                    : isChatTab
                      ? t('projects.emptyChat')
                      : t('projects.empty')}
              </p>
              {!search.trim() && (
                <div className="projects-empty-links">
                  {isWorkflowTab ? (
                    <Link to="/workflow">{t('projects.emptyLinkWorkflow')}</Link>
                  ) : isChatTab ? (
                    <Link to="/chat">{t('projects.emptyLinkChat')}</Link>
                  ) : isAllTab ? (
                    <>
                      <Link to="/#home-explore">{t('projects.emptyLinkMine')}</Link>
                      <Link to="/studio-history">{t('projects.emptyLinkHistory')}</Link>
                      <Link to="/workflow">{t('projects.emptyLinkWorkflow')}</Link>
                    </>
                  ) : (
                    <>
                      <Link to="/#home-explore">{t('projects.emptyLinkMine')}</Link>
                      <Link to="/studio-history">{t('projects.emptyLinkHistory')}</Link>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="projects-all-sections">
              {showWorkflows && workflows.length > 0 && (
                <section className="projects-section">
                  {isAllTab && (chatItems.length > 0 || mediaItems.length > 0) && (
                    <h2 className="projects-section-title">{t('projects.filter.workflow')}</h2>
                  )}
                  {renderWorkflowGrid()}
                </section>
              )}
              {showChat && chatItems.length > 0 && (
                <section className="projects-section">
                  {isAllTab && (workflows.length > 0 || mediaItems.length > 0) && (
                    <h2 className="projects-section-title">{t('projects.sectionChat')}</h2>
                  )}
                  {renderChatGrid()}
                </section>
              )}
              {showMedia && mediaItems.length > 0 && (
                <section className="projects-section">
                  {isAllTab && (workflows.length > 0 || chatItems.length > 0) && (
                    <h2 className="projects-section-title">{t('projects.sectionMedia')}</h2>
                  )}
                  {renderMediaGrid()}
                </section>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
