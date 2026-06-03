import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAttendanceReportRecipients, triggerAttendanceReport } from '../src/services/communication/attendanceReportService.ts';
import { messageRepository } from '../src/services/communication/messageRepository.ts';

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
    }
  ];

  pb.collection = ((name: string) => {
    if (name === 'profiles') {
      return {
        getFullList: async () => mockProfiles.filter(p => 
          p.expand.user.role === 'admin' && p.expand.user.email !== '' && p.globalStatus !== 'Inactive'
        )
      };
    }
    return originalCollection.call(pb, name);
  }) as any;

  try {
    const recipients = await resolveAttendanceReportRecipients();
    assert.equal(recipients.length, 2);
    assert.ok(recipients.find(r => r.email === 'admin1@example.org'));
    assert.ok(recipients.find(r => r.email === 'admin2@example.org'));
    assert.ok(!recipients.find(r => r.email === 'admin3@example.org'));
    assert.ok(!recipients.find(r => r.email === 'admin4@example.org'));
    assert.ok(!recipients.find(r => r.email === 'singer1@example.org'));
    assert.ok(!recipients.find(r => r.email === 'admin6@example.org'));
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
      return {
        getFirstListItem: async () => null,
      };
    }
    return originalCollection.call(pb, name);
  }) as any;

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

  let savedMessage: any = null;
  messageRepository.saveMessage = async (data) => {
    savedMessage = data;
    return {} as any;
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
      return {
        getFirstListItem: async () => null,
      };
    }
    return originalCollection.call(pb, name);
  }) as any;

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
