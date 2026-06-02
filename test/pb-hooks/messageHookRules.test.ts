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

test('shouldQueueMessage validation and transitions', () => {
    // Mock record helper
    const createRecord = (status: string, type: string): PocketBaseRecord => {
        return new MockRecord('messages', { status, type });
    };

    assert.strictEqual(shouldQueueMessage(null), false);
    assert.strictEqual(shouldQueueMessage(createRecord('Draft', 'Email')), false, 'Draft should not queue');
    assert.strictEqual(shouldQueueMessage(createRecord('Sent', 'SMS')), false, 'SMS only should not queue');
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

test('enqueueBulkMessage explodes recipients', () => {
    const savedRecords: PocketBaseRecord[] = [];
    const mockApp: PocketBaseApp = {
        findCollectionByNameOrId: (name: string) => ({ name }),
        findFirstRecordByFilter: () => new MockRecord('settings', {}),
        findRecordsByFilter: () => [],
        findRecordById: () => new MockRecord('events', {}),
        save: (record: PocketBaseRecord) => {
            savedRecords.push(record);
        },
        settings: () => ({
            smtp: { enabled: true },
            meta: { senderAddress: 'choir@app.com', senderName: 'Choir Name' }
        }),
        newMailClient: () => ({
            send: () => {}
        })
    };

    const mockMessageRecord = new MockRecord('messages', {
        id: 'msg-123',
        recipients: JSON.stringify([
            { id: 'usr-1', email: 'john@example.com', name: 'John Doe' },
            { id: 'usr-2', email: 'jane@example.com' }, // No name
            { id: 'usr-3' } // No email, should skip
        ]),
        subject: 'Hello {singerName}!',
        content: 'This is a message body.',
        filters: JSON.stringify({ eventId: 'evt-1' })
    });

    enqueueBulkMessage(mockApp, mockMessageRecord);

    assert.strictEqual(savedRecords.length, 2, 'Should create exactly 2 queue records');
    
    // First record (John)
    const rec1 = savedRecords[0];
    assert.strictEqual(rec1.get('messageRef'), 'msg-123');
    assert.strictEqual(rec1.get('recipientId'), 'usr-1');
    assert.strictEqual(rec1.get('recipientEmail'), 'john@example.com');
    assert.strictEqual(rec1.get('recipientName'), 'John Doe');
    assert.strictEqual(rec1.get('subject'), 'Hello {singerName}!');
    assert.strictEqual(rec1.get('rawContent'), 'This is a message body.');
    assert.strictEqual(rec1.get('status'), 'Pending');
    assert.strictEqual(rec1.get('attempts'), 0);
    assert.deepEqual(JSON.parse(rec1.get('filters') as string), { eventId: 'evt-1' });

    // Second record (Jane - default name)
    const rec2 = savedRecords[1];
    assert.strictEqual(rec2.get('recipientEmail'), 'jane@example.com');
    assert.strictEqual(rec2.get('recipientName'), 'Singer');
    assert.strictEqual(rec2.get('subject'), 'Hello {singerName}!');
});
