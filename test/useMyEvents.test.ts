import { test, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMyEvents } from '../src/hooks/useMyEvents';
import { profileService } from '../src/services/profileService';
import { eventService } from '../src/services/eventService';
import { rosterService } from '../src/services/rosterService';

vi.mock('../src/services/profileService', () => ({
  profileService: {
    getMyProfile: vi.fn()
  }
}));

vi.mock('../src/services/eventService', () => ({
  eventService: {
    getEvents: vi.fn()
  }
}));

vi.mock('../src/services/rosterService', () => ({
  rosterService: {
    getMyRosters: vi.fn(),
    updateRSVP: vi.fn()
  }
}));

test('useMyEvents updateRSVP throws when no profile is found', async () => {
    vi.mocked(eventService.getEvents).mockResolvedValue([]);
    vi.mocked(rosterService.getMyRosters).mockResolvedValue([]);
    vi.mocked(profileService.getMyProfile).mockRejectedValue(new Error('no profile'));

    const { result } = renderHook(() => useMyEvents());

    await expect(result.current.updateRSVP('test-event', 'Yes'))
        .rejects
        .toThrow('No profile found for current user');
});
