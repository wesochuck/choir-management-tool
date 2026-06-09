import test from 'node:test';
import assert from 'node:assert/strict';
import { communicationService } from '../src/services/communicationService.ts';
import { shouldQueueMessage } from '../pocketbase/pb_hooks_src/email/messageHookRules.ts';
import type { PocketBaseRecord } from '../pocketbase/pb_hooks_src/email/emailTypes.ts';

test('shouldQueueMessage only returns true for Sent status', async () => {
  const mockRecord = (data: Record<string, unknown>) => ({
    get: (key: string) => data[key],
  } as unknown as PocketBaseRecord);

  const sentEmail = mockRecord({ status: 'Sent', type: 'Email' });
  const archivedEmail = mockRecord({ status: 'Archived', type: 'Email' });
  const draftEmail = mockRecord({ status: 'Draft', type: 'Email' });
  const failedEmail = mockRecord({ status: 'Failed', type: 'Email' });
  const sentBoth = mockRecord({ status: 'Sent', type: 'Both' });
  const sentSms = mockRecord({ status: 'Sent', type: 'SMS' });

  assert.equal(shouldQueueMessage(sentEmail), true, 'Sent Email should queue');
  assert.equal(shouldQueueMessage(archivedEmail), false, 'Archived Email should NOT queue');
  assert.equal(shouldQueueMessage(draftEmail), false, 'Draft Email should NOT queue');
  assert.equal(shouldQueueMessage(failedEmail), false, 'Failed Email should NOT queue');
  assert.equal(shouldQueueMessage(sentBoth), true, 'Sent Both should queue');
  assert.equal(shouldQueueMessage(sentSms), true, 'Sent SMS should queue');

  // Test status transitions
  assert.equal(shouldQueueMessage(sentEmail, 'Draft'), true, 'Draft -> Sent should queue');
  assert.equal(shouldQueueMessage(sentEmail, 'Sent'), false, 'Sent -> Sent should NOT queue (prevent double send)');
  assert.equal(shouldQueueMessage(archivedEmail, 'Draft'), false, 'Draft -> Archived should NOT queue');
});

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
  let createPayload: Record<string, unknown> | null = null;

  pb.collection = ((name: string) => {
    if (name === 'messages') {
      return {
        create: async (data: Record<string, unknown>) => {
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
