import test from 'node:test';
import assert from 'node:assert/strict';
import { communicationService } from '../src/services/communicationService.ts';

test('getAutomatedTaskStatuses maps Archived records correctly', async () => {
  const { pb } = await import('../src/lib/pocketbase.ts');
  const originalCollection = pb.collection;

  const mockGetFullList = async <T>(options?: { filter?: string }): Promise<T[]> => {
    const filterStr = options?.filter || '';
    if (filterStr.includes('event-1') && filterStr.includes('Archived')) {
      if (filterStr.includes('Automated Reminder')) {
        return [
          { 
            id: 'm1', 
            status: 'Archived', 
            filters: { eventId: 'event-1', type: 'Automated Reminder' } 
          } as T
        ];
      }
    }
    return [];
  };

  pb.collection = ((name: string) => {
    if (name === 'messages') {
      return { getFullList: mockGetFullList };
    }
    return originalCollection.call(pb, name);
  }) as unknown as typeof pb.collection;

  try {
    const statuses = await communicationService.getAutomatedTaskStatuses(['event-1']);
    assert.equal(statuses['reminder-event-1'], 'archived');
    assert.equal(statuses['rsvp-event-1'], 'pending');
    assert.equal(statuses['report-event-1'], 'pending');
  } finally {
    pb.collection = originalCollection;
  }
});

test('getAutomatedTaskStatuses gives Sent precedence over Archived', async () => {
  const { pb } = await import('../src/lib/pocketbase.ts');
  const originalCollection = pb.collection;

  const mockGetFullList = async <T>(options?: { filter?: string }): Promise<T[]> => {
    const filterStr = options?.filter || '';
    if (filterStr.includes('event-1')) {
      return [
        { 
          id: 'm1', 
          status: 'Archived', 
          filters: { eventId: 'event-1', type: 'Automated Reminder' },
          created: '2026-01-01 10:00:00'
        } as T,
        { 
          id: 'm2', 
          status: 'Sent', 
          filters: { eventId: 'event-1', type: 'Automated Reminder' },
          created: '2026-01-01 11:00:00'
        } as T
      ];
    }
    return [];
  };

  pb.collection = ((name: string) => {
    if (name === 'messages') {
      return { getFullList: mockGetFullList };
    }
    return originalCollection.call(pb, name);
  }) as unknown as typeof pb.collection;

  try {
    const statuses = await communicationService.getAutomatedTaskStatuses(['event-1']);
    assert.equal(statuses['reminder-event-1'], 'sent', 'Sent should win over Archived');
  } finally {
    pb.collection = originalCollection;
  }
});

test('archiveMessage creates an Archived record and does not call sendBulkMessage', async () => {
  const { pb } = await import('../src/lib/pocketbase.ts');
  const originalCollection = pb.collection;
  
  let createCalled = false;
  let createPayload: any = null;

  pb.collection = ((name: string) => {
    if (name === 'messages') {
      return {
        create: async (data: any) => {
          createCalled = true;
          createPayload = data;
          return { id: 'new-archived-id', ...data };
        }
      };
    }
    return originalCollection.call(pb, name);
  }) as unknown as typeof pb.collection;

  // Mock sendBulkMessage to ensure it is NOT called
  const originalSendBulkMessage = communicationService.sendBulkMessage;
  let sendBulkCalled = false;
  communicationService.sendBulkMessage = async () => {
    sendBulkCalled = true;
    throw new Error('sendBulkMessage should not be called');
  };

  try {
    const input = {
      subject: 'Test Archive',
      content: 'Archive Content',
      type: 'Email' as const,
      recipients: [],
      filters: { eventId: 'event-1' },
    };

    const result = await communicationService.archiveMessage(input);
    
    assert.equal(createCalled, true);
    assert.equal(createPayload.status, 'Archived');
    assert.equal(result.status, 'Archived');
    assert.equal(sendBulkCalled, false, 'sendBulkMessage should NOT have been called');
  } finally {
    pb.collection = originalCollection;
    communicationService.sendBulkMessage = originalSendBulkMessage;
  }
});
