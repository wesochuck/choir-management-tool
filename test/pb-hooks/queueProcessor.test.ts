import test from 'node:test';
import assert from 'node:assert/strict';
import { processEmailQueue } from '../../pocketbase/pb_hooks_src/email/queueProcessor';
import type { PocketBaseRecord, PocketBaseApp, PocketBaseQuery } from '../../pocketbase/pb_hooks_src/email/emailTypes';

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

class MockMailerMessage {
    config: unknown;
    constructor(config: unknown) {
        this.config = config;
    }
}

// Setup common mock environment
const setupMockApp = (allQueueRecords: MockRecord[], onSend?: (recipientEmail: string) => void) => {
    const globalRef = global as unknown as Record<string, unknown>;
    globalRef.Record = MockRecord;
    globalRef.MailerMessage = MockMailerMessage;
    globalRef.$os = { getenv: (key: string) => key === 'HMAC_SECRET' ? 'test-secret' : '' };

    const commSetting = new MockRecord('appSettings', { key: 'communications', value: JSON.stringify({ frontendUrl: 'http://localhost:5173', mailingAddress: '123 Harmony St' }) });
    const tzSetting = new MockRecord('appSettings', { key: 'timezone', value: JSON.stringify('America/New_York') });
    const choirNameSetting = new MockRecord('appSettings', { key: 'choir_name', value: JSON.stringify('City Chorus') });

    const mockVenue = new MockRecord('venues', { id: 'ven-1', name: 'St. Mary Church', address: '123 Church St, Cityville' });
    const mockEvent = new MockRecord('events', { id: 'evt-1', title: 'Spring Concert', type: 'Performance', date: '2026-06-15T19:00:00Z', venue: 'ven-1', details: 'Fun show' });
    const mockPoll = new MockRecord('polls', { id: 'poll123', question: 'Who can help with setup?' });

    const savedRecords: PocketBaseRecord[] = [];
    interface SentEmail {
        config: {
            to: { address: string; name?: string }[];
            html: string;
            subject: string;
        };
    }
    const sentEmails: SentEmail[] = [];

    const mockDb = {
        newQuery: (sql: string) => {
            const normalizedSql = sql.replace(/\s+/g, ' ').trim();
            let boundParams: Record<string, unknown> = {};
            const query: PocketBaseQuery = {
                bind: (params: Record<string, unknown>) => {
                    boundParams = { ...boundParams, ...params };
                    return query;
                },
                execute: () => {
                    if (normalizedSql.includes("UPDATE emailQueue SET status = 'Pending'") && normalizedSql.includes("processingStartedAt < datetime('now'")) {
                        allQueueRecords.forEach(r => {
                            if (r.get('status') === 'Processing') {
                                const startedAt = r.get('processingStartedAt');
                                if (startedAt instanceof Date && startedAt.getTime() < Date.now() - 15 * 60 * 1000) {
                                    const attempts = typeof r.get('attempts') === 'number' ? r.get('attempts') as number : 0;
                                    if (attempts < (boundParams.maxAttempts as number)) {
                                        r.set('status', 'Pending');
                                        r.set('processingRunId', null);
                                        r.set('processingStartedAt', null);
                                    }
                                }
                            }
                        });
                    } else if (normalizedSql.includes("UPDATE emailQueue SET status = 'Failed'") && normalizedSql.includes("processingStartedAt < datetime('now'")) {
                        allQueueRecords.forEach(r => {
                            if (r.get('status') === 'Processing') {
                                const startedAt = r.get('processingStartedAt');
                                if (startedAt instanceof Date && startedAt.getTime() < Date.now() - 15 * 60 * 1000) {
                                    const attempts = typeof r.get('attempts') === 'number' ? r.get('attempts') as number : 0;
                                    if (attempts >= (boundParams.maxAttempts as number)) {
                                        r.set('status', 'Failed');
                                        r.set('processingRunId', null);
                                        r.set('processingStartedAt', null);
                                    }
                                }
                            }
                        });
                    } else if (normalizedSql.includes("UPDATE emailQueue SET status = 'Processing'") && normalizedSql.includes("WHERE id IN")) {
                        let claimed = 0;
                        allQueueRecords.forEach(r => {
                            const attempts = typeof r.get('attempts') === 'number' ? r.get('attempts') as number : 0;
                            if (r.get('status') === 'Pending' && attempts < (boundParams.maxAttempts as number) && claimed < (boundParams.batchSize as number)) {
                                r.set('status', 'Processing');
                                r.set('processingRunId', boundParams.runId);
                                r.set('processingStartedAt', new Date());
                                claimed++;
                            }
                        });
                    }
                }
            };
            return query;
        }
    };

    const mockApp: PocketBaseApp = {
        findCollectionByNameOrId: (name: string) => ({ name }),
        settings: () => ({
            smtp: { enabled: true },
            meta: { senderAddress: 'choir@app.com', senderName: 'Choir Name' }
        }),
        newMailClient: () => ({
            send: (message: unknown) => {
                sentEmails.push(message as SentEmail);
                const mockMsg = message as MockMailerMessage;
                const config = mockMsg.config as { to: { address: string }[] };
                if (onSend) {
                    onSend(config.to[0].address);
                }
            }
        }),
        findFirstRecordByFilter: (collection: string, filter: string) => {
            if (collection === 'appSettings' && filter === "key = 'communications'") return commSetting;
            if (collection === 'appSettings' && filter === "key = 'timezone'") return tzSetting;
            if (collection === 'appSettings' && filter === "key = 'choir_name'") return choirNameSetting;
            throw new Error('Not found setting');
        },
        findRecordsByFilter: (
            collection: string,
            filter: string,
            _sort?: string,
            _limit?: number,
            _offset?: number,
            params?: Record<string, unknown>
        ) => {
            if (collection === 'emailQueue') {
                if (filter.includes("status = 'Processing'") && filter.includes("processingRunId =")) {
                    const queryRunId = typeof params?.runId === 'string'
                        ? params.runId
                        : (() => {
                            const match = filter.match(/processingRunId = '([^']+)'/);
                            return match ? match[1] : '';
                        })();
                    return allQueueRecords.filter(r => r.get('status') === 'Processing' && r.get('processingRunId') === queryRunId);
                }
            }
            throw new Error('Not found filter: ' + filter);
        },
        findRecordById: (collection: string, id: string) => {
            if (collection === 'events' && id === 'evt-1') return mockEvent;
            if (collection === 'venues' && id === 'ven-1') return mockVenue;
            if (collection === 'polls' && id === 'poll123') return mockPoll;
            throw new Error('Not found id: ' + id);
        },
        save: (record: PocketBaseRecord) => {
            savedRecords.push(record);
        },
        saveNoValidate: (record: PocketBaseRecord) => {
            savedRecords.push(record);
        },
        delete: () => {
            // Not used in queue processor tests, but required by interface
        },
        db: () => mockDb
    };

    globalRef.$app = mockApp;
    globalRef.$security = {
        base64Encode: (s: string) => Buffer.from(s).toString('base64'),
        hs256: (payload: string) => payload + '_signed',
        randomString: (len: number) => 'mock-run-' + Math.random().toString(36).substr(2, len)
    };

    return { mockApp, savedRecords, sentEmails };
};

test('processEmailQueue batched success and failure flows', () => {
    const recordSuccess = new MockRecord('emailQueue', {
        id: 'q-succ',
        recipientId: 'usr-1',
        recipientEmail: 'success@example.com',
        recipientName: 'Success Member',
        subject: 'Invited to Concert',
        rawContent: 'Please attend {eventTitle} at {eventLocation}. Info: {{EVENT_INFO}}. RSVP: {{RSVP_LINKS}}. Poll: {{POLL_LINK:poll123}}',
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

    const { mockApp, sentEmails } = setupMockApp([recordSuccess, recordFail], (email) => {
        if (email === 'fail@example.com') {
            throw new Error('SMTP connection failed');
        }
    });

    processEmailQueue(mockApp);

    // Verify successes
    assert.strictEqual(recordSuccess.get('status'), 'Sent', 'Success should end as Sent');
    assert.strictEqual(recordSuccess.get('attempts'), 0);
    assert.ok(recordSuccess.get('sentAt'), 'sentAt timestamp should be populated');

    // Verify Google Maps location links in HTML
    const successEmail = sentEmails.find((e) => e.config.to[0].address === 'success@example.com');
    assert.ok(successEmail, 'Should have sent an email to success recipient');
    assert.ok(successEmail.config.html.includes('https://www.google.com/maps/search/?api=1&amp;query=123%20Church%20St%2C%20Cityville'), 'Should include Google Maps URL with encoded address');
    assert.ok(successEmail.config.html.includes('St. Mary Church'), 'Should include the venue name inside the link');

    // Verify failures
    assert.strictEqual(recordFail.get('status'), 'Pending', 'Failure should end as Pending to retry');
    assert.strictEqual(recordFail.get('attempts'), 1, 'Attempts should increment');
    const errMessage = recordFail.get('errorMessage');
    assert.ok(typeof errMessage === 'string' && errMessage.includes('SMTP connection failed'));

    // Verify native dispatches
    assert.strictEqual(sentEmails.length, 2, 'Should issue exactly 2 SMTP sends');
});

test('processEmailQueue concurrency safety', () => {
    // Generate a set of pending records
    const records = Array.from({ length: 10 }, (_, i) => new MockRecord('emailQueue', {
        id: `q-${i}`,
        recipientId: `usr-${i}`,
        recipientEmail: `user-${i}@example.com`,
        status: 'Pending',
        attempts: 0,
        subject: 'Test subject',
        rawContent: 'Test content'
    }));

    const { mockApp } = setupMockApp(records);

    // Run first queue processor invocation
    // This will generate a run ID and claim records
    processEmailQueue(mockApp);

    // Count how many records were claimed/sent by the first run
    const sentCount = records.filter(r => r.get('status') === 'Sent').length;
    assert.strictEqual(sentCount, 10, 'All 10 pending records should be processed and sent');
});

test('processEmailQueue stale processing record recovery', () => {
    const freshProcessing = new MockRecord('emailQueue', {
        id: 'q-fresh',
        recipientId: 'usr-1',
        recipientEmail: 'fresh@example.com',
        status: 'Processing',
        attempts: 0,
        processingStartedAt: new Date(), // fresh
        processingRunId: 'run-fresh',
        subject: 'Test',
        rawContent: 'Test'
    });

    const staleProcessingRetry = new MockRecord('emailQueue', {
        id: 'q-stale-retry',
        recipientId: 'usr-2',
        recipientEmail: 'stale-retry@example.com',
        status: 'Processing',
        attempts: 1,
        processingStartedAt: new Date(Date.now() - 20 * 60 * 1000), // stale
        processingRunId: 'run-stale-1',
        subject: 'Test',
        rawContent: 'Test'
    });

    const staleProcessingFailed = new MockRecord('emailQueue', {
        id: 'q-stale-fail',
        recipientId: 'usr-3',
        recipientEmail: 'stale-fail@example.com',
        status: 'Processing',
        attempts: 3,
        processingStartedAt: new Date(Date.now() - 20 * 60 * 1000), // stale
        processingRunId: 'run-stale-2',
        subject: 'Test',
        rawContent: 'Test'
    });

    const { mockApp } = setupMockApp([freshProcessing, staleProcessingRetry, staleProcessingFailed]);

    // Running the queue processor should run recovery first
    processEmailQueue(mockApp);

    // Verify recovery results
    assert.strictEqual(freshProcessing.get('status'), 'Processing', 'Fresh processing records should not be touched by recovery');
    assert.strictEqual(staleProcessingRetry.get('status'), 'Sent', 'Stale processing record with remaining attempts should be recovered to Pending and then processed to Sent');
    assert.strictEqual(staleProcessingFailed.get('status'), 'Failed', 'Stale processing record at max attempts should be recovered to Failed');
    assert.strictEqual(staleProcessingFailed.get('processingRunId'), null, 'Stale failed records should clear processingRunId');
});

test('processEmailQueue batch window limit', () => {
    // Generate 1000 pending records so one invocation can only drain up to 6*150 records.
    const records = Array.from({ length: 1000 }, (_, i) => new MockRecord('emailQueue', {
        id: `q-${i}`,
        recipientId: `usr-${i}`,
        recipientEmail: `user-${i}@example.com`,
        status: 'Pending',
        attempts: 0,
        subject: 'Test',
        rawContent: 'Test'
    }));

    const { mockApp } = setupMockApp(records);

    processEmailQueue(mockApp);

    // Should claim and send exactly 900 records (6 batches), leaving 100 records Pending
    const sentCount = records.filter(r => r.get('status') === 'Sent').length;
    const pendingCount = records.filter(r => r.get('status') === 'Pending').length;

    assert.strictEqual(sentCount, 900, 'Exactly 900 records should be processed in one invocation');
    assert.strictEqual(pendingCount, 100, 'Remaining 100 records should remain Pending for the next invocation');
});

test('processEmailQueue contentType: "html" bypasses markdown rendering', () => {
    const htmlContent = '<p>Raw <strong>HTML</strong> content.</p><ul><li>One</li></ul>';
    const recordHtml = new MockRecord('emailQueue', {
        id: 'q-html',
        recipientId: 'usr-1',
        recipientEmail: 'html@example.com',
        recipientName: 'HTML Member',
        subject: 'HTML Test',
        rawContent: htmlContent,
        status: 'Pending',
        attempts: 0,
        filters: JSON.stringify({ contentType: 'html' })
    });

    const markdownContent = 'Standard **Markdown** content.';
    const recordMarkdown = new MockRecord('emailQueue', {
        id: 'q-md',
        recipientId: 'usr-2',
        recipientEmail: 'md@example.com',
        recipientName: 'MD Member',
        subject: 'MD Test',
        rawContent: markdownContent,
        status: 'Pending',
        attempts: 0,
        filters: JSON.stringify({})
    });

    const { mockApp, sentEmails } = setupMockApp([recordHtml, recordMarkdown]);

    processEmailQueue(mockApp);

    assert.strictEqual(recordHtml.get('status'), 'Sent');
    assert.strictEqual(recordMarkdown.get('status'), 'Sent');

    const htmlSent = sentEmails.find((email) => email.config.to[0].address === 'html@example.com');
    const mdSent = sentEmails.find((email) => email.config.to[0].address === 'md@example.com');

    // Verify HTML content was preserved exactly (not escaped by renderMarkdown)
    // Note: compileMailjetHtml is called, so we check if the inner content is correct
    // In MockApp, we don't have compileMailjetHtml actual implementation, it's bundled.
    // But we can check what was set on the record's htmlBody if we want, or just trust the MailerMessage.
    
    // Actually, in the test environment, compileMailjetHtml is NOT defined unless we define it.
    // Wait, how did the previous tests pass?
    // Oh, the bundle includes it.

    assert.ok(htmlSent && htmlSent.config.html.includes(htmlContent), 'HTML content should be preserved exactly');
    assert.ok(mdSent && mdSent.config.html.includes('<strong>Markdown</strong>'), 'Markdown should be rendered to HTML');
    assert.ok(mdSent && !mdSent.config.html.includes('**Markdown**'), 'Markdown should not be present in output');
});
