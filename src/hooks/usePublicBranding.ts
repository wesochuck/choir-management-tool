import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { settingsService } from '../services/settingsService';

export const usePublicBranding = () =>
  useQuery({
    queryKey: queryKeys.publicLanding.settings,
    queryFn: () => settingsService.getLandingSettings(),
    select: (settings) => !!settings.showBrandingHeaderFooter,
    staleTime: 5 * 60_000,
  });
