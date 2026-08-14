import type { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  tint: string;
  size?: 'tile' | 'sm';
  className?: string;
}

/** Magnific-style flat glyph on subtle tinted tile */
export default function HomeCategoryIcon({
  icon: Icon,
  tint,
  size = 'tile',
  className = '',
}: Props) {
  const tile = size === 'tile';
  return (
    <span
      className={`home-category-icon home-category-icon--${size}${className ? ` ${className}` : ''}`}
      style={{ background: tint }}
    >
      <Icon size={tile ? 22 : 15} strokeWidth={1.75} aria-hidden />
    </span>
  );
}
