import test from 'node:test';
import assert from 'node:assert/strict';
import { checkValidation } from '../src/utils/communicationValidation';

test('checkValidation with valid Email message', () => {
  const result = checkValidation('Hello World', 'Greetings', 'Email', '');
  assert.deepEqual(result, []);
});

test('checkValidation with valid Both message', () => {
  const result = checkValidation('Hello World', 'Greetings', 'Both', '');
  assert.deepEqual(result, []);
});

test('checkValidation with valid SMS message (subject is optional)', () => {
  const result1 = checkValidation('Hello World', '', 'SMS', '');
  assert.deepEqual(result1, []);

  const result2 = checkValidation('Hello World', 'Ignored Subject', 'SMS', '');
  assert.deepEqual(result2, []);
});

test('checkValidation generates error for missing subject in Email/Both', () => {
  const expectedEmail = [
    {
      field: 'subject',
      message: 'Subject line required for email messages.',
      type: 'error',
    },
  ];

  const resultEmail = checkValidation('Hello World', '', 'Email', '');
  assert.deepEqual(resultEmail, expectedEmail);

  const resultBoth = checkValidation('Hello World', '', 'Both', '');
  assert.deepEqual(resultBoth, expectedEmail);
});

test('checkValidation generates error for whitespace-only subject in Email/Both', () => {
  const expected = [
    {
      field: 'subject',
      message: 'Subject line required for email messages.',
      type: 'error',
    },
  ];

  const result1 = checkValidation('Hello World', '   ', 'Email', '');
  assert.deepEqual(result1, expected);
});

test('checkValidation generates warning for event placeholders without selectedEventId', () => {
  const expected = [
    {
      field: 'body',
      message: 'This message uses event placeholders, but no event context is selected.',
      type: 'warning',
    },
  ];

  // In body
  const result1 = checkValidation('Don\'t forget {eventTitle}!', 'Reminder', 'Email', '');
  assert.deepEqual(result1, expected);

  // In subject
  const result2 = checkValidation('Hello', 'Reminder for {eventTitle}', 'Email', '');
  assert.deepEqual(result2, expected);
});

test('checkValidation does not generate warning for event placeholders with valid selectedEventId', () => {
  const result = checkValidation('Don\'t forget {eventTitle}!', 'Reminder', 'Email', 'event123');
  assert.deepEqual(result, []);
});

test('checkValidation handles placeholder case insensitivity', () => {
  const expected = [
    {
      field: 'body',
      message: 'This message uses event placeholders, but no event context is selected.',
      type: 'warning',
    },
  ];

  // Mixed case
  const result1 = checkValidation('Here is the {EvEnTDaTe}', 'Reminder', 'Email', '');
  assert.deepEqual(result1, expected);

  // Upper case
  const result2 = checkValidation('Check {RSVPLINKS}', 'Important', 'Email', '');
  assert.deepEqual(result2, expected);
});

test('checkValidation returns multiple warnings together', () => {
  const expected = [
    {
      field: 'subject',
      message: 'Subject line required for email messages.',
      type: 'error',
    },
    {
      field: 'body',
      message: 'This message uses event placeholders, but no event context is selected.',
      type: 'warning',
    },
  ];

  const result = checkValidation('Don\'t forget {eventTitle}!', '   ', 'Email', '');
  assert.deepEqual(result, expected);
});
