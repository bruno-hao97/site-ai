import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  FolderOpen,
  GitBranch,
  Play,
  Plus,
  Save,
  Search,
  Settings2,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  assignTemplateToGroup,
  countByGroup,
  createGroup,
  deleteGroup,
  deleteTemplate,
  listTemplates,
  loadGroups,
  onLibraryUpdated,
  saveTemplate,
  updateGroup,
  WORKFLOW_GROUP_COLORS,
  type SavedTemplate,
  type TemplateGraph,
  type WorkflowGroup,
} from '../services/workflowLibraryStore';
import { onProjectsUpdated } from '../services/projectStore';
import { parseWflFile } from '../services/wflImport';
import { useLocale } from '../i18n';

interface Props {
  open: boolean;
  currentGraph: () => TemplateGraph;
  onOpenTemplate: (t: SavedTemplate) => void;
  onClose: () => void;
}

export default function WorkflowLibrary({ open, currentGraph, onOpenTemplate, onClose }: Props) {
  const { t, locale } = useLocale();
  const [tick, setTick] = useState(0);
  const [query, setQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [importError, setImportError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    const unsubLib = onLibraryUpdated(bump);
    const unsubProj = onProjectsUpdated(bump);
    return () => {
      unsubLib();
      unsubProj();
    };
  }, []);

  const groups = useMemo(() => loadGroups(), [tick, open]);
  const counts = useMemo(() => countByGroup(), [tick, open]);
  const allTemplates = useMemo(() => listTemplates(null), [tick, open]);

  const templates = useMemo(() => {
    const base = activeGroup ? allTemplates.filter((tpl) => tpl.groupId === activeGroup) : allTemplates;
    const q = query.trim().toLowerCase();
    return q ? base.filter((tpl) => tpl.name.toLowerCase().includes(q)) : base;
  }, [allTemplates, activeGroup, query]);

  if (!open) return null;

  const localeTag = locale === 'vi' ? 'vi-VN' : 'en-US';

  const handleSaveCurrent = () => {
    const graph = currentGraph();
    if (!graph.nodes.length) {
      window.alert(t('workflow.lib.canvasEmpty'));
      return;
    }
    const name = newName.trim() || `Workflow ${new Date().toLocaleString(localeTag)}`;
    saveTemplate(name, graph, activeGroup);
    setNewName('');
  };

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;
    setImportError('');
    try {
      const raw = await file.text();
      const { name, graph } = parseWflFile(raw);
      if (!graph.nodes.length) {
        setImportError(t('workflow.lib.importNoNodes'));
        return;
      }
      const baseName = name || file.name.replace(/\.(wfl|json)$/i, '');
      saveTemplate(baseName, graph, activeGroup);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return createPortal(
    <div className="wflib-overlay" onClick={onClose}>
      <div className="wflib-modal" onClick={(e) => e.stopPropagation()}>
        <header className="wflib-head">
          <div className="wflib-head-icon">
            <FolderOpen size={20} />
          </div>
          <div className="wflib-head-text">
            <span className="wflib-eyebrow">{t('workflow.lib.eyebrow')}</span>
            <h2>{t('workflow.lib.title')}</h2>
            <p>{t('workflow.lib.subtitle')}</p>
          </div>
          <button type="button" className="wflib-close" onClick={onClose} title={t('workflow.lib.close')}>
            <X size={18} />
          </button>
        </header>

        <div className="wflib-stats">
          <div className="wflib-stat">
            <span className="wflib-stat-label">{t('workflow.lib.statWorkflows')}</span>
            <span className="wflib-stat-value">{allTemplates.length}</span>
          </div>
          <div className="wflib-stat">
            <span className="wflib-stat-label">{t('workflow.lib.statGroups')}</span>
            <span className="wflib-stat-value">{groups.length}</span>
          </div>
        </div>

        <div className="wflib-actions">
          <div className="wflib-search">
            <Search size={15} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('workflow.lib.searchPlaceholder')}
            />
          </div>
          <input
            ref={nameInputRef}
            type="text"
            className="wflib-name-input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('workflow.lib.namePlaceholder')}
          />
          <button type="button" className="wflib-save-btn" onClick={handleSaveCurrent}>
            <Save size={15} /> {t('workflow.lib.saveCurrent')}
          </button>
          <button
            type="button"
            className="wflib-import-btn"
            onClick={() => fileRef.current?.click()}
            title={t('workflow.lib.importFile')}
          >
            <Upload size={15} /> {t('workflow.lib.importFile')}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".wfl,.json,application/json"
            className="sr-only"
            onChange={(e) => void handleImportFile(e.target.files?.[0])}
          />
        </div>

        {importError && <div className="wflib-import-error">{importError}</div>}

        <div className="wflib-tabs">
          <button
            type="button"
            className={`wflib-tab${activeGroup === null ? ' active' : ''}`}
            onClick={() => setActiveGroup(null)}
          >
            {t('workflow.lib.all')} <span className="wflib-tab-count">{allTemplates.length}</span>
          </button>
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              className={`wflib-tab${activeGroup === g.id ? ' active' : ''}`}
              onClick={() => setActiveGroup(g.id)}
            >
              <span className="wflib-dot" style={{ background: g.color }} />
              {g.name} <span className="wflib-tab-count">{counts[g.id] ?? 0}</span>
            </button>
          ))}
          <button
            type="button"
            className="wflib-tab wflib-manage"
            onClick={() => setManageOpen(true)}
            title={t('workflow.lib.manageGroups')}
          >
            <Settings2 size={14} /> {t('workflow.lib.manageGroups')}
          </button>
        </div>

        <div className="wflib-grid">
          {templates.length === 0 && (
            <div className="wflib-empty wflib-empty--illustrated">
              <span className="wflib-empty-icon" aria-hidden>
                <GitBranch size={28} />
              </span>
              <h3>{t('workflow.lib.emptyTitle')}</h3>
              <p>{activeGroup ? t('workflow.lib.emptyInGroup') : t('workflow.lib.emptyBody')}</p>
              <div className="wflib-empty-actions">
                <button
                  type="button"
                  className="wflib-empty-primary"
                  onClick={() => {
                    nameInputRef.current?.focus();
                    handleSaveCurrent();
                  }}
                >
                  <Save size={14} />
                  {t('workflow.lib.saveCurrent')}
                </button>
                <button
                  type="button"
                  className="wflib-empty-secondary"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload size={14} />
                  {t('workflow.lib.importFile')}
                </button>
              </div>
            </div>
          )}
          {templates.map((tpl) => (
            <TemplateCard
              key={tpl.id}
              template={tpl}
              groups={groups}
              onOpen={() => {
                onOpenTemplate(tpl);
                onClose();
              }}
            />
          ))}
        </div>

        {manageOpen && <ManageGroups groups={groups} onClose={() => setManageOpen(false)} />}
      </div>
    </div>,
    document.body,
  );
}

function TemplateCard({
  template,
  groups,
  onOpen,
}: {
  template: SavedTemplate;
  groups: WorkflowGroup[];
  onOpen: () => void;
}) {
  const { t } = useLocale();
  const group = groups.find((g) => g.id === template.groupId) || null;

  return (
    <div className="wflib-card">
      <div className="wflib-card-thumb" style={group ? { borderColor: group.color } : undefined}>
        <FolderOpen size={26} />
        {group && <span className="wflib-card-tag" style={{ background: group.color }} />}
      </div>
      <div className="wflib-card-body">
        <div className="wflib-card-name" title={template.name}>
          {template.name}
        </div>
        <div className="wflib-card-meta">
          {t('workflow.lib.nodeCount', { count: template.nodeCount })}
        </div>
        <div className="wflib-card-row">
          <select
            className="wflib-card-group"
            value={template.groupId ?? ''}
            onChange={(e) => assignTemplateToGroup(template.id, e.target.value || null)}
          >
            <option value="">{t('workflow.lib.ungrouped')}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="wflib-card-actions">
        <button type="button" className="wflib-card-open" onClick={onOpen}>
          <Play size={13} /> {t('workflow.lib.open')}
        </button>
        <button
          type="button"
          className="wflib-card-del"
          title={t('workflow.lib.delete')}
          onClick={() => {
            if (window.confirm(t('workflow.lib.deleteConfirm', { name: template.name }))) {
              deleteTemplate(template.id);
            }
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function ManageGroups({ groups, onClose }: { groups: WorkflowGroup[]; onClose: () => void }) {
  const { t } = useLocale();
  const [name, setName] = useState('');
  const [color, setColor] = useState(WORKFLOW_GROUP_COLORS[0]);

  const create = () => {
    if (!name.trim()) return;
    createGroup(name, color);
    setName('');
  };

  return (
    <div className="wflib-sub-overlay" onClick={onClose}>
      <div className="wflib-sub" onClick={(e) => e.stopPropagation()}>
        <header className="wflib-sub-head">
          <div className="wflib-head-icon sm">
            <FolderOpen size={16} />
          </div>
          <div className="wflib-head-text">
            <h3>{t('workflow.lib.manageTitle')}</h3>
            <p>{t('workflow.lib.manageSubtitle')}</p>
          </div>
          <button type="button" className="wflib-close" onClick={onClose} title={t('workflow.lib.close')}>
            <X size={16} />
          </button>
        </header>

        <div className="wflib-sub-create">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
            placeholder={t('workflow.lib.newGroupPlaceholder')}
          />
          <div className="wflib-swatches">
            {WORKFLOW_GROUP_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`wflib-swatch${color === c ? ' active' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
              >
                {color === c && <Check size={12} />}
              </button>
            ))}
          </div>
          <button type="button" className="wflib-sub-add" onClick={create} disabled={!name.trim()}>
            <Plus size={15} />
          </button>
        </div>

        <div className="wflib-sub-list">
          {groups.length === 0 && <div className="wflib-empty sm">{t('workflow.lib.noGroups')}</div>}
          {groups.map((g) => (
            <GroupRow key={g.id} group={g} />
          ))}
        </div>
      </div>
    </div>
  );
}

function GroupRow({ group }: { group: WorkflowGroup }) {
  const { t } = useLocale();
  const counts = countByGroup();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);

  const commit = () => {
    updateGroup(group.id, { name });
    setEditing(false);
  };

  return (
    <div className="wflib-grp-row">
      <span className="wflib-dot" style={{ background: group.color }} />
      {editing ? (
        <input
          className="wflib-grp-edit"
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
        />
      ) : (
        <button type="button" className="wflib-grp-name" onClick={() => setEditing(true)}>
          {group.name}
          <span className="wflib-grp-count">
            {t('workflow.lib.groupWorkflowCount', { count: counts[group.id] ?? 0 })}
          </span>
        </button>
      )}
      <button
        type="button"
        className="wflib-card-del"
        title={t('workflow.lib.deleteGroup')}
        onClick={() => {
          if (window.confirm(t('workflow.lib.deleteGroupConfirm', { name: group.name }))) {
            deleteGroup(group.id);
          }
        }}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
