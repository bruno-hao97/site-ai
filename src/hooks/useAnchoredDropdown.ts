import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react';

export interface AnchorPos {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  placement: 'down' | 'up';
}

export interface AnchoredPanelOptions {
  /** Min width when clamping panel inside viewport (default 320). */
  minWidth?: number;
}

/** Fixed panel style for portal dropdowns — flip up/down and cap height to viewport. */
export function anchoredPanelStyle(
  pos: AnchorPos | null,
  options?: AnchoredPanelOptions,
): CSSProperties | undefined {
  if (!pos) return undefined;
  const minWidth = options?.minWidth ?? 320;
  const effectiveWidth = Math.max(pos.width, minWidth);
  const left = Math.max(8, Math.min(pos.left, window.innerWidth - effectiveWidth - 8));
  return {
    position: 'fixed',
    left,
    width: Math.max(pos.width, minWidth),
    top: pos.top,
    bottom: 'auto',
    maxHeight: pos.maxHeight,
    ...(pos.placement === 'up' ? { transform: 'translateY(-100%)' } : {}),
  };
}

/** Anchor trigger → fixed portal panel; reposition on scroll/resize; close on outside click / Escape. */
export function useAnchoredDropdown(open: boolean, setOpen: (v: boolean) => void) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<AnchorPos | null>(null);

  const updatePos = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 4;
    const spaceBelow = window.innerHeight - r.bottom - 8;
    const spaceAbove = r.top - 8;
    const placeUp = spaceBelow < 240 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(160, Math.min(560, (placeUp ? spaceAbove : spaceBelow) - gap));
    setPos({
      left: r.left,
      width: r.width,
      top: placeUp ? r.top - gap : r.bottom + gap,
      maxHeight,
      placement: placeUp ? 'up' : 'down',
    });
  }, []);

  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    updatePos();
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [open, setOpen, updatePos]);

  return { triggerRef, panelRef, pos };
}
