import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocale } from '../../i18n';

export type WfNodeModelOption = {
  value: string;
  label: string;
  title?: string;
};

export function WfNodeModelPicker({
  value,
  options,
  onChange,
  loading,
  variant = 'default',
  emptyLabel,
  loadingLabel,
}: {
  value: string;
  options: WfNodeModelOption[];
  onChange: (value: string) => void;
  loading?: boolean;
  variant?: 'default' | 'gen';
  emptyLabel?: string;
  loadingLabel?: string;
}) {
  const { t } = useLocale();
  const resolvedEmptyLabel = emptyLabel ?? t('common.selectModel');
  const resolvedLoadingLabel = loadingLabel ?? t('common.loadingModels');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as HTMLElement)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const current = options.find((option) => option.value === value);
  const display = loading
    ? resolvedLoadingLabel
    : !options.length
      ? resolvedEmptyLabel
      : current?.label || value || resolvedEmptyLabel;

  const isGen = variant === 'gen';

  return (
    <div
      className={`wf-node-model-picker${isGen ? ' wf-node-model-picker--gen' : ''} nodrag`}
      ref={rootRef}
    >
      <button
        type="button"
        className={isGen ? 'wf-gen-model-select' : 'wf-node-model-trigger'}
        disabled={loading || options.length === 0}
        onClick={() => setOpen((prev) => !prev)}
        title={current?.title || current?.label || display}
      >
        <span className="wf-node-model-label">{display}</span>
        <ChevronDown size={isGen ? 12 : 14} className={open ? 'is-open' : ''} />
      </button>
      {open && options.length > 0 && (
        <div className="wf-node-model-menu">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={option.value === value ? 'active' : ''}
              title={option.title || option.label}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
