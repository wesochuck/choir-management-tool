import { useState, useEffect } from 'react';
import { venueService, type Venue } from '../services/venueService';

export const useVenues = () => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVenues = async () => {
    setIsLoading(true);
    try {
      const data = await venueService.getVenues();
      setVenues(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch venues');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, []);

  const addVenue = async (data: Partial<Venue>) => {
    try {
      const record = await venueService.createVenue(data);
      await fetchVenues();
      return record;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to add venue');
    }
  };

  const editVenue = async (id: string, data: Partial<Venue>) => {
    try {
      await venueService.updateVenue(id, data);
      await fetchVenues();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update venue');
    }
  };

  const removeVenue = async (id: string) => {
    try {
      await venueService.deleteVenue(id);
      await fetchVenues();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete venue');
    }
  };

  return {
    venues,
    isLoading,
    error,
    addVenue,
    editVenue,
    removeVenue,
    refresh: fetchVenues,
  };
};
