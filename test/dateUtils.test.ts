import test from 'node:test';
import assert from 'node:assert/strict';
import { formatTime12h, parseFuzzyMonthYearInput } from '../src/lib/dateUtils.ts';

test('formatTime12h with empty or falsy inputs', () => {
  assert.equal(formatTime12h(), '');
  assert.equal(formatTime12h(''), '');
});

test('formatTime12h with invalid time formats returns original string', () => {
  assert.equal(formatTime12h('invalid'), 'invalid');
  assert.equal(formatTime12h('1:00'), '1:00'); // Requires 2 digits for hours
  assert.equal(formatTime12h('12:0'), '12:0'); // Requires 2 digits for minutes
  assert.equal(formatTime12h('123:45'), '123:45');
});

test('formatTime12h with valid AM times', () => {
  assert.equal(formatTime12h('00:00'), '12:00 AM'); // Midnight edge case
  assert.equal(formatTime12h('01:00'), '1:00 AM');
  assert.equal(formatTime12h('09:30'), '9:30 AM');
  assert.equal(formatTime12h('11:59'), '11:59 AM');
});

test('formatTime12h with valid PM times', () => {
  assert.equal(formatTime12h('12:00'), '12:00 PM'); // Noon edge case
  assert.equal(formatTime12h('12:01'), '12:01 PM');
  assert.equal(formatTime12h('13:00'), '1:00 PM');
  assert.equal(formatTime12h('15:45'), '3:45 PM');
  assert.equal(formatTime12h('23:59'), '11:59 PM');
});

test('parseFuzzyMonthYearInput parses MM/YYYY correctly', () => {
  assert.equal(parseFuzzyMonthYearInput('05/2023'), '2023-05-01');
  assert.equal(parseFuzzyMonthYearInput('5/2023'), '2023-05-01');
  assert.equal(parseFuzzyMonthYearInput('12/1999'), '1999-12-01');
});

test('parseFuzzyMonthYearInput parses MM/YY correctly by prepending 20', () => {
  assert.equal(parseFuzzyMonthYearInput('05/23'), '2023-05-01');
  assert.equal(parseFuzzyMonthYearInput('11/18'), '2018-11-01');
  assert.equal(parseFuzzyMonthYearInput('1/99'), '2099-01-01');
});

test('parseFuzzyMonthYearInput parses without slash', () => {
  assert.equal(parseFuzzyMonthYearInput('052023'), '2023-05-01');
  assert.equal(parseFuzzyMonthYearInput('0523'), '2023-05-01');
});

test('parseFuzzyMonthYearInput handles whitespace', () => {
  assert.equal(parseFuzzyMonthYearInput('  05/2023  '), '2023-05-01');
});

test('parseFuzzyMonthYearInput returns empty string for invalid inputs', () => {
  assert.equal(parseFuzzyMonthYearInput(''), '');
  assert.equal(parseFuzzyMonthYearInput('invalid'), '');
  assert.equal(parseFuzzyMonthYearInput('05/2023/12'), '');
  assert.equal(parseFuzzyMonthYearInput('2023/05'), '');
});
