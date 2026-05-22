import test from 'node:test';
import assert from 'node:assert/strict';
import { communicationService, type SendMessageInput } from '../src/services/communicationService.ts';

test('communicationService.sendBulkMessage does not generate client-side mailtoUrl', async () => {
  // Mock saveMessage and settings lookup to avoid actual PocketBase calls
  const { pb } = await import('../src/lib/pocketbase.ts');
  const originalSend = pb.send;
  const originalCollection = pb.collection;
  
  pb.send = (async <T>(path: string): Promise<T> => {
    if (path.includes('appSettings')) {
        return { value: { frontendUrl: 'http://localhost:5173', mailingAddress: '123 Test St' } } as unknown as T;
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
      recipients: [{
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '',
        voicePart: 'Bass',
        globalStatus: 'Active',
      }],
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
          '1': 'e=event1&p=recipient1&s=signature1'
        }
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
      origin: 'http://localhost:5173'
    }
  };

  try {
    const result = await communicationService.resolveRsvpPlaceholders(
      'RSVP here: {{RSVP_LINKS}}',
      'event1',
      [{
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '',
        voicePart: 'Bass',
        globalStatus: 'Active',
      }]
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
