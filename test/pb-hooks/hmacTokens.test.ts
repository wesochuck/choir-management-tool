import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSignedPlayerToken, getHmacSecret, generateSignedEventRecipientToken, generateSignedAuditionToken } from '../../pocketbase/pb_hooks_src/hmacTokens.ts';
import type { PocketBaseApp } from '../../pocketbase/pb_hooks_src/email/emailTypes.ts';

// Mock PocketBase globals
const globalRecord = globalThis as Record<string, unknown>;

globalRecord.$security = {
    hs256: (payload: string, secret: string) => `sig_${payload}_${secret}`
};

const mockApp = {
    findFirstRecordByFilter: (collection: string, filter: string) => {
        if (collection === 'appSettings' && filter === "key = 'HMAC_SECRET'") {
            return {
                get: (field: string) => {
                    if (field === 'value') return JSON.stringify({ secret: 'test_secret' });
                    return null;
                }
            };
        }
        throw new Error('NotFound');
    }
} as unknown as PocketBaseApp;

globalRecord.$app = mockApp;

test('generateSignedPlayerToken produces consistent tokens', () => {
    const eventId = 'event123';
    const token = generateSignedPlayerToken(mockApp, eventId);
    
    // Format should be e=eventId&s=signature
    assert.strictEqual(token, `e=event123&s=sig_e=event123_test_secret`);
});

test('getHmacSecret retrieves secret from appSettings', () => {
    const secret = getHmacSecret(mockApp);
    assert.strictEqual(secret, 'test_secret');
});

test('generateSignedEventRecipientToken produces consistent tokens', () => {
    const eventId = 'event123';
    const recipientId = 'rec456';
    const token = generateSignedEventRecipientToken(mockApp, eventId, recipientId);
    
    // Format should be e=eventId&p=recipientId&s=signature
    assert.strictEqual(token, `e=event123&p=rec456&s=sig_e=event123&p=rec456_test_secret`);
});

test('generateSignedAuditionToken produces consistent tokens', () => {
    const auditionId = 'aud789';
    const token = generateSignedAuditionToken(mockApp, auditionId);
    
    // Format should be a=auditionId&s=signature
    assert.strictEqual(token, `a=aud789&s=sig_a=aud789_test_secret`);
});
