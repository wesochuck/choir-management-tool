import { useCallback } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type { useDialog } from '../../../contexts/DialogContext';
import type {
  Event,
  BulkRehearsalConfig,
} from '../../../services/eventService';
import type { Venue } from '../../../services/venueService';
import {
  settingsService,
  type AuditionSettings,
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
  auditionSettings: AuditionSettings | null;
  setAuditionSettings: (settings: AuditionSettings) => void;
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
  setAuditionSettings,
  navigate,
  dialog,
}: UseEventSaveWorkflowArgs) {
  const handleSave = useCallback(
    async (
      data: Partial<Event> | FormData,
      bulkConfig?: BulkRehearsalConfig,
      openAuditions?: boolean,
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

        if (openAuditions && savedEvent.type === 'Performance') {
          const currentSettings = await settingsService.getAuditionSettings();
          const updatedSettings = {
            ...currentSettings,
            enabled: true,
            defaultPerformanceId: savedEvent.id,
          };

          await settingsService.saveAuditionSettings(updatedSettings);
          setAuditionSettings(updatedSettings);

          dialog.showToast(
            `Public auditions are now active for "${savedEvent.title || 'this performance'}".`,
          );
        } else if (!openAuditions && savedEvent.type === 'Performance') {
          const currentSettings = await settingsService.getAuditionSettings();

          if (
            currentSettings.defaultPerformanceId === savedEvent.id &&
            currentSettings.enabled
          ) {
            const updatedSettings = {
              ...currentSettings,
              enabled: false,
            };

            await settingsService.saveAuditionSettings(updatedSettings);
            setAuditionSettings(updatedSettings);
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
      setAuditionSettings,
      navigate,
      dialog,
    ],
  );

  return { handleSave };
}
