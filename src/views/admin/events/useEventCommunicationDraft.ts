import { useCallback } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type { Event } from '../../../services/eventService';
import type { Venue } from '../../../services/venueService';
import type { CommunicationSettings } from '../../../services/settingsService';
import { navigateToCommunicationDraft } from './eventCommunication';

interface UseEventCommunicationDraftArgs {
  navigate: NavigateFunction;
  venues: Venue[];
  timezone: string;
  communicationSettings: CommunicationSettings;
}

export function useEventCommunicationDraft({
  navigate,
  venues,
  timezone,
  communicationSettings,
}: UseEventCommunicationDraftArgs) {
  const handleSendMessage = useCallback((event: Event) => {
    navigateToCommunicationDraft({
      navigate,
      event,
      venues,
      timezone,
      communicationSettings,
    });
  }, [navigate, venues, timezone, communicationSettings]);

  return { handleSendMessage };
}
