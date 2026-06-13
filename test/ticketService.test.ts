import test from 'node:test';
import assert from 'node:assert/strict';
import { ticketService, TicketPurchase } from '../src/services/ticketService.ts';
import { pb } from '../src/lib/pocketbase.ts';

test('ticketService.createCheckoutSession calls pb.send correctly', async (t) => {
  const originalSend = pb.send;
  const mockSend = t.mock.fn(async () => ({ url: 'mock-url', sessionId: 'mock-session' }));
  pb.send = mockSend as unknown as typeof pb.send;

  try {
    const res = await ticketService.createCheckoutSession('evt_1', 2, 'test@example.com', 'John Doe');
    assert.deepEqual(res, { url: 'mock-url', sessionId: 'mock-session' });
    assert.equal(mockSend.mock.callCount(), 1);
    assert.equal(mockSend.mock.calls[0].arguments[0], '/api/checkout/create-tickets-session');
    assert.deepEqual(mockSend.mock.calls[0].arguments[1], {
      method: 'POST',
      body: { eventId: 'evt_1', quantity: 2, email: 'test@example.com', name: 'John Doe' }
    });
  } finally {
    pb.send = originalSend;
  }
});

test('ticketService.createBundleCheckoutSession calls pb.send correctly', async (t) => {
  const originalSend = pb.send;
  const mockSend = t.mock.fn(async () => ({ url: 'mock-url-bundle', sessionId: 'mock-session-bundle' }));
  pb.send = mockSend as unknown as typeof pb.send;

  try {
    const res = await ticketService.createBundleCheckoutSession('bundle_1', 3, 'bundle@example.com', 'Jane Doe');
    assert.deepEqual(res, { url: 'mock-url-bundle', sessionId: 'mock-session-bundle' });
    assert.equal(mockSend.mock.callCount(), 1);
    assert.equal(mockSend.mock.calls[0].arguments[0], '/api/checkout/create-bundle-session');
    assert.deepEqual(mockSend.mock.calls[0].arguments[1], {
      method: 'POST',
      body: { bundleId: 'bundle_1', quantity: 3, email: 'bundle@example.com', name: 'Jane Doe' }
    });
  } finally {
    pb.send = originalSend;
  }
});

test('ticketService.pollForPurchaseRecord finds record on first try', async (t) => {
  const originalCollection = pb.collection;
  const originalFilter = pb.filter;
  const mockRecord = { id: 'purchase_1' } as TicketPurchase;

  const mockGetFirstListItem = t.mock.fn(async () => mockRecord);
  const mockFilter = t.mock.fn(() => 'stripeSessionId = "session_1"');

  pb.collection = function (name: string) {
    if (name === 'ticketPurchases') {
      return { getFirstListItem: mockGetFirstListItem } as unknown as ReturnType<typeof pb.collection>;
    }
    return originalCollection.call(pb, name);
  };
  pb.filter = mockFilter as unknown as typeof pb.filter;

  try {
    const res = await ticketService.pollForPurchaseRecord('session_1', 3, 10);
    assert.deepEqual(res, mockRecord);
    assert.equal(mockGetFirstListItem.mock.callCount(), 1);
    assert.equal(mockFilter.mock.callCount(), 1);
    assert.equal(mockFilter.mock.calls[0].arguments[0], 'stripeSessionId = {:sessionId}');
    assert.deepEqual(mockFilter.mock.calls[0].arguments[1], { sessionId: 'session_1' });
    assert.equal(mockGetFirstListItem.mock.calls[0].arguments[0], 'stripeSessionId = "session_1"');
    assert.deepEqual(mockGetFirstListItem.mock.calls[0].arguments[1], { expand: 'event,bundle' });
  } finally {
    pb.collection = originalCollection;
    pb.filter = originalFilter;
  }
});

test('ticketService.pollForPurchaseRecord retries and eventually fails', async (t) => {
  const originalCollection = pb.collection;
  const originalFilter = pb.filter;

  const mockGetFirstListItem = t.mock.fn(async () => {
    throw new Error('Not found');
  });

  pb.collection = function (name: string) {
    if (name === 'ticketPurchases') {
      return { getFirstListItem: mockGetFirstListItem } as unknown as ReturnType<typeof pb.collection>;
    }
    return originalCollection.call(pb, name);
  };
  pb.filter = (() => 'filter') as unknown as typeof pb.filter;

  try {
    const res = await ticketService.pollForPurchaseRecord('session_error', 2, 5);
    assert.equal(res, null);
    assert.equal(mockGetFirstListItem.mock.callCount(), 2);
  } finally {
    pb.collection = originalCollection;
    pb.filter = originalFilter;
  }
});

test('ticketService.getPurchasesForEvent returns list', async (t) => {
  const originalCollection = pb.collection;
  const originalFilter = pb.filter;
  const mockRecords = [{ id: 'purchase_1' }] as TicketPurchase[];

  const mockGetFullList = t.mock.fn(async () => mockRecords);
  const mockFilter = t.mock.fn(() => 'event = "evt_1"');

  pb.collection = function (name: string) {
    if (name === 'ticketPurchases') {
      return { getFullList: mockGetFullList } as unknown as ReturnType<typeof pb.collection>;
    }
    return originalCollection.call(pb, name);
  };
  pb.filter = mockFilter as unknown as typeof pb.filter;

  try {
    const res = await ticketService.getPurchasesForEvent('evt_1');
    assert.deepEqual(res, mockRecords);
    assert.equal(mockGetFullList.mock.callCount(), 1);
    assert.equal(mockFilter.mock.callCount(), 1);
    assert.equal(mockFilter.mock.calls[0].arguments[0], 'event = {:eventId}');
    assert.deepEqual(mockFilter.mock.calls[0].arguments[1], { eventId: 'evt_1' });
    assert.deepEqual(mockGetFullList.mock.calls[0].arguments[0], {
      filter: 'event = "evt_1"',
      sort: 'buyerName',
      expand: 'event,bundle'
    });
  } finally {
    pb.collection = originalCollection;
    pb.filter = originalFilter;
  }
});

test('ticketService.getPurchasesForProfile returns list', async (t) => {
  const originalCollection = pb.collection;
  const originalFilter = pb.filter;
  const mockRecords = [{ id: 'purchase_2' }] as TicketPurchase[];

  const mockGetFullList = t.mock.fn(async () => mockRecords);
  const mockFilter = t.mock.fn(() => 'profile = "prof_1"');

  pb.collection = function (name: string) {
    if (name === 'ticketPurchases') {
      return { getFullList: mockGetFullList } as unknown as ReturnType<typeof pb.collection>;
    }
    return originalCollection.call(pb, name);
  };
  pb.filter = mockFilter as unknown as typeof pb.filter;

  try {
    const res = await ticketService.getPurchasesForProfile('prof_1');
    assert.deepEqual(res, mockRecords);
    assert.equal(mockGetFullList.mock.callCount(), 1);
    assert.equal(mockFilter.mock.callCount(), 1);
    assert.equal(mockFilter.mock.calls[0].arguments[0], 'profile = {:profileId}');
    assert.deepEqual(mockFilter.mock.calls[0].arguments[1], { profileId: 'prof_1' });
    assert.deepEqual(mockGetFullList.mock.calls[0].arguments[0], {
      filter: 'profile = "prof_1"',
      sort: '-created',
      expand: 'event,bundle'
    });
  } finally {
    pb.collection = originalCollection;
    pb.filter = originalFilter;
  }
});

test('ticketService.getAllPurchases returns list', async (t) => {
  const originalCollection = pb.collection;
  const mockRecords = [{ id: 'purchase_3' }] as TicketPurchase[];

  const mockGetFullList = t.mock.fn(async () => mockRecords);

  pb.collection = function (name: string) {
    if (name === 'ticketPurchases') {
      return { getFullList: mockGetFullList } as unknown as ReturnType<typeof pb.collection>;
    }
    return originalCollection.call(pb, name);
  };

  try {
    const res = await ticketService.getAllPurchases();
    assert.deepEqual(res, mockRecords);
    assert.equal(mockGetFullList.mock.callCount(), 1);
    assert.deepEqual(mockGetFullList.mock.calls[0].arguments[0], {
      sort: '-created',
      expand: 'event,bundle'
    });
  } finally {
    pb.collection = originalCollection;
  }
});

test('ticketService.adminRefundTicket calls pb.send', async (t) => {
  const originalSend = pb.send;
  const mockSend = t.mock.fn(async () => ({ success: true }));
  pb.send = mockSend as unknown as typeof pb.send;

  try {
    const res = await ticketService.adminRefundTicket('pur_1');
    assert.deepEqual(res, { success: true });
    assert.equal(mockSend.mock.callCount(), 1);
    assert.equal(mockSend.mock.calls[0].arguments[0], '/api/admin/refund-ticket');
    assert.deepEqual(mockSend.mock.calls[0].arguments[1], {
      method: 'POST',
      body: { purchaseId: 'pur_1' }
    });
  } finally {
    pb.send = originalSend;
  }
});

test('ticketService.adminRefundBundle calls pb.send', async (t) => {
  const originalSend = pb.send;
  const mockSend = t.mock.fn(async () => ({ success: true }));
  pb.send = mockSend as unknown as typeof pb.send;

  try {
    const res = await ticketService.adminRefundBundle('pi_123');
    assert.deepEqual(res, { success: true });
    assert.equal(mockSend.mock.callCount(), 1);
    assert.equal(mockSend.mock.calls[0].arguments[0], '/api/admin/refund-bundle');
    assert.deepEqual(mockSend.mock.calls[0].arguments[1], {
      method: 'POST',
      body: { paymentIntentId: 'pi_123' }
    });
  } finally {
    pb.send = originalSend;
  }
});
