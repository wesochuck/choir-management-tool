import test from 'node:test';
import assert from 'node:assert/strict';
import { communicationService } from '../src/services/communicationService.ts';

test('resolveTicketBuyerRecipients maps paid purchases correctly', async () => {
  const { pb } = await import('../src/lib/pocketbase.ts');
  const originalCollection = pb.collection;

  const mockPurchases = [
    {
      id: 'p1',
      status: 'paid',
      buyerName: 'Alice',
      buyerEmail: 'alice@example.com',
      quantity: 2,
    },
    {
      id: 'p2',
      status: 'pending',
      buyerName: 'Bob',
      buyerEmail: 'bob@example.com',
      quantity: 1,
    },
    {
      id: 'p3',
      status: 'paid',
      buyerName: 'Charlie',
      buyerEmail: 'charlie@example.com',
      quantity: 3,
    },
  ];

  pb.collection = ((name: string) => {
    if (name === 'ticketPurchases') {
      return {
        getFullList: async () => mockPurchases,
      };
    }
    return originalCollection.call(pb, name);
  }) as unknown as typeof pb.collection;

  try {
    const recipients = await communicationService.resolveTicketBuyerRecipients('event-1');
    
    assert.equal(recipients.length, 2);
    assert.equal(recipients[0].id, 'p1');
    assert.equal(recipients[0].name, 'Alice <alice@example.com> (Qty: 2)');
    assert.equal(recipients[0].voicePart, 'Ticket Buyer');
    assert.equal(recipients[1].id, 'p3');
    assert.equal(recipients[1].name, 'Charlie <charlie@example.com> (Qty: 3)');
  } finally {
    pb.collection = originalCollection;
  }
});

test('getAutomatedTaskStatuses includes ticket-reminder status', async () => {
  const { pb } = await import('../src/lib/pocketbase.ts');
  const originalCollection = pb.collection;

  const mockGetFullList = async <T>(options?: { filter?: string }): Promise<T[]> => {
    const filterStr = options?.filter || '';
    if (filterStr.includes('event-1')) {
      if (filterStr.includes('Ticket Buyer Reminder')) {
        return [
          { 
            id: 'm1', 
            status: 'Sent', 
            filters: { eventId: 'event-1', type: 'Ticket Buyer Reminder' } 
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
    assert.equal(statuses['ticket-reminder-event-1'], 'sent');
    assert.equal(statuses['rsvp-event-1'], 'pending');
  } finally {
    pb.collection = originalCollection;
  }
});
