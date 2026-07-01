import { useState } from 'react';
import { rosterService } from '../../../services/rosterService';
import type { useDialog } from '../../../contexts/DialogContext';
import { getRsvpStatusLabel, type RsvpStatus } from '../../../lib/eventRoster/rsvpLabels';
import { useChoirSettings } from '../../../hooks/useDocumentTitle';
import { pluralizeLabel } from '../../../lib/labelHelpers';

interface UseRsvpBulkActionsArgs {
  eventId?: string;
  refreshRosters: () => Promise<void>;
  dialog: ReturnType<typeof useDialog>;
}

export type BulkRsvpAction = 'Yes' | 'No' | 'Pending';

export function useRsvpBulkActions({ eventId, refreshRosters, dialog }: UseRsvpBulkActionsArgs) {
  const { performerLabel } = useChoirSettings();
  const performerLabelPlural = pluralizeLabel(performerLabel);
  const [isUpdating, setIsUpdating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [bulkActionInProgress, setBulkActionInProgress] = useState<BulkRsvpAction | null>(null);

  const handleUpdateRSVP = async (profileId: string, nextRsvp: RsvpStatus) => {
    if (!eventId) return;

    setIsUpdating(true);
    try {
      await rosterService.updateRSVP(eventId, profileId, nextRsvp);
      await refreshRosters();
    } catch (err: unknown) {
      await dialog.showMessage({
        title: 'Could Not Update RSVP',
        message: err instanceof Error ? err.message : 'Failed to update RSVP status',
        variant: 'danger',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Apply a bulk RSVP action to an explicit list of profile IDs.
   * Returns true on success (so the caller can clear selection), false otherwise.
   */
  const handleBulkUpdateRSVP = async (
    nextRsvp: BulkRsvpAction,
    profileIds: string[]
  ): Promise<boolean> => {
    if (!eventId || profileIds.length === 0) return false;

    const statusLabel = getRsvpStatusLabel(nextRsvp);

    if (nextRsvp === 'Pending') {
      const confirmed = await dialog.confirm({
        title: 'Reset RSVPs?',
        message:
          profileIds.length === 1
            ? `Reset RSVP response for this ${performerLabel.toLowerCase()}?`
            : `Reset RSVP responses for ${profileIds.length} selected ${performerLabelPlural.toLowerCase()}? This will remove their current RSVP status for this event.`,
        confirmLabel: profileIds.length === 1 ? 'Reset RSVP' : 'Reset RSVPs',
        cancelLabel: 'Cancel',
        variant: 'warning',
      });
      if (!confirmed) return false;
    } else {
      const confirmed = await dialog.confirm({
        title: `Mark ${statusLabel}`,
        message: `Update ${profileIds.length} selected ${performerLabel.toLowerCase()}${
          profileIds.length === 1 ? '' : 's'
        } to ${statusLabel}?`,
        confirmLabel: `Mark ${statusLabel}`,
        cancelLabel: 'Cancel',
        variant: nextRsvp === 'No' ? 'warning' : 'info',
      });
      if (!confirmed) return false;
    }

    setIsUpdating(true);
    setBulkActionInProgress(nextRsvp);
    try {
      await rosterService.bulkUpdateRSVP(
        eventId,
        profileIds.map((profileId) => ({
          profileId,
          rsvp: nextRsvp,
        })),
        (current, total) => {
          setBulkProgress({ current, total });
        }
      );

      await refreshRosters();

      dialog.showToast(`Updated ${profileIds.length} RSVP${profileIds.length === 1 ? '' : 's'}.`);
      return true;
    } catch (err: unknown) {
      await dialog.showMessage({
        title: 'Could Not Update RSVPs',
        message:
          err instanceof Error
            ? err.message
            : 'Some RSVP updates could not be saved. Please try again.',
        variant: 'danger',
      });
      return false;
    } finally {
      setIsUpdating(false);
      setBulkProgress(null);
      setBulkActionInProgress(null);
    }
  };

  return {
    isUpdating,
    bulkProgress,
    bulkActionInProgress,
    handleUpdateRSVP,
    handleBulkUpdateRSVP,
  };
}
