import test from 'node:test';
import assert from 'node:assert/strict';
import { processEmailQueue } from '../../pocketbase/pb_hooks_src/email/queueProcessor';
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

// Mock MailerMessage class for Goja global scope simulation
class MockMailerMessage {
    config: unknown;
    constructor(config: unknown) {
        this.config = config;
    }
}

test('processEmailQueue batched success and failure flows', () => {
    // Setup globals
    const globalRef = global as unknown as Record<string, unknown>;
    globalRef.Record = MockRecord;
    globalRef.MailerMessage = MockMailerMessage;
    
    // Mock settings records
    const hmacSetting = new MockRecord('appSettings', { key: 'HMAC_SECRET', value: JSON.stringify({ secret: 'test-secret' }) });
    const commSetting = new MockRecord('appSettings', { key: 'communications', value: JSON.stringify({ frontendUrl: 'http://localhost:5173', mailingAddress: '123 Harmony St' }) });
    const tzSetting = new MockRecord('appSettings', { key: 'timezone', value: JSON.stringify('America/New_York') });

    // Mock event and venue
    const mockVenue = new MockRecord('venues', { id: 'ven-1', name: 'St. Mary Church' });
    const mockEvent = new MockRecord('events', { id: 'evt-1', title: 'Spring Concert', type: 'Performance', date: '2026-06-15T19:00:00Z', venue: 'ven-1', details: 'Fun show' });

    // Mock queue records
    const recordSuccess = new MockRecord('emailQueue', {
        id: 'q-succ',
        recipientId: 'usr-1',
        recipientEmail: 'success@example.com',
        recipientName: 'Success Member',
        subject: 'Invited to Concert',
        rawContent: 'Please attend {eventTitle} at {eventLocation}. Info: {{EVENT_INFO}}. RSVP: {{RSVP_LINKS}}',
        status: 'Pending',
        attempts: 0,
        filters: JSON.stringify({ eventId: 'evt-1' })
    });

    const recordFail = new MockRecord('emailQueue', {
        id: 'q-fail',
        recipientId: 'usr-2',
        recipientEmail: 'fail@example.com',
        recipientName: 'Fail Member',
        subject: 'Invited to Concert Fail',
        rawContent: 'Please attend {eventTitle} at {eventLocation}. Info: {{EVENT_INFO}}. RSVP: {{RSVP_LINKS}}',
        status: 'Pending',
        attempts: 0,
        filters: JSON.stringify({ eventId: 'evt-1' })
    });

    // Tracking
    const savedRecords: PocketBaseRecord[] = [];
    const sentEmails: unknown[] = [];

    // Mock App
    const mockApp: PocketBaseApp = {
        settings: () => ({
            smtp: { enabled: true },
            meta: { senderAddress: 'choir@app.com', senderName: 'Choir Name' }
        }),
        newMailClient: () => ({
            send: (message: unknown) => {
                sentEmails.push(message);
                const mockMsg = message as MockMailerMessage;
                const config = mockMsg.config as { to: { address: string }[] };
                if (config.to[0].address === 'fail@example.com') {
                    throw new Error('SMTP connection failed');
                }
            }
        }),
        findFirstRecordByFilter: (collection: string, filter: string) => {
            if (collection === 'appSettings' && filter === "key = 'communications'") return commSetting;
            if (collection === 'appSettings' && filter === "key = 'timezone'") return tzSetting;
            if (collection === 'appSettings' && filter === "key = 'HMAC_SECRET'") return hmacSetting;
            throw new Error('Not found setting');
        },
        findRecordsByFilter: (collection: string, filter: string) => {
            if (collection === 'emailQueue' && filter.includes('Pending')) {
                return [recordSuccess, recordFail];
            }
            throw new Error('Not found filter');
        },
        findRecordById: (collection: string, id: string) => {
            if (collection === 'events' && id === 'evt-1') return mockEvent;
            if (collection === 'venues' && id === 'ven-1') return mockVenue;
            throw new Error('Not found id: ' + id);
        },
        save: (record: PocketBaseRecord) => {
            savedRecords.push(record);
        }
    };

    // Attach mock $app and $security
    globalRef.$app = mockApp;
    globalRef.$security = {
        base64Encode: (s: string) => Buffer.from(s).toString('base64'),
        hs256: (payload: string, secret: string) => payload + '_signed'
    };

    // Run queue processor
    processEmailQueue(mockApp);

    // Verify state transition and saves
    assert.strictEqual(savedRecords.length, 4, 'Should save records during state transitions');

    // Verify successes
    assert.strictEqual(recordSuccess.get('status'), 'Sent', 'Success should end as Sent');
    assert.strictEqual(recordSuccess.get('attempts'), 0);

    // Verify failures
    assert.strictEqual(recordFail.get('status'), 'Pending', 'Failure should end as Pending to retry');
    assert.strictEqual(recordFail.get('attempts'), 1, 'Attempts should increment');
    
    const errMessage = recordFail.get('errorMessage');
    assert.ok(typeof errMessage === 'string' && errMessage.includes('SMTP connection failed'), 'Error message should capture SMTP connection failed');

    // Verify native dispatches
    assert.strictEqual(sentEmails.length, 2, 'Should issue exactly 2 SMTP sends');
    const successEmail = sentEmails.find(m => {
        const mockMsg = m as MockMailerMessage;
        const config = mockMsg.config as { to: { address: string }[] };
        return config.to[0].address === 'success@example.com';
    }) as MockMailerMessage;

    assert.ok(successEmail, 'Should have sent to success email');
    
    const config = successEmail.config as { from: { address: string; name: string }; subject: string; html: string };
    assert.strictEqual(config.from.address, 'choir@app.com');
    assert.strictEqual(config.from.name, 'Choir Name');
    assert.strictEqual(config.subject, 'Invited to Concert');

    const htmlPart = config.html;
    assert.ok(htmlPart.includes('St. Mary Church'), 'Should resolve {eventLocation}');
    assert.ok(htmlPart.includes('Spring Concert'), 'Should resolve {eventTitle}');
    assert.ok(htmlPart.includes('Yes, I\'m attending'), 'Should resolve RSVP buttons');
    assert.ok(htmlPart.includes('/rsvp?token='), 'Should compile RSVP signed tokens');
    assert.ok(htmlPart.includes('/unsubscribe?token='), 'Should compile unsubscribe signed tokens');
    assert.ok(htmlPart.includes('123 Harmony St'), 'Should include mailing address');
});
