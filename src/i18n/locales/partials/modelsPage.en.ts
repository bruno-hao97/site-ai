export const modelsPageEn = {
  'modelsPage.pageTitle': 'AI Model Catalog',
  'modelsPage.siteTitleFallback': 'AI Center',
  'modelsPage.kicker': 'COMPREHENSIVE CREATION',
  'modelsPage.title': 'AI Model Catalog',
  'modelsPage.lead':
    'Explore models for video, image, audio, and more — pick the right tool for your project.',
  'modelsPage.modelCount': '{{count}} models',
  'modelsPage.searchPlaceholder': 'Search models (Ctrl + K)…',
  'modelsPage.filterAria': 'Filter model type',
  'modelsPage.filter.all': 'All',
  'modelsPage.filter.video': 'Video',
  'modelsPage.filter.image': 'Image',
  'modelsPage.filter.tts': 'Audio / TTS',
  'modelsPage.filter.music': 'Music',
  'modelsPage.filter.avatarLipsync': 'Avatar LipSync',
  'modelsPage.loading': 'Loading model catalog…',
  'modelsPage.empty': 'No matching models found.',
  'modelsPage.pricingLink':
    'Model pricing is in credits — see top-up packages and conversion table below or',
  'modelsPage.pricingLinkStrong': 'open the pricing page',
  'modelsPage.benefitsAria': 'Benefits',
  'modelsPage.helpAria': 'Support',
  'modelsPage.helpTitle': 'Need model recommendations?',
  'modelsPage.helpDesc':
    'Not sure which model fits your project or need a credit cost estimate? Contact us on Zalo — our team will advise quickly.',
  'modelsPage.helpCta': 'Contact support',
} as const;

export type ModelsPageKeys = keyof typeof modelsPageEn;

export const MODEL_FILTER_I18N_KEYS: Record<string, keyof typeof modelsPageEn> = {
  all: 'modelsPage.filter.all',
  video: 'modelsPage.filter.video',
  image: 'modelsPage.filter.image',
  tts: 'modelsPage.filter.tts',
  music: 'modelsPage.filter.music',
  'avatar-lipsync': 'modelsPage.filter.avatarLipsync',
};
