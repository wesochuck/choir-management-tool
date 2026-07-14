// @vitest-environment jsdom
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';

import { useAttendance } from '../src/hooks/useAttendance';
import { eventService, type Event } from '../src/services/eventService';
import { profileService, type Profile } from '../src/services/profileService';
import { rosterService, type EventRoster } from '../src/services/rosterService';

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const sampleEvent: Event = {
  id: 'evt_1',
  title: 'Test Event',
  date: '2026-01-01 00:00:00.000Z',
  type: 'Rehearsal',
  details: '',
  parentPerformanceId: '',
  collectionId: '',
  collectionName: 'events',
  created: '',
  updated: '',
};

const sampleProfile: Profile = {
  id: 'prof_1',
  user: 'user_1',
  name: 'Test Profile',
  phone: '',
  photo: '',
  voicePart: 'Soprano',
  globalStatus: 'Active',
  notes: '',
  collectionId: '',
  collectionName: 'profiles',
  created: '',
  updated: '',
};

const sampleRoster: EventRoster = {
  id: 'roster_1',
  profile: 'prof_1',
  event: 'evt_1',
  rsvp: 'Yes',
  attendance: 'Present',
  seatId: '',
  folderNumber: '',
  folderReturned: false,
  collectionId: '',
  collectionName: 'eventRosters',
  created: '',
  updated: '',
};

describe('useAttendance', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it('loads active profiles, events, and rosters successfully', async () => {
    const getEvents = mock.method(eventService, 'getEvents', async () => [sampleEvent]);
    const getActiveProfiles = mock.method(profileService, 'getActiveProfiles', async () => [sampleProfile]);
    const getEventRoster = mock.method(rosterService, 'getEventRoster', async () => [sampleRoster]);

    const { result } = renderHook(() => useAttendance('evt_1'), { wrapper: createWrapper() });

    assert.equal(result.current.isLoading, true);

    await waitFor(() => {
      assert.equal(result.current.isLoading, false);
    });

    assert.equal(getEvents.mock.callCount(), 1);
    assert.equal(getActiveProfiles.mock.callCount(), 1);
    assert.equal(getEventRoster.mock.callCount(), 1);
    assert.equal(getEventRoster.mock.calls[0]?.arguments?.[0], 'evt_1');

    assert.equal(result.current.items.length, 1);
    assert.equal(result.current.items[0].profileId, 'prof_1');
    assert.equal(result.current.items[0].attendance, 'Present');
    assert.equal(result.current.items[0].rsvp, 'Yes');
    assert.equal(result.current.event?.id, 'evt_1');
  });

  it('handles setAttendance and setRSVP mutations', async () => {
    mock.method(eventService, 'getEvents', async () => [sampleEvent]);
    mock.method(profileService, 'getActiveProfiles', async () => [sampleProfile]);
    mock.method(rosterService, 'getEventRoster', async () => [sampleRoster]);

    const upsertAttendance = mock.method(rosterService, 'upsertAttendance', async () => ({ ...sampleRoster, attendance: 'Absent' }));
    const updateRSVP = mock.method(rosterService, 'updateRSVP', async () => ({ ...sampleRoster, rsvp: 'No' }));

    const { result } = renderHook(() => useAttendance('evt_1'), { wrapper: createWrapper() });

    await waitFor(() => {
      assert.equal(result.current.isLoading, false);
    });

    await act(async () => {
      await result.current.setAttendance('prof_1', 'Absent');
    });

    assert.equal(upsertAttendance.mock.callCount(), 1);
    const attendanceArgs = upsertAttendance.mock.calls[0]?.arguments;
    assert.equal(attendanceArgs?.[0], 'evt_1');
    assert.equal(attendanceArgs?.[1], 'prof_1');
    assert.equal(attendanceArgs?.[2], 'Absent');

    await act(async () => {
      await result.current.setRSVP('prof_1', 'No');
    });

    assert.equal(updateRSVP.mock.callCount(), 1);
    const rsvpArgs = updateRSVP.mock.calls[0]?.arguments;
    assert.equal(rsvpArgs?.[0], 'evt_1');
    assert.equal(rsvpArgs?.[1], 'prof_1');
    assert.equal(rsvpArgs?.[2], 'No');
  });

  it('handles updateFolder and setAllAttendance mutations', async () => {
    mock.method(eventService, 'getEvents', async () => [sampleEvent]);
    mock.method(profileService, 'getActiveProfiles', async () => [sampleProfile]);
    mock.method(rosterService, 'getEventRoster', async () => [sampleRoster]);

    const upsertFolder = mock.method(rosterService, 'upsertFolder', async () => ({ ...sampleRoster, folderNumber: '42' }));
    const bulkUpsertAttendance = mock.method(rosterService, 'bulkUpsertAttendance', async () => [sampleRoster]);

    const { result } = renderHook(() => useAttendance('evt_1'), { wrapper: createWrapper() });

    await waitFor(() => {
      assert.equal(result.current.isLoading, false);
    });

    await act(async () => {
      await result.current.updateFolder('prof_1', '42', true);
    });

    assert.equal(upsertFolder.mock.callCount(), 1);
    const folderArgs = upsertFolder.mock.calls[0]?.arguments;
    assert.equal(folderArgs?.[0], 'evt_1');
    assert.equal(folderArgs?.[1], 'prof_1');
    assert.deepEqual(folderArgs?.[2], { folderNumber: '42', folderReturned: true });

    await act(async () => {
      await result.current.setAllAttendance('Absent');
    });

    assert.equal(bulkUpsertAttendance.mock.callCount(), 1);
    const bulkArgs = bulkUpsertAttendance.mock.calls[0]?.arguments;
    assert.equal(bulkArgs?.[0], 'evt_1');
    assert.deepEqual(bulkArgs?.[1], [{ profileId: 'prof_1', attendance: 'Absent' }]);
  });
});
