import { useState, useEffect, useMemo } from 'react';
import { profileService, type Profile, type ProfileInput } from '../services/profileService';

export const useProfiles = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ voiceParts: [] as string[], status: '', name: '' });

  const fetchProfiles = async () => {
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
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const unfilteredByVoicePartProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const matchesStatus = !filters.status || p.globalStatus === filters.status;
      const matchesName = !filters.name || p.name.toLowerCase().includes(filters.name.toLowerCase());
      return matchesStatus && matchesName;
    });
  }, [profiles, filters.status, filters.name]);

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const matchesVoice = filters.voiceParts.length === 0 || filters.voiceParts.some(vp => 
        p.voicePart === vp || (vp.length === 1 && p.voicePart?.startsWith(vp))
      );
      const matchesStatus = !filters.status || p.globalStatus === filters.status;
      const matchesName = !filters.name || p.name.toLowerCase().includes(filters.name.toLowerCase());
      return matchesVoice && matchesStatus && matchesName;
    });
  }, [profiles, filters]);

  const addProfile = async (data: ProfileInput) => {
    try {
      await profileService.createProfile(data);
      await fetchProfiles();
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : 'Failed to add profile');
    }
  };

  const editProfile = async (id: string, data: ProfileInput) => {
    try {
      await profileService.updateProfile(id, data);
      await fetchProfiles();
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update profile');
    }
  };

  const removeProfile = async (id: string) => {
    try {
      await profileService.deleteProfile(id);
      await fetchProfiles();
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete profile');
    }
  };

  const setFilter = <K extends keyof typeof filters>(key: K, value: typeof filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

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
