import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { profileService, getProfileEmail, type Profile, type ProfileInput } from '../services/profileService';
import { getVoiceParts, type VoicePartDef } from '../services/settingsService';
import { matchesVoiceParts } from '../lib/voicePartUtils';
import { getHttpStatus, type Retry429Options } from '../lib/networkSafety';

const EMPTY_PROFILES: Profile[] = [];

interface UseProfilesOptions {
  onRateLimitRetry?: Retry429Options['onRetry'];
}

export const useProfiles = (options: UseProfilesOptions = {}) => {
  const queryClient = useQueryClient();
  const onRateLimitRetryRef = useRef(options.onRateLimitRetry);

  useEffect(() => {
    onRateLimitRetryRef.current = options.onRateLimitRetry;
  }, [options.onRateLimitRetry]);

  const profilesQuery = useQuery({
    queryKey: queryKeys.profiles.list(),
    queryFn: () =>
      profileService.getProfiles({
        onRetry: (attempt, delayMs, error) => {
          onRateLimitRetryRef.current?.(attempt, delayMs, error);
        },
      }),
  });

  const [voiceParts, setVoiceParts] = useState<VoicePartDef[]>([]);
  const [filters, setFilters] = useState({ voiceParts: [] as string[], status: '', name: '' });

  useEffect(() => {
    getVoiceParts().then(setVoiceParts).catch(() => undefined);
  }, []);

  const profiles = profilesQuery.data ?? EMPTY_PROFILES;

  const unfilteredByVoicePartProfiles = useMemo(() => {
    const query = filters.name.trim().toLowerCase();
    return profiles.filter((p) => {
      const matchesStatus = !filters.status || p.globalStatus === filters.status;
      const matchesNameOrEmail =
        !query ||
        p.name.toLowerCase().includes(query) ||
        getProfileEmail(p).toLowerCase().includes(query);
      return matchesStatus && matchesNameOrEmail;
    });
  }, [profiles, filters.status, filters.name]);

  const filteredProfiles = useMemo(() => {
    const query = filters.name.trim().toLowerCase();
    return profiles.filter((p) => {
      const matchesVoice = matchesVoiceParts(p.voicePart, filters.voiceParts, voiceParts);
      const matchesStatus = !filters.status || p.globalStatus === filters.status;
      const matchesNameOrEmail =
        !query ||
        p.name.toLowerCase().includes(query) ||
        getProfileEmail(p).toLowerCase().includes(query);
      return matchesVoice && matchesStatus && matchesNameOrEmail;
    });
  }, [profiles, filters, voiceParts]);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all });
  };

  const addProfileMutation = useMutation({
    mutationFn: (data: ProfileInput) => profileService.createProfile(data),
    onSuccess: invalidate,
  });

  const editProfileMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProfileInput }) =>
      profileService.updateProfile(id, data),
    onSuccess: invalidate,
  });

  const removeProfileMutation = useMutation({
    mutationFn: (id: string) => profileService.deleteProfile(id),
    onSuccess: invalidate,
  });

  const addProfile = useCallback(async (data: ProfileInput) => {
    try {
      await addProfileMutation.mutateAsync(data);
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : 'Failed to add profile');
    }
  }, [addProfileMutation]);

  const editProfile = useCallback(async (id: string, data: ProfileInput) => {
    try {
      await editProfileMutation.mutateAsync({ id, data });
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update profile');
    }
  }, [editProfileMutation]);

  const removeProfile = useCallback(async (id: string) => {
    try {
      await removeProfileMutation.mutateAsync(id);
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete profile');
    }
  }, [removeProfileMutation]);

  const setFilter = useCallback(<K extends keyof typeof filters>(key: K, value: typeof filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const error = profilesQuery.error
    ? getHttpStatus(profilesQuery.error) === 429
      ? 'Roster loading is temporarily rate-limited. Please wait a moment and try again.'
      : (profilesQuery.error instanceof Error ? profilesQuery.error.message : 'Failed to fetch profiles')
    : null;

  return {
    allProfiles: profiles,
    profiles: filteredProfiles,
    unfilteredByVoicePartProfiles,
    isLoading: profilesQuery.isLoading,
    error,
    filters,
    setFilter,
    addProfile,
    editProfile,
    removeProfile,
    refresh: async () => { await profilesQuery.refetch(); },
  };
};
