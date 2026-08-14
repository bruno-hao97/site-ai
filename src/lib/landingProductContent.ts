import type { LucideIcon } from 'lucide-react';

export interface ProductFeature {
  title: string;
  desc: string;
}

export interface ProductTab {
  id: string;
  label: string;
  kicker: string;
  headline: string;
  lead: string;
  icon: LucideIcon;
  features: ProductFeature[];
  mockLabel: string;
  badge?: string;
}

export interface CategoryItem {
  id: string;
  label: string;
  icon: LucideIcon;
  types: readonly string[];
}

/** @deprecated Use getProductTabs() from landingI18n.ts — content is locale-aware. */
export const PRODUCT_TABS: ProductTab[] = [];

/** @deprecated Use getCategoryItems() from landingI18n.ts — labels are locale-aware. */
export const CATEGORY_ITEMS: CategoryItem[] = [];
