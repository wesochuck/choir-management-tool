import { useState, useEffect, useMemo } from 'react';
import { profileService, type Profile, type ProfileInput } from '../services/profileService';

export const useProfiles = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ voicePart: '', status: '', name: '' });

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

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const matchesVoice = !filters.voicePart || p.voicePart === filters.voicePart;
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

  const setFilter = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return {
    profiles: filteredProfiles,
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
