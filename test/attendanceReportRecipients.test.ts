import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAttendanceReportRecipients, triggerAttendanceReport, finalizeUnmarkedAttendanceForEvent } from '../src/services/communication/attendanceReportService.ts';
import { messageRepository } from '../src/services/communication/messageRepository.ts';
import type { MessageRecord } from '../src/services/communication/types.ts';

test('resolveAttendanceReportRecipients filters correctly', async () => {
  const { pb } = await import('../src/lib/pocketbase.ts');
  const originalCollection = pb.collection;

  const mockProfiles = [
    {
      id: 'p1',
      user: 'u1',
      name: 'Admin Opted In',
      receiveAttendanceReports: true,
      doNotEmail: false,
      globalStatus: 'Active',
      expand: { user: { email: 'admin1@example.org', role: 'admin' } }
    },
    {
      id: 'p2',
      user: 'u2',
      name: 'Admin Undefined (Opted In by default)',
      receiveAttendanceReports: undefined,
      doNotEmail: false,
      globalStatus: 'Active',
      expand: { user: { email: 'admin2@example.org', role: 'admin' } }
    },
    {
      id: 'p3',
      user: 'u3',
      name: 'Admin Opted Out',
      receiveAttendanceReports: false,
      doNotEmail: false,
      globalStatus: 'Active',
      expand: { user: { email: 'admin3@example.org', role: 'admin' } }
    },
    {
      id: 'p4',
      user: 'u4',
      name: 'Admin doNotEmail',
      receiveAttendanceReports: true,
      doNotEmail: true,
      globalStatus: 'Active',
      expand: { user: { email: 'admin4@example.org', role: 'admin' } }
    },
    {
      id: 'p5',
      user: 'u5',
      name: 'Singer',
      receiveAttendanceReports: true,
      doNotEmail: false,
      globalStatus: 'Active',
      expand: { user: { email: 'singer1@example.org', role: 'singer' } }
    },
    {
      id: 'p6',
      user: 'u6',
      name: 'Admin Inactive',
      receiveAttendanceReports: true,
      doNotEmail: false,
      globalStatus: 'Inactive',
      expand: { user: { email: 'admin6@example.org', role: 'admin' } }
    },
    {
      id: 'p7',
      user: 'u7',
      name: 'Admin No Email',
      receiveAttendanceReports: true,
      doNotEmail: false,
      globalStatus: 'Active',
      expand: { user: { email: '', role: 'admin' } }
    }
  ];

  pb.collection = ((name: string) => {
    if (name === 'profiles') {
      return {
        getFullList: async () => mockProfiles
      };
    }
    return originalCollection.call(pb, name);
  }) as unknown as typeof pb.collection;

  try {
    const recipients = await resolveAttendanceReportRecipients();
    
    // Case 1: includes linked active admin with email and receiveAttendanceReports = true (admin1)
    assert.ok(recipients.find(r => r.email === 'admin1@example.org'), 'Should include admin1');
    
    // Case 2: includes admin when receiveAttendanceReports is unset (admin2)
    assert.ok(recipients.find(r => r.email === 'admin2@example.org'), 'Should include admin2 (default true)');
    
    // Case 3: excludes admin when receiveAttendanceReports = false (admin3)
    assert.ok(!recipients.find(r => r.email === 'admin3@example.org'), 'Should exclude admin3 (opted out)');
    
    // Case 4: excludes admin when doNotEmail = true (admin4)
    assert.ok(!recipients.find(r => r.email === 'admin4@example.org'), 'Should exclude admin4 (doNotEmail)');
    
    // Case 5: excludes inactive admin (admin6)
    assert.ok(!recipients.find(r => r.email === 'admin6@example.org'), 'Should exclude admin6 (inactive)');

    // Case 6: excludes singer users (singer1)
    assert.ok(!recipients.find(r => r.email === 'singer1@example.org'), 'Should exclude singer1');

    // Case 7: excludes profiles with no expanded user email (admin7)
    assert.ok(!recipients.find(r => r.id === 'u7'), 'Should exclude admin7 (no email)');

    assert.equal(recipients.length, 2, 'Total recipients should be 2');
  } finally {
    pb.collection = originalCollection;
  }
});

test('triggerAttendanceReport throws if no recipients', async () => {
  const { pb } = await import('../src/lib/pocketbase.ts');
  const originalCollection = pb.collection;

  pb.collection = ((name: string) => {
    if (name === 'profiles') {
      return { getFullList: async () => [] };
    }
    if (name === 'events') {
      return { getOne: async () => ({ id: 'e1', date: new Date().toISOString(), title: 'Test' }) };
    }
    if (name === 'appSettings') {
      return { getFirstListItem: async () => ({ id: 'settings-communications', value: {} }) };
    }
    return originalCollection.call(pb, name);
  }) as unknown as typeof pb.collection;

  try {
    await assert.rejects(
      triggerAttendanceReport('e1'),
      /No admins are configured to receive attendance reports/
    );
  } finally {
    pb.collection = originalCollection;
  }
});

test('triggerAttendanceReport saves message with correct recipients', async () => {
  const { pb } = await import('../src/lib/pocketbase.ts');
  const originalCollection = pb.collection;
  const originalSaveMessage = messageRepository.saveMessage;

  let savedMessage: MessageRecord = null as unknown as MessageRecord;
  messageRepository.saveMessage = async (data) => {
    savedMessage = data as MessageRecord;
    return { id: 'm1', created: '', ...data } as MessageRecord;
  };

  pb.collection = ((name: string) => {
    if (name === 'profiles') {
      return { 
        getFullList: async () => [
          {
            id: 'p1', user: 'u1', name: 'Admin',
            receiveAttendanceReports: true,
            expand: { user: { email: 'admin@example.org', role: 'admin' } }
          }
        ]
      };
    }
    if (name === 'events') {
      return { getOne: async () => ({ id: 'e1', date: new Date().toISOString(), title: 'Test' }) };
    }
    if (name === 'eventRosters') {
      return { getFullList: async () => [{ id: 'r1', attendance: 'Present', profile: 'p1' }] };
    }
    if (name === 'appSettings') {
      return { getFirstListItem: async () => ({ id: 'settings-communications', value: {} }) };
    }
    return originalCollection.call(pb, name);
  }) as unknown as typeof pb.collection;

  try {
    await triggerAttendanceReport('e1');
    assert.ok(savedMessage);
    assert.equal(savedMessage.recipients.length, 1);
    assert.equal(savedMessage.recipients[0].email, 'admin@example.org');
  } finally {
    pb.collection = originalCollection;
    messageRepository.saveMessage = originalSaveMessage;
  }
});

test('finalizeUnmarkedAttendanceForEvent creates or updates roster to Absent', async () => {
  const { pb } = await import('../src/lib/pocketbase.ts');
  const originalCollection = pb.collection;
  const originalCreateBatch = pb.createBatch;

  const mockEvents = {
    'e1': { id: 'e1', type: 'Rehearsal', parentPerformanceId: 'perf1', date: new Date().toISOString() }
  };

  const mockProfiles = [
    { id: 'p1', voicePart: 'Soprano', globalStatus: 'Active', name: 'Performing Singer' },
    { id: 'p2', voicePart: 'Alto', globalStatus: 'Active', name: 'Non-Performing Singer' }
  ];

  const mockPerfRosters = [
    { id: 'pr1', event: 'perf1', profile: 'p1', rsvp: 'Yes' },
    { id: 'pr2', event: 'perf1', profile: 'p2', rsvp: 'No' }
  ];

  const mockRehearsalRosters = [
    { id: 'rr1', event: 'e1', profile: 'p1', attendance: 'Pending', rsvp: 'Pending' }
  ];

  const createdRosters: Record<string, unknown>[] = [];
  const updatedRosters: Record<string, unknown>[] = [];

  pb.collection = ((name: string) => {
    if (name === 'events') {
      return {
        getOne: async (id: string) => mockEvents[id as keyof typeof mockEvents]
      };
    }
    if (name === 'profiles') {
      return {
        getFullList: async () => mockProfiles
      };
    }
    if (name === 'eventRosters') {
      return {
        getFullList: async (options?: { filter?: string }) => {
          if (options?.filter?.includes('perf1')) {
            return mockPerfRosters;
          }
          if (options?.filter?.includes('e1')) {
            return mockRehearsalRosters;
          }
          return [];
        },
      };
    }
    return originalCollection.call(pb, name);
  }) as unknown as typeof pb.collection;

  pb.createBatch = function () {
    return {
      collection: (colName: string) => {
        assert.equal(colName, 'eventRosters');
        return {
          create: (data: Record<string, unknown>) => {
            createdRosters.push(data);
          },
          update: (id: string, data: Record<string, unknown>) => {
            updatedRosters.push({ id, ...data });
          }
        } as unknown as ReturnType<ReturnType<typeof pb.createBatch>['collection']>;
      },
      send: async () => [],
    } as unknown as ReturnType<typeof pb.createBatch>;
  };

  try {
    const { rosterService } = await import('../src/services/rosterService.ts');
    const originalGetEventRoster = rosterService.getEventRoster;
    rosterService.getEventRoster = async (eventId: string) => {
      if (eventId === 'perf1') return mockPerfRosters as unknown as ReturnType<typeof originalGetEventRoster>;
      if (eventId === 'e1') return mockRehearsalRosters as unknown as ReturnType<typeof originalGetEventRoster>;
      return [];
    };

    try {
      await finalizeUnmarkedAttendanceForEvent('e1');

      assert.equal(updatedRosters.length, 1, 'Should update 1 roster record');
      assert.equal(updatedRosters[0].id, 'rr1', 'Should update rr1');
      assert.equal(updatedRosters[0].attendance, 'Absent', 'Should update to Absent');
      assert.equal(createdRosters.length, 0, 'Should not create any new roster records');
    } finally {
      rosterService.getEventRoster = originalGetEventRoster;
    }
  } finally {
    pb.collection = originalCollection;
    pb.createBatch = originalCreateBatch;
  }
});
