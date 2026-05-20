import { useState, useEffect } from 'react';
import { eventService, type Event } from '../services/eventService';
import { rosterService, type EventRoster } from '../services/rosterService';
import { profileService, type Profile } from '../services/profileService';

export const useMyEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [myRosters, setMyRosters] = useState<Record<string, EventRoster>>({});
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [allEvents, rosters, profile] = await Promise.all([
        eventService.getEvents(),
        rosterService.getMyRosters(),
        profileService.getMyProfile().catch(() => null), // If no profile exists yet
      ]);

      setEvents(allEvents);
      setMyProfile(profile);
      
      const rosterMap: Record<string, EventRoster> = {};
      rosters.forEach(r => rosterMap[r.event] = r);
      setMyRosters(rosterMap);
      
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateRSVP = async (eventId: string, rsvp: 'Yes' | 'No') => {
    if (!myProfile) throw new Error('No profile found for current user');
    try {
      const updated = await rosterService.updateRSVP(eventId, myProfile.id, rsvp);
      setMyRosters(prev => ({ ...prev, [eventId]: updated }));
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update RSVP');
    }
  };

  return {
    events,
    myRosters,
    myProfile,
    isLoading,
    error,
    updateRSVP,
    refresh: fetchData,
  };
};
