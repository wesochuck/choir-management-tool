import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSignedPlayerToken, getHmacSecret, generateSignedEventRecipientToken } from '../../pocketbase/pb_hooks_src/hmacTokens.ts';

// Mock PocketBase globals
(global as any).$security = {
    hs256: (payload: string, secret: string) => `sig_${payload}_${secret}`
};

(global as any).$app = {
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
};

test('generateSignedPlayerToken produces consistent tokens', () => {
    const eventId = 'event123';
    const token = generateSignedPlayerToken((global as any).$app, eventId);
    
    // Format should be e=eventId&s=signature
    assert.strictEqual(token, `e=event123&s=sig_e=event123_test_secret`);
});

test('getHmacSecret retrieves secret from appSettings', () => {
    const secret = getHmacSecret((global as any).$app);
    assert.strictEqual(secret, 'test_secret');
});

test('generateSignedEventRecipientToken produces consistent tokens', () => {
    const eventId = 'event123';
    const recipientId = 'rec456';
    const token = generateSignedEventRecipientToken((global as any).$app, eventId, recipientId);
    
    // Format should be e=eventId&p=recipientId&s=signature
    assert.strictEqual(token, `e=event123&p=rec456&s=sig_e=event123&p=rec456_test_secret`);
});
