import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { coercePocketBaseDate } from '../../pocketbase/pb_hooks_src/pocketbaseDate';

describe('Checkout date safety (Goja time.Time regression)', () => {
  describe('coercePocketBaseDate in checkout paths', () => {
    it('accepts a future Goja-style date-like object and compares correctly', () => {
      const futureGojaDateLike = {
        toISOString: () => '2099-01-01T12:00:00.000Z',
      };

      const parsed = coercePocketBaseDate(futureGojaDateLike);
      assert.ok(parsed, 'should parse future Goja date-like object');
      assert.ok(parsed > new Date(), 'future date should be after now');
    });

    it('rejects a past Goja-style date-like object', () => {
      const pastGojaDateLike = {
        toISOString: () => '2000-01-01T12:00:00.000Z',
      };

      const parsed = coercePocketBaseDate(pastGojaDateLike);
      assert.ok(parsed, 'should parse past Goja date-like object');
      assert.ok(parsed < new Date(), 'past date should be before now');
    });

    it('returns null for an unparseable object', () => {
      const badObject = {};
      assert.equal(coercePocketBaseDate(badObject), null);
    });

    it('handles direct Date objects (normal JS path)', () => {
      const parsed = coercePocketBaseDate(new Date('2099-06-01T00:00:00.000Z'));
      assert.ok(parsed);
      assert.equal(parsed.getFullYear(), 2099);
    });
  });
});
