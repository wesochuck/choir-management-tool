import { useCallback } from 'react';
import type { useDialog } from '../../../contexts/DialogContext';
import type { Event } from '../../../services/eventService';
import { playerService } from '../../../services/playerService';

interface UseEventPlayerLinkArgs {
  dialog: ReturnType<typeof useDialog>;
}

export function useEventPlayerLink({ dialog }: UseEventPlayerLinkArgs) {
  const handleOpenPlayer = useCallback(async (event: Event) => {
    try {
      const token = await playerService.generateToken(event.id);
      const url = `${window.location.origin}/player?token=${encodeURIComponent(token)}`;

      await dialog.showMessage({
        title: 'Player Link Generated',
        message: (
          <div className="flex-col gap-4">
            <p>
              A standalone practice link has been generated for "{event.title || event.type}".
            </p>
            <div className="card p-2 bg-bg border border-border break-all text-sm">
              {url}
            </div>
            <div className="flex-row gap-2">
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  navigator.clipboard.writeText(url);
                }}
              >
                Copy Link
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => window.open(url, '_blank')}
              >
                Open Player
              </button>
            </div>
          </div>
        ),
      });
    } catch (error) {
      console.error(error);
      await dialog.showMessage({
        title: 'Error',
        message: 'Could not generate player link.',
        variant: 'danger',
      });
    }
  }, [dialog]);

  return { handleOpenPlayer };
}
