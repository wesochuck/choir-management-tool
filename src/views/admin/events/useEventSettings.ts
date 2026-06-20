import { useQuery } from '@tanstack/react-query';
import { DEFAULT_COMMUNICATION_SETTINGS, settingsService } from '../../../services/settingsService';
import { queryKeys } from '../../../lib/queryKeys';

export function useEventSettings() {
  const { data: communicationSettings = DEFAULT_COMMUNICATION_SETTINGS } = useQuery({
    queryKey: queryKeys.communications.settings(),
    queryFn: () => settingsService.getCommunicationSettings(),
  });

  const { data: auditionSettings = null } = useQuery({
    queryKey: queryKeys.auditions.settings,
    queryFn: () => settingsService.getAuditionSettings(),
  });

  return {
    communicationSettings,
    auditionSettings,
  };
}
