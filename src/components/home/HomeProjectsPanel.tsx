import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FolderOpen, GitBranch, Plus } from 'lucide-react';
import {
  countByProject,
  createProject,
  loadProjects,
  onProjectsUpdated,
  type Project,
} from '../../services/projectStore';
import { useLocale } from '../../i18n';

export default function HomeProjectsPanel() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const refresh = () => {
    setProjects(loadProjects());
    setCounts(countByProject());
  };

  useEffect(() => {
    refresh();
    return onProjectsUpdated(refresh);
  }, []);

  const handleNewProject = () => {
    const p = createProject(t('home.projects.defaultName'));
    navigate(`/projects?p=${p.id}`);
  };

  const recent = projects.slice(0, 4);

  return (
    <div className="home-panels">
      <section className="home-panel home-panel--projects">
        <div className="home-panel-head">
          <h2>{t('home.section.projects')}</h2>
          <Link to="/projects" className="home-panel-link">
            {t('home.projects.viewAll')}
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="home-panel-empty">{t('home.projects.empty')}</p>
        ) : (
          <ul className="home-project-list">
            {recent.map((p) => (
              <li key={p.id}>
                <Link to={`/projects?p=${p.id}`} className="home-project-item">
                  <FolderOpen size={16} />
                  <span className="home-project-name">{p.name}</span>
                  <span className="home-project-count">{counts[p.id] ?? 0}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="home-panel-action" onClick={handleNewProject}>
          <Plus size={15} />
          {t('home.projects.new')}
        </button>
      </section>

      <section className="home-panel home-panel--space">
        <div className="home-panel-space-visual" aria-hidden>
          <GitBranch size={28} strokeWidth={1.5} />
        </div>
        <h2>{t('home.section.createSpace')}</h2>
        <p>{t('home.createSpace.lead')}</p>
        <Link to="/workflow" className="home-panel-cta">
          {t('home.createSpace.cta')}
        </Link>
      </section>
    </div>
  );
}
