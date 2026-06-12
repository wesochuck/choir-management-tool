import { useCallback } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type { useDialog } from '../../../contexts/DialogContext';
import type {
  Event,
  BulkRehearsalConfig,
} from '../../../services/eventService';
import type { Venue } from '../../../services/venueService';
import {
  type CommunicationSettings,
} from '../../../services/settingsService';
import { rosterService } from '../../../services/rosterService';
import { navigateToCommunicationDraft } from './eventCommunication';

interface UseEventSaveWorkflowArgs {
  editingEvent: Event | null;
  cloningEventId: string | null;
  setCloningEventId: (id: string | null) => void;
  setIsModalOpen: (open: boolean) => void;
  addEvent: (
    data: Partial<Event> | FormData,
    bulkConfig?: BulkRehearsalConfig,
  ) => Promise<Event | undefined>;
  editEvent: (
    id: string,
    data: Partial<Event> | FormData,
  ) => Promise<Event | undefined>;
  venues: Venue[];
  timezone: string;
  communicationSettings: CommunicationSettings;
  navigate: NavigateFunction;
  dialog: ReturnType<typeof useDialog>;
}

export function useEventSaveWorkflow({
  editingEvent,
  cloningEventId,
  setCloningEventId,
  setIsModalOpen,
  addEvent,
  editEvent,
  venues,
  timezone,
  communicationSettings,
  navigate,
  dialog,
}: UseEventSaveWorkflowArgs) {
  const handleSave = useCallback(
    async (
      data: Partial<Event> | FormData,
      bulkConfig?: BulkRehearsalConfig,
    ) => {
      let resultEvent: Event | undefined;

      try {
        if (editingEvent && editingEvent.id) {
          resultEvent = await editEvent(editingEvent.id, data);
        } else {
          resultEvent = await addEvent(data, bulkConfig);
        }

        setIsModalOpen(false);

        if (!resultEvent) return;
        const savedEvent = resultEvent;

        if (cloningEventId) {
          try {
            const originalRoster = await rosterService.getEventRoster(cloningEventId);
            const updates = originalRoster.map((rosterItem) => ({
              profileId: rosterItem.profile,
              rsvp: rosterItem.rsvp,
            }));

            if (updates.length > 0) {
              await rosterService.bulkUpdateRSVP(savedEvent.id, updates);
            }
          } catch (err) {
            console.error('Failed to clone roster RSVPs:', err);
          } finally {
            setCloningEventId(null);
          }
        }

        const isNewRsvpOpen =
          savedEvent.isOpenForRSVP &&
          (!editingEvent || !editingEvent.isOpenForRSVP);

        if (isNewRsvpOpen) {
          const confirmed = await dialog.confirm({
            title: 'RSVP Opened',
            message: `RSVP is now open for "${savedEvent.title || savedEvent.type}"! Would you like to draft and compose the RSVP invitation email to active choir members now?`,
            confirmLabel: 'Draft Invitation',
            cancelLabel: 'Later',
            variant: 'info',
          });

          if (confirmed) {
            navigateToCommunicationDraft({
              navigate,
              event: savedEvent,
              venues,
              timezone,
              communicationSettings,
            });
          }
        }
      } catch (err: unknown) {
        console.error('Save failed', err);
        throw err;
      }
    },
    [
      editingEvent,
      cloningEventId,
      setCloningEventId,
      setIsModalOpen,
      addEvent,
      editEvent,
      venues,
      timezone,
      communicationSettings,
      navigate,
      dialog,
    ],
  );

  return { handleSave };
}
