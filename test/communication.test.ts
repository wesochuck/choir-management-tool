import test from 'node:test';
import assert from 'node:assert/strict';
import {
  communicationService,
  type SendMessageInput,
} from '../src/services/communicationService.ts';
import { renderMarkdown, resolvePreviewContent } from '../src/lib/communicationUtils.ts';

test('communicationService.sendBulkMessage does not generate client-side mailtoUrl', async () => {
  // Mock saveMessage and settings lookup to avoid actual PocketBase calls
  const { pb } = await import('../src/lib/pocketbase.ts');
  const originalSend = pb.send;
  const originalCollection = pb.collection;

  pb.send = (async <T>(path: string): Promise<T> => {
    if (path.includes('appSettings')) {
      return {
        value: { frontendUrl: 'http://localhost:5173', mailingAddress: '123 Test St' },
      } as unknown as T;
    }
    return {} as T;
  }) as typeof pb.send;

  const mockMessage = (data: SendMessageInput) => ({
    id: 'msg_test_1',
    collectionId: 'pbc_messages_001',
    collectionName: 'messages',
    created: '2026-05-19T00:00:00Z',
    updated: '2026-05-19T00:00:00Z',
    subject: data.subject,
    content: data.content,
    type: data.type,
    recipients: data.recipients,
    filters: data.filters,
    status: data.status || 'Sent',
    sender: 'user_test_1',
  });

  pb.collection = ((name: string) => {
    if (name === 'messages') {
      return {
        create: async (data: SendMessageInput) => mockMessage(data),
        update: async (_id: string, data: SendMessageInput) => mockMessage(data),
      };
    }
    return originalCollection.call(pb, name);
  }) as unknown as typeof pb.collection;

  try {
    const result = await communicationService.sendBulkMessage({
      subject: 'Test Subject',
      content: 'Hello World',
      type: 'Email',
      recipients: [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '',
          voicePart: 'Bass',
          globalStatus: 'Active',
        },
      ],
      filters: {
        eventId: '',
        rsvp: 'All',
        voiceParts: [],
        globalStatus: 'Active',
      },
    });

    assert.equal(result.mailtoUrl, '');
    assert.equal(result.message.subject, 'Test Subject');
    assert.equal(result.message.status, 'Sent');
  } finally {
    pb.send = originalSend;
    pb.collection = originalCollection;
  }
});

test('communicationService.resolveRsvpPlaceholders URL-encodes tokens in generated links', async () => {
  const { pb } = await import('../src/lib/pocketbase.ts');
  const originalSend = pb.send;

  pb.send = (async <T>(path: string): Promise<T> => {
    if (path === '/api/generate-rsvp-tokens') {
      return {
        tokens: {
          '1': 'e=event1&p=recipient1&s=signature1',
        },
      } as unknown as T;
    }
    if (path.includes('appSettings')) {
      return { value: { frontendUrl: 'http://localhost:5173' } } as unknown as T;
    }
    return {} as T;
  }) as typeof pb.send;

  // Mock global window object
  const originalWindow = (globalThis as Record<string, unknown>).window;
  (globalThis as Record<string, unknown>).window = {
    location: {
      origin: 'http://localhost:5173',
    },
  };

  try {
    const result = await communicationService.resolveRsvpPlaceholders(
      'RSVP here: {{RSVP_LINKS}}',
      'event1',
      [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '',
          voicePart: 'Bass',
          globalStatus: 'Active',
        },
      ]
    );

    const expectedToken = encodeURIComponent('e=event1&p=recipient1&s=signature1');
    assert.match(result.previewContent, new RegExp(`token=${expectedToken}`));
  } finally {
    pb.send = originalSend;
    if (originalWindow === undefined) {
      delete (globalThis as Record<string, unknown>).window;
    } else {
      (globalThis as Record<string, unknown>).window = originalWindow;
    }
  }
});

test('frontend renderMarkdown - link security whitelisting and escaping', () => {
  // Safe protocols should render as links
  const safeHttps = renderMarkdown('[Google](https://google.com)');
  assert.ok(safeHttps.includes('<a href="https://google.com"'));

  const safeMailto = renderMarkdown('[Mail Us](mailto:info@choir.org)');
  assert.ok(safeMailto.includes('<a href="mailto:info@choir.org"'));

  // Unsafe protocols should be stripped, rendering only the text
  const unsafeJs = renderMarkdown('[Attack](javascript:alert(1))');
  assert.ok(!unsafeJs.includes('<a href='));
  assert.ok(unsafeJs.includes('Attack'));

  // Attribute escaping
  const escapeQuotes = renderMarkdown('[Injection](https://google.com" onclick="alert(1))');
  assert.ok(escapeQuotes.includes('&quot;'));
  assert.ok(!escapeQuotes.includes('onclick="alert(1)"'));
});

test('frontend renderMarkdown - headings and ordered lists', () => {
  // Headings
  const h1 = renderMarkdown('# Heading 1');
  assert.ok(h1.includes('<h1'));
  assert.ok(h1.includes('Heading 1'));

  const h2 = renderMarkdown('## Heading 2');
  assert.ok(h2.includes('<h2'));
  assert.ok(h2.includes('Heading 2'));

  // Ordered Lists
  const ol = renderMarkdown('1. First item\n2. Second item');
  assert.ok(ol.includes('<ol'));
  assert.ok(ol.includes('<li>First item</li>'));
  assert.ok(ol.includes('<li>Second item</li>'));
  assert.ok(ol.includes('</ol>'));

  // Mixed Lists
  const mixed = renderMarkdown('* Unordered\n1. Ordered');
  assert.ok(mixed.includes('<ul'));
  assert.ok(mixed.includes('</ul>'));
  assert.ok(mixed.includes('<ol'));
  assert.ok(mixed.includes('</ol>'));
});

test('communicationService.getMessagesPaginated calls pocketbase with expected limits', async () => {
  const { pb } = await import('../src/lib/pocketbase.ts');
  const originalCollection = pb.collection;

  const mockGetList = async (page: number, perPage: number) => {
    return {
      page,
      perPage,
      totalItems: 12,
      totalPages: 3,
      items: [{ id: 'm1', subject: 'Paged Subject' }],
    };
  };

  pb.collection = ((name: string) => {
    if (name === 'messages') {
      return { getList: mockGetList };
    }
    return originalCollection.call(pb, name);
  }) as unknown as typeof pb.collection;

  try {
    const result = await communicationService.getMessagesPaginated(2, 5);
    assert.equal(result.page, 2);
    assert.equal(result.perPage, 5);
    assert.equal(result.totalPages, 3);
    assert.equal(result.items[0].subject, 'Paged Subject');
  } finally {
    pb.collection = originalCollection;
  }
});

test('frontend resolvePreviewContent - escapes dynamic fields for HTML', () => {
  const unsafeEvent = {
    title: '<script>alert("title")</script>',
    type: '<script>alert("type")</script>',
    date: '2026-05-19T00:00:00Z',
    details: '<script>alert("details")</script>',
    callTime: '',
    expand: {
      venue: {
        name: '<script>alert("venue")</script>',
        address: '',
      },
    },
  } as unknown as import('../src/services/eventService.ts').Event;
  const unsafeRecipient = {
    name: '<script>alert("name")</script>',
  } as unknown as import('../src/services/communicationService.ts').CommunicationRecipient;

  const template =
    'Name: {singerName}, Title: {eventTitle}, Type: {eventType}, Location: {eventLocation}, Details: {eventDetails}';

  // HTML mode should escape
  const htmlResult = resolvePreviewContent(template, unsafeEvent, unsafeRecipient, '', {}, true);

  assert.ok(!htmlResult.includes('<script>'), 'HTML output should not contain <script> tags');
  assert.ok(
    htmlResult.includes('&lt;script&gt;alert(&quot;title&quot;)&lt;/script&gt;'),
    'Title should be escaped'
  );
  assert.ok(
    htmlResult.includes('&lt;script&gt;alert(&quot;name&quot;)&lt;/script&gt;'),
    'Name should be escaped'
  );

  // Plain text mode should NOT escape (used for SMS/Subject)
  const plainResult = resolvePreviewContent(template, unsafeEvent, unsafeRecipient, '', {}, false);

  assert.ok(
    plainResult.includes('<script>alert("title")</script>'),
    'Plain text output should not be escaped'
  );
});

test('communicationService.resolveTicketBuyerRecipients filters and maps correctly', async () => {
  const { ticketService } = await import('../src/services/ticketService.ts');
  const originalGetPurchases = ticketService.getPurchasesForEvent;

  ticketService.getPurchasesForEvent = async (eventId: string) => {
    if (eventId === 'event-123') {
      return [
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
          quantity: 4,
        },
        {
          id: 'p4',
          status: 'refunded',
          buyerName: 'David',
          buyerEmail: 'david@example.com',
          quantity: 1,
        },
      ] as unknown as import('../src/services/ticketService.ts').TicketPurchase[];
    }
    return [];
  };

  try {
    const recipients = await communicationService.resolveTicketBuyerRecipients('event-123');

    assert.equal(recipients.length, 2);

    assert.equal(recipients[0].id, 'p1');
    assert.equal(recipients[0].email, 'alice@example.com');
    assert.equal(recipients[0].name, 'Alice <alice@example.com> (Qty: 2)');
    assert.equal(recipients[0].phone, '');
    assert.equal(recipients[0].voicePart, 'Ticket Buyer');
    assert.equal(recipients[0].globalStatus, 'Paid');

    assert.equal(recipients[1].id, 'p3');
    assert.equal(recipients[1].email, 'charlie@example.com');
    assert.equal(recipients[1].name, 'Charlie <charlie@example.com> (Qty: 4)');
    assert.equal(recipients[1].phone, '');
    assert.equal(recipients[1].voicePart, 'Ticket Buyer');
    assert.equal(recipients[1].globalStatus, 'Paid');
  } finally {
    ticketService.getPurchasesForEvent = originalGetPurchases;
  }
});

test('communicationService.wasMessageSent uses parameterized filters and returns correct boolean', async () => {
  const { pb } = await import('../src/lib/pocketbase.ts');
  const originalCollection = pb.collection;

  const seenFilters: string[] = [];
  const mockGetFullList = async <T>(options?: { filter?: string }): Promise<T[]> => {
    const filterStr = options?.filter || '';
    seenFilters.push(filterStr);
    if (
      filterStr.includes('event123') &&
      (filterStr.includes('Attendance Report') || filterStr.includes('Automated Report'))
    ) {
      return [{ id: 'm123', filters: { eventId: 'event123' } } as T];
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
    // 1. Test existing report sent check
    const sent = await communicationService.wasMessageSent({ eventId: 'event123', type: 'Report' });
    assert.equal(sent, true);
    assert.ok(
      seenFilters.some(
        (filterStr) =>
          filterStr.includes('Attendance Report') || filterStr.includes('Automated Report')
      )
    );
    assert.ok(seenFilters.some((filterStr) => filterStr.includes('event123')));

    // 2. Test unsent reminder check
    const unsent = await communicationService.wasMessageSent({
      eventId: 'event456',
      type: 'Reminder',
    });
    assert.equal(unsent, false);
  } finally {
    pb.collection = originalCollection;
  }
});
