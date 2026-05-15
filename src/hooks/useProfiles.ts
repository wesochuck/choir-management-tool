import { useState, useEffect, useMemo } from 'react';
import { profileService, type Profile } from '../services/profileService';

export const useProfiles = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ voicePart: '', status: '' });

  const fetchProfiles = async () => {
    setIsLoading(true);
    try {
      const data = await profileService.getProfiles();
      setProfiles(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch profiles');
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
      return matchesVoice && matchesStatus;
    });
  }, [profiles, filters]);

  const addProfile = async (data: Partial<Profile>) => {
    try {
      await profileService.createProfile(data);
      await fetchProfiles();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to add profile');
    }
  };

  const editProfile = async (id: string, data: Partial<Profile>) => {
    try {
      await profileService.updateProfile(id, data);
      await fetchProfiles();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update profile');
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
    refresh: fetchProfiles,
  };
};
