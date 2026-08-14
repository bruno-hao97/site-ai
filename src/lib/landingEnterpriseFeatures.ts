import { GitBranch, Headphones, Layers, Plug, Shield, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TranslateFn } from '../i18n/LanguageProvider';
import type { TranslationKey } from '../i18n/types';

export interface EnterpriseFeature {
  icon: LucideIcon;
  title: string;
  desc: string;
}

const FEATURE_DEFS: Array<{ icon: LucideIcon; title: TranslationKey; desc: TranslationKey }> = [
  {
    icon: Zap,
    title: 'pricing.benefit.credits.title',
    desc: 'pricing.benefit.credits.desc',
  },
  {
    icon: Layers,
    title: 'pricing.benefit.studio.title',
    desc: 'pricing.benefit.studio.desc',
  },
  {
    icon: GitBranch,
    title: 'pricing.benefit.workflow.title',
    desc: 'pricing.benefit.workflow.desc',
  },
  {
    icon: Plug,
    title: 'pricing.benefit.api.title',
    desc: 'pricing.benefit.api.desc',
  },
  {
    icon: Shield,
    title: 'pricing.benefit.payos.title',
    desc: 'pricing.benefit.payos.desc',
  },
  {
    icon: Headphones,
    title: 'pricing.benefit.support.title',
    desc: 'pricing.benefit.support.desc',
  },
];

export function getEnterpriseFeatures(t: TranslateFn): EnterpriseFeature[] {
  return FEATURE_DEFS.map(({ icon, title, desc }) => ({
    icon,
    title: t(title),
    desc: t(desc),
  }));
}
