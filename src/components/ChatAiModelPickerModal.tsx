import { useMemo, useState } from 'react';
import { Plus, Search, Sparkles, X } from 'lucide-react';
import { useLocale } from '../i18n';
import type { TranslationKey } from '../i18n/types';
import {
  CHAT_AI_MODELS,
  filterChatAiModels,
  groupChatAiModelsByProvider,
  listChatAiProviderNav,
  type ChatAiModel,
} from '../services/chatAiModels';

type TabId = 'suggested' | 'community' | 'mine';

const TABS: { id: TabId; labelKey: TranslationKey }[] = [
  { id: 'suggested', labelKey: 'chat.modelPicker.tab.suggested' },
  { id: 'community', labelKey: 'chat.modelPicker.tab.community' },
  { id: 'mine', labelKey: 'chat.modelPicker.tab.mine' },
];

const INCOME_STATS: { key: TranslationKey; value: string }[] = [
  { key: 'chat.modelPicker.stat.balance', value: '0' },
  { key: 'chat.modelPicker.stat.pendingWithdraw', value: '0' },
  { key: 'chat.modelPicker.stat.paidUsers', value: '0' },
  { key: 'chat.modelPicker.stat.platformFee', value: '0' },
];

interface Props {
  open: boolean;
  selectedId: string;
  onSelect: (modelId: string) => void;
  onClose: () => void;
}

function ModelMeta({ model }: { model: ChatAiModel }) {
  if (model.salePercent != null) {
    return (
      <span className="chat-ai-model-sale">
        <Sparkles size={11} />
        -{model.salePercent}%
      </span>
    );
  }
  if (model.tags?.length) {
    return (
      <span className="chat-ai-model-tags">
        {model.tags.map((t) => (
          <span key={t} className={`chat-ai-model-tag chat-ai-model-tag--${t.toLowerCase()}`}>
            {t}
          </span>
        ))}
      </span>
    );
  }
  return null;
}

export default function ChatAiModelPickerModal({ open, selectedId, onSelect, onClose }: Props) {
  const { t } = useLocale();
  const [tab, setTab] = useState<TabId>('suggested');
  const [providerId, setProviderId] = useState('all');
  const [query, setQuery] = useState('');

  const nav = useMemo(() => listChatAiProviderNav(), []);
  const filtered = useMemo(
    () => filterChatAiModels(CHAT_AI_MODELS, { providerId, query }),
    [providerId, query],
  );
  const grouped = useMemo(() => groupChatAiModelsByProvider(filtered), [filtered]);

  if (!open) return null;

  return (
    <div className="chat-ai-model-overlay" onClick={onClose}>
      <div
        className="chat-ai-model-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t('chat.modelPicker.ariaLabel')}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="chat-ai-model-head">
          <h3>{t('chat.modelPicker.title')}</h3>
          <button type="button" className="chat-ai-model-x" onClick={onClose} aria-label={t('chat.modelPicker.close')}>
            <X size={18} />
          </button>
        </header>

        <div className="chat-ai-model-tabs" role="tablist">
          {TABS.map(({ id, labelKey }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={tab === id ? 'active' : ''}
              onClick={() => setTab(id)}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>

        {tab === 'suggested' && (
          <div className="chat-ai-model-body">
            <div className="chat-ai-model-search">
              <Search size={15} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('chat.modelPicker.searchPlaceholder')}
                autoFocus
              />
            </div>
            <div className="chat-ai-model-layout">
              <aside className="chat-ai-model-nav">
                {nav.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={providerId === item.id ? 'active' : ''}
                    onClick={() => setProviderId(item.id)}
                  >
                    <span>{item.label}</span>
                    <span className="chat-ai-model-nav-count">{item.count}</span>
                  </button>
                ))}
              </aside>
              <div className="chat-ai-model-list">
                {grouped.length === 0 ? (
                  <div className="chat-ai-model-empty">{t('chat.modelPicker.empty')}</div>
                ) : (
                  grouped.map(([provider, models]) => (
                    <section key={provider} className="chat-ai-model-group">
                      <h4>{provider}</h4>
                      <div className="chat-ai-model-rows">
                        {models.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            className={`chat-ai-model-row${selectedId === m.id ? ' active' : ''}`}
                            disabled={!m.selectable}
                            onClick={() => {
                              if (!m.selectable) return;
                              onSelect(m.id);
                              onClose();
                            }}
                          >
                            <span className="chat-ai-model-row-name">{m.name}</span>
                            <ModelMeta model={m} />
                          </button>
                        ))}
                      </div>
                    </section>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'community' && (
          <div className="chat-ai-model-body chat-ai-model-body--plain">
            <div className="chat-ai-model-search">
              <Search size={15} />
              <input placeholder={t('chat.modelPicker.communitySearchPlaceholder')} disabled />
            </div>
            <p className="chat-ai-model-hint">{t('chat.modelPicker.communityHint')}</p>
            <div className="chat-ai-model-empty chat-ai-model-empty--fill">
              {t('chat.modelPicker.communityEmpty')}
            </div>
          </div>
        )}

        {tab === 'mine' && (
          <div className="chat-ai-model-body chat-ai-model-body--plain">
            <section className="chat-ai-model-income">
              <h4>{t('chat.modelPicker.incomeTitle')}</h4>
              <p className="chat-ai-model-hint">{t('chat.modelPicker.incomeHint')}</p>
              <div className="chat-ai-model-stats">
                {INCOME_STATS.map(({ key, value }) => (
                  <div key={key} className="chat-ai-model-stat">
                    <span>{t(key)}</span>
                    <strong className={key === 'chat.modelPicker.stat.platformFee' ? 'accent' : ''}>
                      {value}
                    </strong>
                  </div>
                ))}
              </div>
              <div className="chat-ai-model-withdraw">
                <input type="text" placeholder={t('chat.modelPicker.withdrawPlaceholder')} disabled />
                <button type="button" disabled>
                  {t('chat.modelPicker.withdraw')}
                </button>
              </div>
            </section>

            <div className="chat-ai-model-mine-actions">
              <p className="chat-ai-model-hint">{t('chat.modelPicker.mineHint')}</p>
              <div className="chat-ai-model-mine-btns">
                <button type="button" className="primary" disabled>
                  <Plus size={14} /> {t('chat.modelPicker.addSource')}
                </button>
                <button type="button" disabled>
                  <Plus size={14} /> {t('chat.modelPicker.addModel')}
                </button>
              </div>
            </div>

            <div className="chat-ai-model-empty chat-ai-model-empty--fill">
              <strong>{t('chat.modelPicker.mineEmptyTitle')}</strong>
              <span>{t('chat.modelPicker.mineEmptyDesc')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
