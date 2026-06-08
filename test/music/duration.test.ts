import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDurationToSeconds, isValidDurationString, formatSecondsToDuration } from '../../src/lib/music/duration.ts';

test('parseDurationToSeconds parses various format strings correctly', () => {
  assert.equal(parseDurationToSeconds(undefined), 0);
  assert.equal(parseDurationToSeconds(''), 0);
  assert.equal(parseDurationToSeconds('   '), 0);
  assert.equal(parseDurationToSeconds('3:30'), 210);
  assert.equal(parseDurationToSeconds('03:30'), 210);
  assert.equal(parseDurationToSeconds('1:15:30'), 4530);
  assert.equal(parseDurationToSeconds('15'), 900);
  assert.equal(parseDurationToSeconds('15m'), 900);
  assert.equal(parseDurationToSeconds('15 min'), 900);
  assert.equal(parseDurationToSeconds('15 mins'), 900);
  assert.equal(parseDurationToSeconds('1h 30m'), 5400);
  assert.equal(parseDurationToSeconds('45s'), 45);
  assert.equal(parseDurationToSeconds('invalid'), 0);
});

test('formatSecondsToDuration formats seconds to human-readable strings correctly', () => {
  assert.equal(formatSecondsToDuration(0), '0:00');
  assert.equal(formatSecondsToDuration(-10), '0:00');
  assert.equal(formatSecondsToDuration(210), '3:30');
  assert.equal(formatSecondsToDuration(900), '15:00');
  assert.equal(formatSecondsToDuration(4530), '1:15:30');
  assert.equal(formatSecondsToDuration(5400), '1:30:00');
});

test('duration parsing accepts supported formats and rejects polluted text', () => {
  assert.equal(isValidDurationString('3:45'), true);
  assert.equal(isValidDurationString('1:02:03'), true);
  assert.equal(isValidDurationString('15'), true);
  assert.equal(isValidDurationString('15m'), true);
  assert.equal(isValidDurationString('1h 5m 9s'), true);

  assert.equal(parseDurationToSeconds('3:45'), 225);
  assert.equal(parseDurationToSeconds('1:02:03'), 3723);
  assert.equal(parseDurationToSeconds('15'), 900);
  assert.equal(parseDurationToSeconds('15m'), 900);
  assert.equal(parseDurationToSeconds('1h 5m 9s'), 3909);

  assert.equal(isValidDurationString('ljkdsajklf;daz'), false);
  assert.equal(isValidDurationString('3abc'), false);
  assert.equal(isValidDurationString('3:99'), false);
  assert.equal(isValidDurationString('duration 3:45'), false);
  assert.equal(parseDurationToSeconds('ljkdsajklf;daz'), 0);
  assert.equal(parseDurationToSeconds('3abc'), 0);
});

test('duration parsing and validation edge cases', () => {
  // isValidDurationString invalid structures
  assert.equal(isValidDurationString('1:2:3:4'), false);
  assert.equal(isValidDurationString('1:60'), false);
  assert.equal(isValidDurationString('1:61:01'), false);
  assert.equal(isValidDurationString('1:01:61'), false);
  assert.equal(isValidDurationString('1:1a'), false);

  assert.equal(formatSecondsToDuration(3661), '1:01:01');
  assert.equal(formatSecondsToDuration(3601), '1:00:01');
});
