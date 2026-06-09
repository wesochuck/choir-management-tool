import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldQueueMessage, enqueueBulkMessage } from '../../pocketbase/pb_hooks_src/email/messageHookRules';
import type { PocketBaseRecord, PocketBaseApp } from '../../pocketbase/pb_hooks_src/email/emailTypes';

// Mock PocketBase Record class
class MockRecord implements PocketBaseRecord {
    collection: string;
    data: Record<string, unknown>;
    id: string;
    constructor(collection: string, data: Record<string, unknown>) {
        this.collection = collection;
        this.data = data;
        this.id = (data.id as string) || 'rec-' + Math.random().toString(36).substr(2, 9);
    }
    get(field: string): unknown {
        return this.data[field];
    }
    set(field: string, val: unknown): void {
        this.data[field] = val;
    }
}

// Attach MockRecord to global scope to simulate pocketbase Goja VM
(global as unknown as Record<string, unknown>).Record = MockRecord;

function makeApp(savedRecords: PocketBaseRecord[] = []): PocketBaseApp {
  return {
    findCollectionByNameOrId: (_name: string) => ({ name: _name }),
    findFirstRecordByFilter: () => new MockRecord('settings', {}),
    findRecordsByFilter: () => [],
    findRecordById: () => new MockRecord('events', {}),
    save: (record: PocketBaseRecord) => { savedRecords.push(record); },
    settings: () => ({ smtp: { enabled: true }, meta: { senderAddress: 't', senderName: 't' } }),
    newMailClient: () => ({ send: () => {} }),
  };
}

test('shouldQueueMessage validation and transitions', () => {
    // Mock record helper
    const createRecord = (status: string, type: string): PocketBaseRecord => {
        return new MockRecord('messages', { status, type });
    };

    assert.strictEqual(shouldQueueMessage(null), false);
    assert.strictEqual(shouldQueueMessage(createRecord('Draft', 'Email')), false, 'Draft should not queue');
    assert.strictEqual(shouldQueueMessage(createRecord('Sent', 'SMS')), true, 'SMS only should queue');
    assert.strictEqual(shouldQueueMessage(createRecord('Sent', 'Email')), true, 'Sent Email should queue');
    assert.strictEqual(shouldQueueMessage(createRecord('Sent', 'Both')), true, 'Sent Both should queue');
    assert.strictEqual(shouldQueueMessage(createRecord('Failed', 'Email')), false, 'Failed Email should NOT queue automatically');
    assert.strictEqual(shouldQueueMessage(createRecord('Archived', 'Email')), false, 'Archived Email should NOT queue');

    // Test transition logic (create vs update checks)
    assert.strictEqual(shouldQueueMessage(createRecord('Sent', 'Email'), 'Draft'), true, 'Draft to Sent is allowed');
    assert.strictEqual(shouldQueueMessage(createRecord('Sent', 'Email'), 'Failed'), true, 'Failed to Sent is allowed (resend)');
    assert.strictEqual(shouldQueueMessage(createRecord('Sent', 'Email'), 'Sent'), false, 'Sent to Sent is blocked (duplicate protection)');
    assert.strictEqual(shouldQueueMessage(createRecord('Draft', 'Email'), 'Draft'), false, 'Draft to Draft is blocked');
});

test('enqueueBulkMessage creates email entries for type=Email', () => {
    const savedRecords: PocketBaseRecord[] = [];
    const mockApp = makeApp(savedRecords);

    const mockMessageRecord = new MockRecord('messages', {
        id: 'msg-email',
        type: 'Email',
        recipients: JSON.stringify([
            { id: 'usr-1', email: 'john@example.com', name: 'John Doe' },
            { id: 'usr-2', email: 'jane@example.com' },
            { id: 'usr-3' }
        ]),
        subject: 'Hello {singerName}!',
        content: 'This is a message body.',
        filters: JSON.stringify({ eventId: 'evt-1' })
    });

    enqueueBulkMessage(mockApp, mockMessageRecord);

    assert.strictEqual(savedRecords.length, 2, 'Email type creates 2 queue records');
    const rec1 = savedRecords[0];
    assert.strictEqual(rec1.get('messageRef'), 'msg-email');
    assert.strictEqual(rec1.get('recipientId'), 'usr-1');
    assert.strictEqual(rec1.get('recipientEmail'), 'john@example.com');
    assert.strictEqual(rec1.get('recipientName'), 'John Doe');
    assert.strictEqual(rec1.get('subject'), 'Hello {singerName}!');
    assert.strictEqual(rec1.get('rawContent'), 'This is a message body.');
    assert.strictEqual(rec1.get('status'), 'Pending');
    assert.strictEqual(rec1.get('attempts'), 0);
    assert.deepEqual(JSON.parse(rec1.get('filters') as string), { eventId: 'evt-1' });

    const rec2 = savedRecords[1];
    assert.strictEqual(rec2.get('recipientEmail'), 'jane@example.com');
    assert.strictEqual(rec2.get('recipientName'), 'Singer');
    assert.strictEqual(rec2.get('subject'), 'Hello {singerName}!');
});

test('enqueueBulkMessage creates SMS entries for type=SMS', () => {
    const savedRecords: PocketBaseRecord[] = [];
    const mockApp = makeApp(savedRecords);

    const mockMessageRecord = new MockRecord('messages', {
        id: 'msg-sms',
        type: 'SMS',
        recipients: JSON.stringify([
            { id: 'usr-1', name: 'John Doe', phone: '555-123-4567' },
            { id: 'usr-2', phone: '+1 (212) 555-8901' },
            { id: 'usr-3', phone: '123' },
            { id: 'usr-4' }
        ]),
        subject: '',
        content: 'This is an SMS message body.',
        filters: JSON.stringify({})
    });

    enqueueBulkMessage(mockApp, mockMessageRecord);

    assert.strictEqual(savedRecords.length, 2, 'SMS type creates 2 queue records (2 valid phones, 1 too short, 1 missing)');

    const rec1 = savedRecords[0];
    assert.strictEqual(rec1.get('recipientId'), 'usr-1');
    assert.strictEqual(rec1.get('recipientEmail'), '5551234567@sms.smtp2go.com');
    assert.strictEqual(rec1.get('recipientName'), 'John Doe');
    assert.strictEqual(rec1.get('subject'), '');
    assert.strictEqual(rec1.get('rawContent'), 'This is an SMS message body.');
    assert.strictEqual(rec1.get('status'), 'Pending');
    assert.strictEqual(rec1.get('attempts'), 0);
    const f1 = JSON.parse(rec1.get('filters') as string);
    assert.strictEqual(f1.channel, 'sms');

    const rec2 = savedRecords[1];
    assert.strictEqual(rec2.get('recipientId'), 'usr-2');
    assert.strictEqual(rec2.get('recipientEmail'), '2125558901@sms.smtp2go.com');
    assert.strictEqual(rec2.get('recipientName'), 'Singer');
    assert.strictEqual(rec2.get('rawContent'), 'This is an SMS message body.');
    assert.strictEqual(rec2.get('subject'), '');
    const f2 = JSON.parse(rec2.get('filters') as string);
    assert.strictEqual(f2.channel, 'sms');
});

test('enqueueBulkMessage creates both SMS and email entries for type=Both', () => {
    const savedRecords: PocketBaseRecord[] = [];
    const mockApp = makeApp(savedRecords);

    const mockMessageRecord = new MockRecord('messages', {
        id: 'msg-both',
        type: 'Both',
        recipients: JSON.stringify([
            { id: 'usr-1', name: 'John Doe', email: 'john@example.com', phone: '555-123-4567' },
            { id: 'usr-2', email: 'jane@example.com', phone: '212-555-8901' },
            { id: 'usr-3', email: 'no-phone@example.com' }
        ]),
        subject: 'Hello!',
        content: 'This is a message sent to Both channels.',
        filters: JSON.stringify({ eventId: 'evt-1' })
    });

    enqueueBulkMessage(mockApp, mockMessageRecord);

    assert.strictEqual(savedRecords.length, 5, 'Both type creates 5 records: 2 SMS + 3 email');

    const smsRecords = savedRecords.filter((r) => {
      const f = JSON.parse(r.get('filters') as string);
      return f.channel === 'sms';
    });
    const emailRecords = savedRecords.filter((r) => {
      const f = JSON.parse(r.get('filters') as string);
      return !f.channel;
    });

    assert.strictEqual(smsRecords.length, 2, '2 SMS entries for recipients with valid phones');
    assert.strictEqual(emailRecords.length, 3, '3 email entries for recipients with emails');

    assert.strictEqual(smsRecords[0].get('recipientId'), 'usr-1');
    assert.strictEqual(smsRecords[0].get('recipientEmail'), '5551234567@sms.smtp2go.com');
    assert.strictEqual(emailRecords[0].get('recipientId'), 'usr-1');
    assert.strictEqual(emailRecords[0].get('recipientEmail'), 'john@example.com');
});

test('enqueueBulkMessage truncates SMS content to 160 chars', () => {
    const savedRecords: PocketBaseRecord[] = [];
    const mockApp = makeApp(savedRecords);
    const longBody = 'A'.repeat(200);

    const mockMessageRecord = new MockRecord('messages', {
        id: 'msg-sms-trunc',
        type: 'SMS',
        recipients: JSON.stringify([{ id: 'usr-1', phone: '5551234567' }]),
        subject: '',
        content: longBody,
        filters: JSON.stringify({})
    });

    enqueueBulkMessage(mockApp, mockMessageRecord);

    assert.strictEqual(savedRecords.length, 1);
    const raw = savedRecords[0].get('rawContent') as string;
    assert.strictEqual(raw.length, 160, 'SMS body truncated to 160 chars');
    assert.strictEqual(raw[159], '…', 'Last char is ellipsis');
});
