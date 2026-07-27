import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bindHomeNotifPricingLinks, fetchHomeNotif } from '../../services/siteConfig';
import LandingHomeNotifFallback from './LandingHomeNotifFallback';

interface LandingAccessNoticeModalProps {
  open: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function LandingAccessNoticeModal({
  open,
  onConfirm,
  onClose,
}: LandingAccessNoticeModalProps) {
  const navigate = useNavigate();
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchHomeNotif().then((content) => {
      if (cancelled) return;
      setHtml(content);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open || !html || !notifRef.current) return;
    const root = notifRef.current;
    const unbindPricing = bindHomeNotifPricingLinks(root, () => {
      onClose();
      navigate('/pricing');
    });
    const closes = root.querySelectorAll<HTMLElement>('.vm-close, #vm-close');
    const onCloseClick = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    closes.forEach((el) => el.addEventListener('click', onCloseClick));
    return () => {
      unbindPricing();
      closes.forEach((el) => el.removeEventListener('click', onCloseClick));
    };
  }, [open, html, onClose, navigate]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="landing-access-backdrop" onClick={onClose}>
      <div
        className="landing-access-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="landing-access-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="landing-access-dialog-head">
          <h2 id="landing-access-title">Thông báo</h2>
        </header>

        <div className="landing-access-dialog-body">
          {loading && <p className="landing-access-loading">Đang tải…</p>}
          {!loading && html && (
            <div
              ref={notifRef}
              className="landing-access-notif"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
          {!loading && !html && <LandingHomeNotifFallback onClose={onClose} />}
        </div>

        <footer className="landing-access-dialog-foot">
          <button type="button" className="landing-access-confirm" onClick={onConfirm}>
            Đã hiểu
          </button>
        </footer>
      </div>
    </div>
  );
}
