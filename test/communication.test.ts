import test from 'node:test';
import assert from 'node:assert/strict';
import { communicationService } from '../src/services/communicationService.ts';

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
