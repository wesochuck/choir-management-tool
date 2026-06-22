import { Button } from '../../../components/ui';
import type { AuditionSettings } from '../../../services/settingsService';

interface AuditionStatusBannerProps {
  settings: AuditionSettings | null;
  performances: Array<{ id: string; title: string; date: string }>;
  onConfigureClick: () => void;
}

export function AuditionStatusBanner({
  settings,
  performances,
  onConfigureClick,
}: AuditionStatusBannerProps) {
  if (!settings) return null;

  const isOpen = settings.enabled && !!settings.defaultPerformanceId;
  const targetPerformance = performances.find((p) => p.id === settings.defaultPerformanceId);

  return (
    <div
      className={`flex items-center justify-between rounded-xl border p-5 shadow-sm transition-all duration-200 ${
        isOpen ? 'border-primary/30 bg-primary/5' : 'bg-surface-muted border-border'
      }`}
    >
      <div className="flex flex-row items-center gap-4">
        <div className="bg-surface flex size-8 items-center justify-center rounded-full text-base shadow-sm select-none">
          {isOpen ? '🟢' : '⚪'}
        </div>
        <div className="flex flex-col">
          <div
            className={`text-sm font-bold tracking-wide ${
              isOpen ? 'text-primary-deep' : 'text-text-muted'
            }`}
          >
            PUBLIC AUDITIONS: {isOpen ? 'OPEN' : 'CLOSED'}
          </div>
          <div className="text-text-muted mt-0.5 text-xs">
            {isOpen ? (
              <>
                Accepting requests for: {targetPerformance?.title || 'Selected Performance'}
                <br />
                <span className="mt-1 inline-flex items-center gap-1 text-sm">
                  <span>🔗</span>
                  <a
                    href="/auditions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary-deep font-semibold underline transition-colors"
                  >
                    Link to Public Form
                  </a>
                </span>
              </>
            ) : !settings.enabled ? (
              'The public form is currently disabled.'
            ) : (
              'A target performance must be selected to open the form.'
            )}
          </div>
        </div>
      </div>
      <Button variant={isOpen ? 'secondary' : 'primary'} onClick={onConfigureClick}>
        Configure
      </Button>
    </div>
  );
}
