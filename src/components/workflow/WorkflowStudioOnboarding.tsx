import { FolderOpen, PanelLeftOpen } from 'lucide-react';
import { useLocale } from '../../i18n';
import StudioOnboardingCarousel from '../onboarding/StudioOnboardingCarousel';
import { WORKFLOW_ONBOARDING_CONFIG } from '../../lib/workflowOnboarding';

const DISMISS_KEY = 'wf-canvas-hint-dismiss';

interface Props {
  onOpenPalette: () => void;
  onOpenLibrary: () => void;
  onDismiss: () => void;
}

export default function WorkflowStudioOnboarding({ onOpenPalette, onOpenLibrary, onDismiss }: Props) {
  const { t } = useLocale();

  return (
    <div className="wf-onboarding-overlay" role="region" aria-label={t('workflow.onboarding.title')}>
      <div className="wf-onboarding-panel">
        <StudioOnboardingCarousel
          config={WORKFLOW_ONBOARDING_CONFIG}
          className="composer-onboarding-carousel--compact"
          footer={
            <div className="wf-onboarding-actions">
              <button type="button" className="wf-canvas-hint-primary" onClick={onOpenPalette}>
                <PanelLeftOpen size={14} />
                {t('workflow.empty.openPalette')}
              </button>
              <button type="button" className="wf-canvas-hint-secondary" onClick={onOpenLibrary}>
                <FolderOpen size={14} />
                {t('workflow.empty.openLibrary')}
              </button>
              <button
                type="button"
                className="wf-canvas-hint-ghost"
                onClick={() => {
                  try {
                    localStorage.setItem(DISMISS_KEY, '1');
                  } catch {
                    /* ignore */
                  }
                  onDismiss();
                }}
              >
                {t('workflow.empty.dismiss')}
              </button>
            </div>
          }
        />
      </div>
    </div>
  );
}

export function isWorkflowOnboardingDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}
