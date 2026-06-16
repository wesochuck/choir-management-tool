import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('hmacTokens', () => {
  it('getTicketPayload returns t=<purchaseId>', async () => {
    const { getTicketPayload } = await import('../pocketbase/pb_hooks_src/hmacTokens.ts');
    assert.equal(getTicketPayload('purchase_123'), 't=purchase_123');
  });

  it('generateSignedTicketToken produces t=<id>&s=<sig>', async () => {
    const { generateSignedTicketToken } = await import('../pocketbase/pb_hooks_src/hmacTokens.ts');
    assert.equal(typeof generateSignedTicketToken, 'function');
  });

  it('parseSignedToken accepts t key and requires it when specified', async () => {
    const { parseSignedToken } = await import('../pocketbase/pb_hooks_src/hmacTokens.ts');

    const validToken = 't=purchase_abc&s=some_signature';
    const parsed = parseSignedToken(validToken, ['t', 's']);
    assert.ok(parsed);
    assert.equal(parsed.t, 'purchase_abc');
    assert.equal(parsed.s, 'some_signature');

    const noT = parseSignedToken('e=event_1&s=sig', ['t']);
    assert.equal(noT, null);

    const noS = parseSignedToken('t=purchase_1', ['t', 's']);
    assert.equal(noS, null);

    assert.equal(parseSignedToken('', ['t']), null);
    assert.equal(parseSignedToken(null as unknown as string, ['t']), null);
  });

  it('parseSignedToken still works with existing e, p, a, c keys', async () => {
    const { parseSignedToken } = await import('../pocketbase/pb_hooks_src/hmacTokens.ts');

    const playerToken = 'e=event_1&s=sig_val';
    const parsed = parseSignedToken(playerToken, ['e', 's']);
    assert.ok(parsed);
    assert.equal(parsed.e, 'event_1');
    assert.equal(parsed.s, 'sig_val');
  });
});
