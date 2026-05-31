import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { profileService, type Profile, type ProfileInput } from '../services/profileService';
import { getVoiceParts, type VoicePartDef } from '../services/settingsService';
import { matchesVoiceParts } from '../lib/voicePartUtils';
import { getHttpStatus, type Retry429Options } from '../lib/networkSafety';

interface UseProfilesOptions {
  onRateLimitRetry?: Retry429Options['onRetry'];
}

export const useProfiles = (options: UseProfilesOptions = {}) => {
  const onRateLimitRetryRef = useRef(options.onRateLimitRetry);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [voiceParts, setVoiceParts] = useState<VoicePartDef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ voiceParts: [] as string[], status: '', name: '' });

  useEffect(() => {
    onRateLimitRetryRef.current = options.onRateLimitRetry;
  }, [options.onRateLimitRetry]);

  const fetchProfiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await profileService.getProfiles({
        onRetry: (attempt, delayMs, error) => {
          onRateLimitRetryRef.current?.(attempt, delayMs, error);
        },
      });
      setProfiles(data);
      setError(null);
    } catch (err: unknown) {
      if (getHttpStatus(err) === 429) {
        setError('Roster loading is temporarily rate-limited. Please wait a moment and try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch profiles');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
    getVoiceParts().then(setVoiceParts).catch(() => undefined);
  }, [fetchProfiles]);

  const unfilteredByVoicePartProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const matchesStatus = !filters.status || p.globalStatus === filters.status;
      const matchesNameOrEmail = !filters.name || 
        p.name.toLowerCase().includes(filters.name.toLowerCase()) ||
        (p.email || p.expand?.user?.email || '').toLowerCase().includes(filters.name.toLowerCase());
      return matchesStatus && matchesNameOrEmail;
    });
  }, [profiles, filters.status, filters.name]);

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const matchesVoice = matchesVoiceParts(p.voicePart, filters.voiceParts, voiceParts);
      const matchesStatus = !filters.status || p.globalStatus === filters.status;
      const matchesNameOrEmail = !filters.name || 
        p.name.toLowerCase().includes(filters.name.toLowerCase()) ||
        (p.email || p.expand?.user?.email || '').toLowerCase().includes(filters.name.toLowerCase());
      return matchesVoice && matchesStatus && matchesNameOrEmail;
    });
  }, [profiles, filters, voiceParts]);

  const addProfile = useCallback(async (data: ProfileInput) => {
    try {
      await profileService.createProfile(data);
      await fetchProfiles();
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : 'Failed to add profile');
    }
  }, [fetchProfiles]);

  const editProfile = useCallback(async (id: string, data: ProfileInput) => {
    try {
      await profileService.updateProfile(id, data);
      await fetchProfiles();
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update profile');
    }
  }, [fetchProfiles]);

  const removeProfile = useCallback(async (id: string) => {
    try {
      await profileService.deleteProfile(id);
      await fetchProfiles();
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete profile');
    }
  }, [fetchProfiles]);

  const setFilter = useCallback(<K extends keyof typeof filters>(key: K, value: typeof filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  return {
    allProfiles: profiles,
    profiles: filteredProfiles,
    unfilteredByVoicePartProfiles,
    isLoading,
    error,
    filters,
    setFilter,
    addProfile,
    editProfile,
    removeProfile,
    refresh: fetchProfiles,
  };
};
