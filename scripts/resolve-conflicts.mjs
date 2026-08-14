import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');

const FILES = [
  'src/components/HomeQuickCreateBar.tsx',
  'src/components/WorkflowLibrary.tsx',
  'src/i18n/locales/en.ts',
  'src/i18n/locales/vi.ts',
  'src/i18n/types.ts',
  'src/pages/ProfilePage.tsx',
  'src/pages/ProjectsPage.tsx',
  'src/pages/SettingsPage.tsx',
  'src/pages/StudioHistoryPage.tsx',
  'src/pages/StudioPage.tsx',
  'src/pages/UsageHistoryPage.tsx',
  'src/pages/WalletPage.tsx',
  'src/pages/account/AccountLayout.tsx',
  'src/pages/account/AccountPromoPage.tsx',
  'src/pages/account/AccountSettingsPage.tsx',
  'src/pages/account/AccountSubscriptionPage.tsx',
  'src/pages/account/AccountTransactionsPage.tsx',
  'src/pages/account/AccountTransferPage.tsx',
];

function resolveBlock(text, prefer) {
  const re = /<<<<<<< Updated upstream\r?\n([\s\S]*?)=======\r?\n([\s\S]*?)>>>>>>> Stashed changes\r?\n?/g;
  let prev;
  do {
    prev = text;
    text = text.replace(re, (_, upstreamRaw, stashedRaw) => {
      const upstream = resolveBlock(upstreamRaw, prefer);
      const stashed = resolveBlock(stashedRaw, prefer);

      const u = upstream.trim();
      const s = stashed.trim();

      if (!u) return stashed;
      if (!s) return upstream;
      if (u === s) return upstream;
      if (prefer === 'merge-both') {
        const sep = upstream.endsWith('\n') || !stashed ? '' : '\n';
        return `${upstream}${sep}${stashed}`;
      }
      return prefer === 'upstream' ? upstream : stashed;
    });
  } while (text !== prev && text.includes('<<<<<<<'));
  return text;
}

for (const rel of FILES) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) {
    console.warn('skip missing', rel);
    continue;
  }
  const raw = fs.readFileSync(file, 'utf8');
  if (!raw.includes('<<<<<<<')) {
    console.log('clean', rel);
    continue;
  }

  let prefer = 'upstream';
  if (rel.includes('i18n/locales/en.ts') || rel.includes('i18n/locales/vi.ts')) {
    prefer = 'merge-both';
  } else if (rel.includes('i18n/types.ts')) {
    prefer = 'stashed';
  }

  const resolved = resolveBlock(raw, prefer);
  if (resolved.includes('<<<<<<<')) {
    console.error('still conflicted', rel);
    process.exitCode = 1;
    continue;
  }
  fs.writeFileSync(file, resolved);
  console.log('resolved', rel, `(${prefer})`);
}
