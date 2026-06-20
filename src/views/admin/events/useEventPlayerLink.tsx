import { useCallback, useState } from 'react';
import { playerService } from '../../../services/playerService';
import type { Event } from '../../../services/eventService';
import { useDialog } from '../../../contexts/DialogContext';

export function useEventPlayerLink(dialog: ReturnType<typeof useDialog>) {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [eventTitle, setEventTitle] = useState('');

  const handleOpenPlayer = useCallback(
    async (event: Event) => {
      try {
        const token = await playerService.generateToken(event.id);
        const link = `${window.location.origin}/player?token=${encodeURIComponent(token)}`;
        setEventTitle(event.title || event.type);
        setUrl(link);
        setIsOpen(true);
      } catch (err) {
        console.error(err);
        const message = err instanceof Error ? err.message : String(err);
        await dialog.showMessage({
          title: 'Error',
          message: `Could not generate player link: ${message}`,
          variant: 'danger',
        });
      }
    },
    [dialog]
  );

  return { handleOpenPlayer, isOpen, url, eventTitle, setIsOpen };
}
