import test from 'node:test';
import assert from 'node:assert/strict';
import { communicationService } from '../src/services/communicationService.ts';
import type { SendOptions } from 'pocketbase';

test('communicationService.sendBulkMessage does not generate client-side mailtoUrl', async () => {
  // Mock saveMessage to avoid actual PocketBase calls during testing
  const originalSaveMessage = communicationService.saveMessage;
  communicationService.saveMessage = async (data) => ({
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
    sender: 'user_test_1',
  });

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
        voicePart: '',
        globalStatus: 'Active',
      },
    });

    assert.equal(result.mailtoUrl, '');
    assert.equal(result.message.subject, 'Test Subject');
  } finally {
    communicationService.saveMessage = originalSaveMessage;
  }
});

test('communicationService.resolveRsvpPlaceholders URL-encodes tokens in generated links', async () => {
  const { pb } = await import('../src/lib/pocketbase.ts');
  const originalSend = pb.send;
  pb.send = (async <T>(path: string, options?: SendOptions): Promise<T> => {
    if (path === '/api/generate-rsvp-tokens') {
      return {
        tokens: {
          '1': 'e=event1&p=recipient1&s=signature1'
        }
      } as unknown as T;
    }
    return originalSend.call(pb, path, options || {}) as Promise<T>;
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
