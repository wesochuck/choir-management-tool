import { useState, useEffect, useMemo, useCallback } from 'react';
import { profileService, type Profile, type ProfileInput } from '../services/profileService';
import { getVoiceParts, type VoicePartDef } from '../services/settingsService';
import { matchesVoiceParts } from '../lib/voicePartUtils';

export const useProfiles = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [voiceParts, setVoiceParts] = useState<VoicePartDef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ voiceParts: [] as string[], status: '', name: '' });

  const fetchProfiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await profileService.getProfiles();
      setProfiles(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profiles');
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
      const matchesName = !filters.name || p.name.toLowerCase().includes(filters.name.toLowerCase());
      return matchesStatus && matchesName;
    });
  }, [profiles, filters.status, filters.name]);

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const matchesVoice = matchesVoiceParts(p.voicePart, filters.voiceParts, voiceParts);
      const matchesStatus = !filters.status || p.globalStatus === filters.status;
      const matchesName = !filters.name || p.name.toLowerCase().includes(filters.name.toLowerCase());
      return matchesVoice && matchesStatus && matchesName;
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
