import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { venueService, type Venue } from '../services/venueService';

function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export const useVenues = () => {
  const queryClient = useQueryClient();
  const venuesQuery = useQuery({
    queryKey: queryKeys.venues.list(),
    queryFn: () => venueService.getVenues(),
    staleTime: 5 * 60_000,
  });

  const invalidateVenues = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.venues.all });
  };

  const addVenueMutation = useMutation({
    mutationFn: (data: Partial<Venue>) => venueService.createVenue(data),
    onSuccess: invalidateVenues,
    onError: (err: unknown) => {
      console.error('[useVenues.addVenueMutation] onError:', err);
    },
  });

  const editVenueMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Venue> }) =>
      venueService.updateVenue(id, data),
    onSuccess: invalidateVenues,
  });

  const removeVenueMutation = useMutation({
    mutationFn: (id: string) => venueService.deleteVenue(id),
    onSuccess: invalidateVenues,
  });

  const addVenue = async (data: Partial<Venue>) => {
    try {
      return await addVenueMutation.mutateAsync(data);
    } catch (err: unknown) {
      console.error('[useVenues.addVenue] mutation failed:', err);
      throw new Error(toErrorMessage(err, 'Failed to add venue'));
    }
  };

  const editVenue = async (id: string, data: Partial<Venue>) => {
    try {
      await editVenueMutation.mutateAsync({ id, data });
    } catch (err: unknown) {
      throw new Error(toErrorMessage(err, 'Failed to update venue'));
    }
  };

  const removeVenue = async (id: string) => {
    try {
      await removeVenueMutation.mutateAsync(id);
    } catch (err: unknown) {
      throw new Error(toErrorMessage(err, 'Failed to delete venue'));
    }
  };

  return {
    venues: venuesQuery.data ?? [],
    isLoading: venuesQuery.isLoading,
    error: venuesQuery.error ? toErrorMessage(venuesQuery.error, 'Failed to fetch venues') : null,
    addVenue,
    editVenue,
    removeVenue,
    refresh: venuesQuery.refetch,
  };
};
