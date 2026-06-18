import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  coercePocketBaseDate,
  isPocketBaseDateAtOrAfter,
  isPocketBaseDateBefore,
} from '../pocketbase/pb_hooks_src/pocketbaseDate';

describe('coercePocketBaseDate', () => {
  it('parses ISO datetime strings', () => {
    const parsed = coercePocketBaseDate('2099-01-01T12:00:00.000Z');

    assert.ok(parsed);
    assert.equal(parsed.toISOString(), '2099-01-01T12:00:00.000Z');
  });

  it('accepts JavaScript Date objects', () => {
    const parsed = coercePocketBaseDate(new Date('2099-01-01T12:00:00.000Z'));

    assert.ok(parsed);
    assert.equal(parsed.toISOString(), '2099-01-01T12:00:00.000Z');
  });

  it('accepts timestamp numbers', () => {
    const parsed = coercePocketBaseDate(Date.parse('2099-01-01T12:00:00.000Z'));

    assert.ok(parsed);
    assert.equal(parsed.toISOString(), '2099-01-01T12:00:00.000Z');
  });

  it('accepts Goja-style date-like objects with toISOString', () => {
    const gojaTimeLike = {
      toISOString: () => '2099-01-01T12:00:00.000Z',
    };

    const parsed = coercePocketBaseDate(gojaTimeLike);

    assert.ok(parsed);
    assert.equal(parsed.toISOString(), '2099-01-01T12:00:00.000Z');
  });

  it('accepts Goja-style date-like objects with toString', () => {
    const gojaTimeLike = {
      toString: () => '2099-01-01T12:00:00.000Z',
    };

    const parsed = coercePocketBaseDate(gojaTimeLike);

    assert.ok(parsed);
    assert.equal(parsed.toISOString(), '2099-01-01T12:00:00.000Z');
  });

  it('accepts date-like objects with valueOf returning a timestamp', () => {
    const dateLike = {
      valueOf: () => Date.parse('2099-01-01T12:00:00.000Z'),
    };

    const parsed = coercePocketBaseDate(dateLike);

    assert.ok(parsed);
    assert.equal(parsed.toISOString(), '2099-01-01T12:00:00.000Z');
  });

  it('accepts date-like objects with valueOf returning a Date', () => {
    const dateLike = {
      valueOf: () => new Date('2099-01-01T12:00:00.000Z'),
    };

    const parsed = coercePocketBaseDate(dateLike);

    assert.ok(parsed);
    assert.equal(parsed.toISOString(), '2099-01-01T12:00:00.000Z');
  });

  it('returns null for invalid values', () => {
    assert.equal(coercePocketBaseDate(null), null);
    assert.equal(coercePocketBaseDate(undefined), null);
    assert.equal(coercePocketBaseDate('not a date'), null);
    assert.equal(coercePocketBaseDate({}), null);
    assert.equal(coercePocketBaseDate({ toString: () => '[object Object]' }), null);
  });

  it('returns null when date-like methods throw', () => {
    const badDateLike = {
      toISOString: () => {
        throw new Error('bad date');
      },
      toString: () => {
        throw new Error('bad date');
      },
    };

    assert.equal(coercePocketBaseDate(badDateLike), null);
  });

  it('returns null for empty string', () => {
    assert.equal(coercePocketBaseDate(''), null);
  });

  it('handles date string with space instead of T', () => {
    const parsed = coercePocketBaseDate('2099-01-01 12:00:00');
    assert.ok(parsed);
    assert.equal(parsed.getFullYear(), 2099);
  });
});

describe('PocketBase date comparison helpers', () => {
  const now = new Date('2026-06-17T12:00:00.000Z');

  it('detects dates at or after the comparison date', () => {
    assert.equal(
      isPocketBaseDateAtOrAfter({ toISOString: () => '2026-06-17T12:00:00.000Z' }, now),
      true
    );

    assert.equal(
      isPocketBaseDateAtOrAfter({ toISOString: () => '2026-06-18T12:00:00.000Z' }, now),
      true
    );
  });

  it('detects dates before the comparison date', () => {
    assert.equal(
      isPocketBaseDateBefore({ toISOString: () => '2026-06-16T12:00:00.000Z' }, now),
      true
    );
  });

  it('treats invalid dates as failed comparisons', () => {
    assert.equal(isPocketBaseDateAtOrAfter({}, now), false);
    assert.equal(isPocketBaseDateBefore({}, now), false);
  });
});
