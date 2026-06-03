import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSignedPlayerToken, getHmacSecret } from '../../pocketbase/pb_hooks_src/hmacTokens.ts';

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
    const secret = 'secret456';
    const token = generateSignedPlayerToken(eventId, secret);
    
    // Format should be e=eventId&s=signature
    assert.strictEqual(token, `e=event123&s=sig_e=event123_secret456`);
});

test('getHmacSecret retrieves secret from appSettings', () => {
    const secret = getHmacSecret();
    assert.strictEqual(secret, 'test_secret');
});
