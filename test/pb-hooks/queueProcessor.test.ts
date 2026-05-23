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

interface MockSendConfig {
    url: string;
    body: string;
    method: string;
    headers: Record<string, string>;
}

test('processEmailQueue batched success and failure flows', () => {
    // Setup globals
    (global as unknown as Record<string, unknown>).Record = MockRecord;
    
    // Mock settings records
    const hmacSetting = new MockRecord('appSettings', { key: 'HMAC_SECRET', value: JSON.stringify({ secret: 'test-secret' }) });
    const mailjetSetting = new MockRecord('appSettings', { key: 'mailjet', value: JSON.stringify({ apiKey: 'key123', apiSecret: 'sec456', senderEmail: 'choir@app.com', senderName: 'Choir Name' }) });
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
    const httpDispatches: MockSendConfig[] = [];

    // Mock App
    const mockApp: PocketBaseApp = {
        findFirstRecordByFilter: (collection: string, filter: string) => {
            if (collection === 'appSettings' && filter === "key = 'mailjet'") return mailjetSetting;
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

    // Attach mock $app
    (global as unknown as Record<string, unknown>).$app = mockApp;

    // Mock $security and $http
    (global as unknown as Record<string, unknown>).$security = {
        base64Encode: (s: string) => Buffer.from(s).toString('base64'),
        hs256: (payload: string, secret: string) => payload + '_signed'
    };

    (global as unknown as Record<string, unknown>).$http = {
        send: (config: MockSendConfig) => {
            httpDispatches.push(config);
            const isSuccess = config.body.includes('success@example.com');
            return {
                statusCode: isSuccess ? 200 : 500,
                text: isSuccess ? 'Success' : 'Internal Server Error'
            };
        }
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
    assert.ok(typeof errMessage === 'string' && errMessage.includes('500'), 'Error message should capture failure status code');

    // Verify HTTP REST configurations
    assert.strictEqual(httpDispatches.length, 2, 'Should issue exactly 2 Mailjet HTTP dispatches');
    const successDispatch = httpDispatches.find(d => d.body.includes('success@example.com'));
    assert.ok(successDispatch, 'Should have sent to success email');
    assert.strictEqual(successDispatch.method, 'POST');
    assert.strictEqual(successDispatch.url, 'https://api.mailjet.com/v3.1/send');
    assert.ok(successDispatch.headers['Authorization'].startsWith('Basic '), 'Should use basic authentication');

    // Verify template rendering in success dispatch HTML part
    const parsedBody = JSON.parse(successDispatch.body) as { Messages: Array<{ HTMLPart: string }> };
    const htmlPart = parsedBody.Messages[0].HTMLPart;
    assert.ok(htmlPart.includes('St. Mary Church'), 'Should resolve {eventLocation}');
    assert.ok(htmlPart.includes('Spring Concert'), 'Should resolve {eventTitle}');
    assert.ok(htmlPart.includes('Yes, I\'m attending'), 'Should resolve RSVP buttons');
    assert.ok(htmlPart.includes('/rsvp?token='), 'Should compile RSVP signed tokens');
    assert.ok(htmlPart.includes('/unsubscribe?token='), 'Should compile unsubscribe signed tokens');
    assert.ok(htmlPart.includes('123 Harmony St'), 'Should include mailing address');
});
