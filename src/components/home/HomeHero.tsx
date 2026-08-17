import { useNavigate } from 'react-router-dom';
import { getDisplayUser } from '../../services/authStore';
import { useLocale } from '../../i18n';
import { HOME_QUICK_MENU } from '../../lib/homeQuickMenu';
import HomeCategoryIcon from './HomeCategoryIcon';
import HomeQuickCreateBar from '../HomeQuickCreateBar';

function greetingKey(hour: number): 'home.greeting.morning' | 'home.greeting.afternoon' | 'home.greeting.evening' {
  if (hour < 12) return 'home.greeting.morning';
  if (hour < 18) return 'home.greeting.afternoon';
  return 'home.greeting.evening';
}

export default function HomeHero() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const user = getDisplayUser();
  const firstName = (user.name || user.username || '').split(/\s+/)[0] || '';
  const hour = new Date().getHours();
  const greet = t(greetingKey(hour));

  const onCategory = (item: (typeof HOME_QUICK_MENU)[number]) => {
    if (item.href) {
      navigate(item.href);
      return;
    }
    if (item.jobType) {
      document.getElementById('home-quick-create')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.dispatchEvent(new CustomEvent('home-qc:set-type', { detail: item.jobType }));
    }
  };

  return (
    <section className="home-hero" id="home-hero">
      <h1 className="home-hero-title">
        {greet}
        {firstName ? `, ${firstName}` : ''}
        {' — '}
        {t('home.greeting.subtitle')}
      </h1>

      <div className="home-hero-search" id="home-quick-create">
        <HomeQuickCreateBar variant="hero" />
      </div>

      <div className="home-category-row" role="list">
        {HOME_QUICK_MENU.map((item) => (
          <button
            key={item.id}
            type="button"
            role="listitem"
            className="home-category-btn"
            onClick={() => onCategory(item)}
          >
            <HomeCategoryIcon icon={item.icon} tint={item.tint} />
            <span className="home-category-label">{t(item.labelKey)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
