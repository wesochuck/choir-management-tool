// @vitest-environment jsdom
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAttendance } from '../src/hooks/useAttendance.ts';
import { rosterService, type EventRoster } from '../src/services/rosterService.ts';
import { profileService, type Profile } from '../src/services/profileService.ts';
import { eventService, type Event } from '../src/services/eventService.ts';

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

test('useAttendance - resolves RSVP correctly for rehearsals and performances', async () => {
  const originalGetEvents = eventService.getEvents;
  const originalGetActiveProfiles = profileService.getActiveProfiles;
  const originalGetEventRoster = rosterService.getEventRoster;

  const mockProfiles: Profile[] = [
    {
      id: 'profile_1',
      name: 'Singer One',
      voicePart: 'S1',
      globalStatus: 'Active',
      user: 'user_1',
      phone: '',
      photo: '',
      notes: '',
      collectionId: 'pbc_profiles_001',
      collectionName: 'profiles',
      created: '',
      updated: '',
    },
  ];

  const mockEvents: Event[] = [
    {
      id: 'perf_1',
      title: 'Winter Concert',
      type: 'Performance',
      date: '2026-12-25T19:00:00Z',
      parentPerformanceId: '',
      details: '',
      collectionId: 'pbc_events_001',
      collectionName: 'events',
      created: '',
      updated: '',
    },
    {
      id: 'reh_1',
      title: 'Rehearsal 1',
      type: 'Rehearsal',
      date: '2026-12-20T19:00:00Z',
      parentPerformanceId: 'perf_1',
      details: '',
      collectionId: 'pbc_events_001',
      collectionName: 'events',
      created: '',
      updated: '',
    },
  ];

  // We will dynamicize the rosters returned in each test run
  let eventRosters: EventRoster[] = [];
  let parentRosters: EventRoster[] = [];

  eventService.getEvents = async () => mockEvents;
  profileService.getActiveProfiles = async () => mockProfiles;
  rosterService.getEventRoster = async (id: string) => {
    if (id === 'perf_1') {
      return parentRosters;
    }
    return eventRosters;
  };

  try {
    // Scenario 1: Performance view - singer declined (RSVP = 'No')
    eventRosters = [
      {
        id: 'roster_1',
        event: 'perf_1',
        profile: 'profile_1',
        rsvp: 'No',
        attendance: 'Pending',
        seatId: '',
        folderNumber: '',
        folderReturned: false,
        collectionId: 'pbc_rosters_001',
        collectionName: 'eventRosters',
        created: '',
        updated: '',
      },
    ];
    parentRosters = eventRosters;

    const { result: res1 } = renderHook(() => useAttendance('perf_1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      if (res1.current.isLoading) throw new Error('Still loading');
    });

    assert.equal(res1.current.items.length, 1);
    assert.equal(res1.current.items[0].rsvp, 'No');

    // Scenario 2: Rehearsal view - singer declined the parent performance, no rehearsal RSVP (or Pending)
    // Rehearsal has no explicit roster record (defaults to Pending)
    eventRosters = [];
    // Parent performance has declined (RSVP = 'No')
    parentRosters = [
      {
        id: 'roster_parent',
        event: 'perf_1',
        profile: 'profile_1',
        rsvp: 'No',
        attendance: 'Pending',
        seatId: '',
        folderNumber: '',
        folderReturned: false,
        collectionId: 'pbc_rosters_001',
        collectionName: 'eventRosters',
        created: '',
        updated: '',
      },
    ];

    const { result: res2 } = renderHook(() => useAttendance('reh_1'), { wrapper: createWrapper() });

    await waitFor(() => {
      if (res2.current.isLoading) throw new Error('Still loading');
    });

    assert.equal(res2.current.items.length, 1);
    // Since the singer declined the parent performance, rehearsal RSVP should default to 'No'
    assert.equal(res2.current.items[0].rsvp, 'No');

    // Scenario 3: Rehearsal view - singer declined parent performance, but has explicit 'Yes' RSVP for the rehearsal
    eventRosters = [
      {
        id: 'roster_reh',
        event: 'reh_1',
        profile: 'profile_1',
        rsvp: 'Yes',
        attendance: 'Pending',
        seatId: '',
        folderNumber: '',
        folderReturned: false,
        collectionId: 'pbc_rosters_001',
        collectionName: 'eventRosters',
        created: '',
        updated: '',
      },
    ];
    parentRosters = [
      {
        id: 'roster_parent',
        event: 'perf_1',
        profile: 'profile_1',
        rsvp: 'No',
        attendance: 'Pending',
        seatId: '',
        folderNumber: '',
        folderReturned: false,
        collectionId: 'pbc_rosters_001',
        collectionName: 'eventRosters',
        created: '',
        updated: '',
      },
    ];

    const { result: res3 } = renderHook(() => useAttendance('reh_1'), { wrapper: createWrapper() });

    await waitFor(() => {
      if (res3.current.isLoading) throw new Error('Still loading');
    });

    assert.equal(res3.current.items.length, 1);
    // Rehearsal explicit RSVP ('Yes') should take precedence over parent performance decline
    assert.equal(res3.current.items[0].rsvp, 'Yes');

    // Scenario 4: Rehearsal view - singer accepted (Yes) parent performance, but has no explicit rehearsal RSVP
    eventRosters = [];
    parentRosters = [
      {
        id: 'roster_parent',
        event: 'perf_1',
        profile: 'profile_1',
        rsvp: 'Yes',
        attendance: 'Pending',
        seatId: '',
        folderNumber: '',
        folderReturned: false,
        collectionId: 'pbc_rosters_001',
        collectionName: 'eventRosters',
        created: '',
        updated: '',
      },
    ];

    const { result: res4 } = renderHook(() => useAttendance('reh_1'), { wrapper: createWrapper() });

    await waitFor(() => {
      if (res4.current.isLoading) throw new Error('Still loading');
    });

    assert.equal(res4.current.items.length, 1);
    // Should remain 'Pending'
    assert.equal(res4.current.items[0].rsvp, 'Pending');
  } finally {
    eventService.getEvents = originalGetEvents;
    profileService.getActiveProfiles = originalGetActiveProfiles;
    rosterService.getEventRoster = originalGetEventRoster;
  }
});

test('useAttendance - setAttendance calls upsertAttendance with rosterId and rsvp when requested', async () => {
  const originalGetEvents = eventService.getEvents;
  const originalGetActiveProfiles = profileService.getActiveProfiles;
  const originalGetEventRoster = rosterService.getEventRoster;
  const originalUpsertAttendance = rosterService.upsertAttendance;

  const mockProfiles: Profile[] = [
    {
      id: 'profile_1',
      name: 'Singer One',
      voicePart: 'S1',
      globalStatus: 'Active',
      user: 'user_1',
      phone: '',
      photo: '',
      notes: '',
      collectionId: 'pbc_profiles_001',
      collectionName: 'profiles',
      created: '',
      updated: '',
    },
  ];

  const mockEvents: Event[] = [
    {
      id: 'event_1',
      title: 'Concert 1',
      type: 'Performance',
      date: '2026-12-25T19:00:00Z',
      parentPerformanceId: '',
      details: '',
      collectionId: 'pbc_events_001',
      collectionName: 'events',
      created: '',
      updated: '',
    },
  ];

  const mockRosters: EventRoster[] = [
    {
      id: 'roster_1',
      event: 'event_1',
      profile: 'profile_1',
      rsvp: 'Pending',
      attendance: 'Pending',
      seatId: '',
      folderNumber: '',
      folderReturned: false,
      collectionId: 'pbc_rosters_001',
      collectionName: 'eventRosters',
      created: '',
      updated: '',
    },
  ];

  eventService.getEvents = async () => mockEvents;
  profileService.getActiveProfiles = async () => mockProfiles;
  rosterService.getEventRoster = async () => mockRosters;

  let upsertCalledWith: unknown = null;
  rosterService.upsertAttendance = async (eventId, profileId, next, options) => {
    upsertCalledWith = { eventId, profileId, next, options };
    return mockRosters[0];
  };

  try {
    const { result } = renderHook(() => useAttendance('event_1'), { wrapper: createWrapper() });

    await waitFor(() => {
      if (result.current.isLoading) throw new Error('Still loading');
    });

    assert.equal(result.current.items.length, 1);

    // Call setAttendance with custom options
    await act(async () => {
      await result.current.setAttendance('profile_1', 'Present', 'roster_1', 'Yes');
    });

    const callArgs = upsertCalledWith as {
      eventId: string;
      profileId: string;
      next: string;
      options: { rosterId?: string; rsvp?: string; onRetry?: unknown };
    };

    assert.equal(callArgs.eventId, 'event_1');
    assert.equal(callArgs.profileId, 'profile_1');
    assert.equal(callArgs.next, 'Present');
    assert.equal(callArgs.options.rosterId, 'roster_1');
    assert.equal(callArgs.options.rsvp, 'Yes');
    assert.equal(typeof callArgs.options.onRetry, 'function');
  } finally {
    eventService.getEvents = originalGetEvents;
    profileService.getActiveProfiles = originalGetActiveProfiles;
    rosterService.getEventRoster = originalGetEventRoster;
    rosterService.upsertAttendance = originalUpsertAttendance;
  }
});

// ─── Optimistic first-time check-in tests ────────────────────────────────────

function makeProfile(id: string): Profile {
  return {
    id,
    name: `Singer ${id}`,
    voicePart: 'S1',
    globalStatus: 'Active',
    user: `user_${id}`,
    phone: '',
    photo: '',
    notes: '',
    collectionId: 'pbc_profiles_001',
    collectionName: 'profiles',
    created: '',
    updated: '',
  };
}

function makeEvent(id: string): import('../src/services/eventService.ts').Event {
  return {
    id,
    title: `Event ${id}`,
    type: 'Performance',
    date: '2026-12-25T19:00:00Z',
    parentPerformanceId: '',
    details: '',
    collectionId: 'pbc_events_001',
    collectionName: 'events',
    created: '',
    updated: '',
  };
}

function makeRoster(overrides: Partial<EventRoster>): EventRoster {
  return {
    id: 'roster_default',
    event: 'event_1',
    profile: 'profile_1',
    rsvp: 'Pending',
    attendance: 'Pending',
    seatId: '',
    folderNumber: '',
    folderReturned: false,
    rsvpNote: '',
    collectionId: 'pbc_rosters_001',
    collectionName: 'eventRosters',
    created: '',
    updated: '',
    ...overrides,
  };
}

test('useAttendance - first-time check-in is optimistic: appends row immediately', async () => {
  const originalGetEvents = eventService.getEvents;
  const originalGetActiveProfiles = profileService.getActiveProfiles;
  const originalGetEventRoster = rosterService.getEventRoster;
  const originalUpsertAttendance = rosterService.upsertAttendance;

  eventService.getEvents = async () => [makeEvent('event_1')];
  profileService.getActiveProfiles = async () => [makeProfile('profile_1')];
  // No existing roster row
  rosterService.getEventRoster = async () => [];

  // Mutation resolves with the real saved record (after the "network" call)
  let resolveMutation!: (r: EventRoster) => void;
  const mutationPromise = new Promise<EventRoster>((res) => {
    resolveMutation = res;
  });
  rosterService.upsertAttendance = async () => mutationPromise;

  try {
    const { result } = renderHook(() => useAttendance('event_1'), { wrapper: createWrapper() });

    await waitFor(() => {
      if (result.current.isLoading) throw new Error('Still loading');
    });

    // Before click: item shows Pending with no real rosterId
    assert.equal(result.current.items.length, 1);
    assert.equal(result.current.items[0].attendance, 'Pending');
    assert.equal(result.current.items[0].rosterId, undefined);

    // Trigger check-in (do NOT await — we want to inspect the in-flight state)
    let setAttendancePromise: Promise<void>;
    act(() => {
      setAttendancePromise = result.current.setAttendance('profile_1', 'Present');
    });

    // The optimistic update should be visible before the mutation resolves.
    // Check both attendance and RSVP in the same waitFor so both are asserted
    // after the optimistic render cycle has completed.
    await waitFor(() => {
      const item = result.current.items.find((i) => i.profileId === 'profile_1');
      if (!item || item.attendance !== 'Present')
        throw new Error('Optimistic attendance not applied');
      if (item.rsvp !== 'Yes') throw new Error(`Expected RSVP 'Yes', got '${item.rsvp}'`);
    });

    // Settle the mutation and update the mock to reflect saved state for the refetch
    const savedRoster = makeRoster({
      id: 'roster_real',
      profile: 'profile_1',
      attendance: 'Present',
      rsvp: 'Yes',
    });
    // After resolve, the invalidateAll refetch will call getEventRoster again.
    // Update the mock so it returns the saved roster.
    rosterService.getEventRoster = async () => [savedRoster];
    act(() => resolveMutation(savedRoster));
    await act(async () => {
      await setAttendancePromise!;
    });

    // After settling, the item should show Present (backed by real id from refetch)
    await waitFor(() => {
      if (result.current.items[0].attendance !== 'Present')
        throw new Error('Post-settle state should be Present');
    });
  } finally {
    eventService.getEvents = originalGetEvents;
    profileService.getActiveProfiles = originalGetActiveProfiles;
    rosterService.getEventRoster = originalGetEventRoster;
    rosterService.upsertAttendance = originalUpsertAttendance;
  }
});

test('useAttendance - existing roster row updates optimistically with no duplicate', async () => {
  const originalGetEvents = eventService.getEvents;
  const originalGetActiveProfiles = profileService.getActiveProfiles;
  const originalGetEventRoster = rosterService.getEventRoster;
  const originalUpsertAttendance = rosterService.upsertAttendance;

  const existingRoster = makeRoster({
    id: 'roster_existing',
    profile: 'profile_1',
    attendance: 'Pending',
    rsvp: 'Yes',
  });

  eventService.getEvents = async () => [makeEvent('event_1')];
  profileService.getActiveProfiles = async () => [makeProfile('profile_1')];
  rosterService.getEventRoster = async () => [existingRoster];

  let resolveMutation!: (r: EventRoster) => void;
  const mutationPromise = new Promise<EventRoster>((res) => {
    resolveMutation = res;
  });
  rosterService.upsertAttendance = async () => mutationPromise;

  try {
    const { result } = renderHook(() => useAttendance('event_1'), { wrapper: createWrapper() });

    await waitFor(() => {
      if (result.current.isLoading) throw new Error('Still loading');
    });

    assert.equal(result.current.items[0].rosterId, 'roster_existing');
    assert.equal(result.current.items[0].attendance, 'Pending');

    let setAttendancePromise: Promise<void>;
    act(() => {
      setAttendancePromise = result.current.setAttendance(
        'profile_1',
        'Present',
        'roster_existing'
      );
    });

    // Existing row should be updated in place
    await waitFor(() => {
      if (result.current.items[0].attendance !== 'Present')
        throw new Error('Optimistic update not applied');
    });

    // No duplicate rows created
    const profile1Items = result.current.items.filter((i) => i.profileId === 'profile_1');
    assert.equal(profile1Items.length, 1, 'No duplicate row should be created');

    // Settle
    act(() =>
      resolveMutation(makeRoster({ id: 'roster_existing', attendance: 'Present', rsvp: 'Yes' }))
    );
    await act(async () => {
      await setAttendancePromise!;
    });
  } finally {
    eventService.getEvents = originalGetEvents;
    profileService.getActiveProfiles = originalGetActiveProfiles;
    rosterService.getEventRoster = originalGetEventRoster;
    rosterService.upsertAttendance = originalUpsertAttendance;
  }
});

test('useAttendance - error rollback removes optimistic row and surfaces error', async () => {
  const originalGetEvents = eventService.getEvents;
  const originalGetActiveProfiles = profileService.getActiveProfiles;
  const originalGetEventRoster = rosterService.getEventRoster;
  const originalUpsertAttendance = rosterService.upsertAttendance;

  eventService.getEvents = async () => [makeEvent('event_1')];
  profileService.getActiveProfiles = async () => [makeProfile('profile_1')];
  // No existing roster row
  rosterService.getEventRoster = async () => [];

  rosterService.upsertAttendance = async () => {
    throw new Error('Network failure');
  };

  try {
    const { result } = renderHook(() => useAttendance('event_1'), { wrapper: createWrapper() });

    await waitFor(() => {
      if (result.current.isLoading) throw new Error('Still loading');
    });

    assert.equal(result.current.items[0].attendance, 'Pending');

    await act(async () => {
      // setAttendance swallows the thrown error via mutateAsync; we catch it here
      await result.current.setAttendance('profile_1', 'Present').catch(() => {
        // expected
      });
    });

    // After rollback the item should revert to Pending
    await waitFor(() => {
      if (result.current.items[0].attendance !== 'Pending')
        throw new Error('Rollback did not occur');
    });

    // Error message should be surfaced
    assert.ok(result.current.error, 'Error state should be set after failed mutation');
  } finally {
    eventService.getEvents = originalGetEvents;
    profileService.getActiveProfiles = originalGetActiveProfiles;
    rosterService.getEventRoster = originalGetEventRoster;
    rosterService.upsertAttendance = originalUpsertAttendance;
  }
});
