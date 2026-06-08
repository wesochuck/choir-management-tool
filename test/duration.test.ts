import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatSecondsToDuration,
  parseDurationToSeconds,
  isValidDurationString
} from '../src/lib/music/duration.ts';

describe('duration utilities', () => {
  describe('formatSecondsToDuration', () => {
    it('returns 0:00 for 0 or negative seconds', () => {
      assert.strictEqual(formatSecondsToDuration(0), '0:00');
      assert.strictEqual(formatSecondsToDuration(-5), '0:00');
    });

    it('formats seconds less than a minute correctly', () => {
      assert.strictEqual(formatSecondsToDuration(5), '0:05');
      assert.strictEqual(formatSecondsToDuration(45), '0:45');
    });

    it('formats minutes and seconds correctly (no hours)', () => {
      assert.strictEqual(formatSecondsToDuration(60), '1:00');
      assert.strictEqual(formatSecondsToDuration(65), '1:05');
      assert.strictEqual(formatSecondsToDuration(125), '2:05');
      assert.strictEqual(formatSecondsToDuration(3599), '59:59');
    });

    it('formats hours, minutes, and seconds correctly', () => {
      assert.strictEqual(formatSecondsToDuration(3600), '1:00:00');
      assert.strictEqual(formatSecondsToDuration(3665), '1:01:05');
      assert.strictEqual(formatSecondsToDuration(7200), '2:00:00');
      assert.strictEqual(formatSecondsToDuration(7325), '2:02:05');
      assert.strictEqual(formatSecondsToDuration(36000), '10:00:00'); // 10 hours
    });
  });

  describe('parseDurationToSeconds', () => {
    it('returns 0 for empty or invalid strings', () => {
      assert.strictEqual(parseDurationToSeconds(''), 0);
      assert.strictEqual(parseDurationToSeconds(undefined), 0);
      assert.strictEqual(parseDurationToSeconds('   '), 0);
      assert.strictEqual(parseDurationToSeconds('invalid'), 0);
    });

    it('parses MM:SS format', () => {
      assert.strictEqual(parseDurationToSeconds('3:45'), 225);
      assert.strictEqual(parseDurationToSeconds('03:45'), 225);
      assert.strictEqual(parseDurationToSeconds('12:00'), 720);
    });

    it('parses HH:MM:SS format', () => {
      assert.strictEqual(parseDurationToSeconds('1:15:30'), 4530);
      assert.strictEqual(parseDurationToSeconds('01:00:00'), 3600);
      assert.strictEqual(parseDurationToSeconds('2:02:05'), 7325);
    });

    it('parses minutes only (pure number)', () => {
      assert.strictEqual(parseDurationToSeconds('15'), 900);
      assert.strictEqual(parseDurationToSeconds('10'), 600);
    });

    it('parses strings with suffixes', () => {
      assert.strictEqual(parseDurationToSeconds('15m'), 900);
      assert.strictEqual(parseDurationToSeconds('15 min'), 900);
      assert.strictEqual(parseDurationToSeconds('15 mins'), 900);
      assert.strictEqual(parseDurationToSeconds('45s'), 45);
      assert.strictEqual(parseDurationToSeconds('45 sec'), 45);
      assert.strictEqual(parseDurationToSeconds('1h'), 3600);
      assert.strictEqual(parseDurationToSeconds('2 hr'), 7200);
    });

    it('parses complex suffix combinations', () => {
      assert.strictEqual(parseDurationToSeconds('1h 15m 30s'), 4530);
      assert.strictEqual(parseDurationToSeconds('2 hrs 5 mins'), 7500);
      assert.strictEqual(parseDurationToSeconds('10m 45s'), 645);
    });
  });

  describe('isValidDurationString', () => {
    it('returns false for empty or invalid strings', () => {
      assert.strictEqual(isValidDurationString(''), false);
      assert.strictEqual(isValidDurationString(undefined), false);
      assert.strictEqual(isValidDurationString('   '), false);
      assert.strictEqual(isValidDurationString('invalid'), false);
      assert.strictEqual(isValidDurationString('1:2:3:4'), false);
      assert.strictEqual(isValidDurationString('1:60'), false); // invalid seconds
      assert.strictEqual(isValidDurationString('1:60:00'), false); // invalid minutes
      assert.strictEqual(isValidDurationString('1:00:60'), false); // invalid seconds
      assert.strictEqual(isValidDurationString('a:b'), false);
    });

    it('returns true for valid HH:MM:SS / MM:SS format', () => {
      assert.strictEqual(isValidDurationString('3:45'), true);
      assert.strictEqual(isValidDurationString('03:45'), true);
      assert.strictEqual(isValidDurationString('12:00'), true);
      assert.strictEqual(isValidDurationString('1:15:30'), true);
      assert.strictEqual(isValidDurationString('01:00:00'), true);
    });

    it('returns true for minutes only', () => {
      assert.strictEqual(isValidDurationString('15'), true);
      assert.strictEqual(isValidDurationString('10'), true);
    });

    it('returns true for valid strings with suffixes', () => {
      assert.strictEqual(isValidDurationString('15m'), true);
      assert.strictEqual(isValidDurationString('15 min'), true);
      assert.strictEqual(isValidDurationString('15 mins'), true);
      assert.strictEqual(isValidDurationString('45s'), true);
      assert.strictEqual(isValidDurationString('45 sec'), true);
      assert.strictEqual(isValidDurationString('1h'), true);
      assert.strictEqual(isValidDurationString('2 hr'), true);
      assert.strictEqual(isValidDurationString('1h 15m 30s'), true);
      assert.strictEqual(isValidDurationString('2 hrs 5 mins'), true);
      assert.strictEqual(isValidDurationString('10m 45s'), true);
    });
  });
});
