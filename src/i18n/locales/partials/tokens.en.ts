export const tokensEn = {
  'tokens.backLink': '← Settings',
  'tokens.title': 'Manage Access Tokens',
  'tokens.lead': 'List from auth/token.getAll · domain',
  'tokens.count': '{{count}} token',
  'tokens.refresh': 'Refresh',
  'tokens.loading': 'Loading…',
  'tokens.notLoggedIn': 'Not signed in',
  'tokens.empty': 'No tokens found.',
  'tokens.copiedNotice': 'Access token copied',
  'tokens.copyFailed': 'Could not copy — try selecting manually',
  'tokens.switchedNotice': 'Switched to this token for the current session.',
  'tokens.unnamed': 'Unnamed token',
  'tokens.activeBadge': 'In use',
  'tokens.createdAt': 'Created',
  'tokens.expiresAt': 'Expires',
  'tokens.accessToken': 'Access token',
  'tokens.copyBtn': 'Copy token',
  'tokens.copiedBtn': 'Copied',
  'tokens.useBtn': 'Use this token',
  'tokens.usingBtn': 'Switching…',
} as const;

export type TokensKeys = keyof typeof tokensEn;
