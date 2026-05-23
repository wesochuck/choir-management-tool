import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldDispatchOnCreate, shouldDispatchOnUpdate } from '../../pocketbase/pb_hooks_src/email/messageHookRules';

test('shouldDispatchOnCreate', () => {
    assert.strictEqual(shouldDispatchOnCreate({ status: 'Sent', type: 'Email' }), true);
    assert.strictEqual(shouldDispatchOnCreate({ status: 'Draft', type: 'Email' }), false);
    assert.strictEqual(shouldDispatchOnCreate({ status: 'Sent', type: 'SMS' }), false);
    assert.strictEqual(shouldDispatchOnCreate({ status: 'Sent', type: 'Email', filters: { alreadySent: true } }), false);
});

test('shouldDispatchOnUpdate', () => {
    assert.strictEqual(shouldDispatchOnUpdate({ status: 'Sent', type: 'Email' }, 'Draft'), true);
    assert.strictEqual(shouldDispatchOnUpdate({ status: 'Sent', type: 'Email' }, 'Sent'), false);
    assert.strictEqual(shouldDispatchOnUpdate({ status: 'Draft', type: 'Email' }, 'Draft'), false);
});
