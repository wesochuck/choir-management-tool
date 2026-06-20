import { useState } from 'react';
import { rosterService } from '../../../services/rosterService';
import type { useDialog } from '../../../contexts/DialogContext';
import { getRsvpStatusLabel, type RsvpStatus } from '../../../lib/eventRoster/rsvpLabels';

interface UseRsvpBulkActionsArgs<TSinger extends { rsvp: RsvpStatus; profile: { id: string } }> {
  eventId?: string;
  sortedSingers: TSinger[];
  refreshRosters: () => Promise<void>;
  dialog: ReturnType<typeof useDialog>;
}

export function useRsvpBulkActions<TSinger extends { rsvp: RsvpStatus; profile: { id: string } }>({
  eventId,
  sortedSingers,
  refreshRosters,
  dialog,
}: UseRsvpBulkActionsArgs<TSinger>) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);

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

  const handleBulkUpdateRSVP = async (nextRsvp: RsvpStatus) => {
    if (!eventId || sortedSingers.length === 0) return;

    const eligibleSingers = sortedSingers.filter((singer) => singer.rsvp !== nextRsvp);

    if (eligibleSingers.length === 0) {
      dialog.showToast('Everyone shown already has that RSVP status.');
      return;
    }

    const statusLabel = getRsvpStatusLabel(nextRsvp);

    const confirmed = await dialog.confirm({
      title: `Bulk Mark ${statusLabel}`,
      message: `Update ${eligibleSingers.length} displayed singer${
        eligibleSingers.length === 1 ? '' : 's'
      } to ${statusLabel}? This only affects the singers currently shown after your filters and search.`,
      confirmLabel: `Mark ${statusLabel}`,
      cancelLabel: 'Cancel',
      variant: nextRsvp === 'No' ? 'warning' : 'info',
    });

    if (!confirmed) return;

    setIsUpdating(true);
    try {
      await rosterService.bulkUpdateRSVP(
        eventId,
        eligibleSingers.map((singer) => ({
          profileId: singer.profile.id,
          rsvp: nextRsvp,
        })),
        (current, total) => {
          setBulkProgress({ current, total });
        }
      );

      await refreshRosters();

      dialog.showToast(
        `Updated ${eligibleSingers.length} RSVP${eligibleSingers.length === 1 ? '' : 's'}.`
      );
    } catch (err: unknown) {
      await dialog.showMessage({
        title: 'Could Not Bulk Update RSVPs',
        message: err instanceof Error ? err.message : 'Failed to update RSVP statuses',
        variant: 'danger',
      });
    } finally {
      setIsUpdating(false);
      setBulkProgress(null);
    }
  };

  return {
    isUpdating,
    bulkProgress,
    handleUpdateRSVP,
    handleBulkUpdateRSVP,
  };
}
