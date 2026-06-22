import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryKeys';
import {
  auditionService,
  type Audition,
  type AuditionInput,
} from '../../../services/auditionService';
import { settingsService, type AuditionSettings } from '../../../services/settingsService';
import { profileService } from '../../../services/profileService';

export function useAuditionsManager() {
  const queryClient = useQueryClient();

  const auditionsQuery = useQuery({
    queryKey: queryKeys.auditions.list,
    queryFn: auditionService.getAuditions,
    staleTime: 30_000,
  });

  const settingsQuery = useQuery({
    queryKey: queryKeys.auditions.settings,
    queryFn: settingsService.getAuditionSettings,
    staleTime: 30_000,
  });

  const adminsQuery = useQuery({
    queryKey: queryKeys.users.admins,
    queryFn: () => profileService.getAdminUsers(),
    staleTime: 60_000,
  });

  const auditionUpdateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Audition> }) =>
      auditionService.updateAudition(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.auditions.all }),
  });

  const auditionCreateMutation = useMutation({
    mutationFn: (data: AuditionInput) => auditionService.createAudition(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.auditions.all }),
  });

  const auditionDeleteMutation = useMutation({
    mutationFn: (id: string) => auditionService.deleteAudition(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.auditions.all }),
  });

  const auditionConvertMutation = useMutation({
    mutationFn: (id: string) => auditionService.convertAuditionToSinger(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auditions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all });
    },
  });

  const saveAuditionSettingsMutation = useMutation({
    mutationFn: (settings: AuditionSettings) => settingsService.saveAuditionSettings(settings),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.auditions.settings }),
  });

  const auditions = auditionsQuery.data ?? [];
  const settings = settingsQuery.data ?? null;
  const admins = adminsQuery.data ?? [];
  const isLoading = auditionsQuery.isLoading || settingsQuery.isLoading || adminsQuery.isLoading;
  const error = auditionsQuery.error || settingsQuery.error || adminsQuery.error;

  return {
    auditions,
    settings,
    admins,
    isLoading,
    error,
    auditionsQuery,
    settingsQuery,
    adminsQuery,
    auditionUpdateMutation,
    auditionCreateMutation,
    auditionDeleteMutation,
    auditionConvertMutation,
    saveAuditionSettingsMutation,
  };
}
