import { Link } from 'react-router-dom';
import { SITE_DISPLAY_NAME } from '../services/siteConfig';

interface Props {
  /** Thêm class (vd. footer). */
  className?: string;
  /** Đích link; `null` = chỉ ảnh, không bọc Link. */
  to?: string | null;
  /** `full` = lockup ngang; `mark` = icon tròn (auth / header nhỏ). */
  variant?: 'full' | 'mark';
}

/** Logo thống nhất — size qua `--logo-height` / `--logo-height-sm` trong app.css. */
export default function BrandLogo({ className = '', to = '/', variant = 'full' }: Props) {
  const img =
    variant === 'mark' ? (
      <span className={['brand-mark', className].filter(Boolean).join(' ')}>
        <img src="/logo-mark.png" alt="" className="brand-mark-img" draggable={false} />
      </span>
    ) : (
      <img
        src="/logo.png"
        alt={SITE_DISPLAY_NAME}
        className={['brand-logo', className].filter(Boolean).join(' ')}
        draggable={false}
      />
    );

  if (to === null) return img;

  return (
    <Link to={to} className={variant === 'mark' ? 'brand brand-mark-link' : 'brand'}>
      {img}
    </Link>
  );
}
