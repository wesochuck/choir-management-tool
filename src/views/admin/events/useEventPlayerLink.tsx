import { useCallback } from 'react';
import type { useDialog } from '../../../contexts/DialogContext';
import type { Event } from '../../../services/eventService';
import { playerService } from '../../../services/playerService';

import { Button } from '../../../components/ui';
import SlCopyButton from '@shoelace-style/shoelace/dist/react/copy-button/index.js';

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
          <div className="flex flex-col gap-4">
            <p>
              A standalone practice link has been generated for "{event.title || event.type}".
            </p>
            <div className="rounded-lg border border-border bg-bg p-2 text-sm break-all">
              {url}
            </div>
            <div className="flex flex-row gap-2">
              <SlCopyButton value={url}>
                Copy Link
              </SlCopyButton>
              <Button
                variant="secondary"
                size="small"
                onClick={() => window.open(url, '_blank')}
              >
                Open Player
              </Button>
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
