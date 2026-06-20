import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPocketBaseError } from '../src/lib/pocketbase.js';

test('formatPocketBaseError with falsy inputs', () => {
  assert.equal(formatPocketBaseError(null), 'An unknown error occurred');
  assert.equal(formatPocketBaseError(undefined), 'An unknown error occurred');
  assert.equal(formatPocketBaseError(''), 'An unknown error occurred');
});

test('formatPocketBaseError with standard Error object', () => {
  assert.equal(formatPocketBaseError(new Error('Network error')), 'Network error');
});

test('formatPocketBaseError with object lacking data property', () => {
  assert.equal(formatPocketBaseError({ status: 500 }), 'An error occurred');
  assert.equal(formatPocketBaseError({ data: null }), 'An error occurred');
  assert.equal(formatPocketBaseError({ data: {} }), 'An error occurred');
});

test('formatPocketBaseError with validation_required and validation_missing_required', () => {
  assert.equal(
    formatPocketBaseError({
      data: {
        firstName: { code: 'validation_required', message: 'Missing' },
      },
    }),
    'First Name is required.'
  );

  assert.equal(
    formatPocketBaseError({
      data: {
        last_name: { code: 'validation_missing_required', message: 'Missing' },
      },
    }),
    'Last name is required.'
  );
});

test('formatPocketBaseError with email-specific errors', () => {
  assert.equal(
    formatPocketBaseError({
      data: {
        email: { code: 'validation_not_unique', message: 'Not unique' },
      },
    }),
    'This email address is already in use by another account.'
  );

  assert.equal(
    formatPocketBaseError({
      data: {
        email: { code: 'validation_invalid_email', message: 'Invalid' },
      },
    }),
    'Please enter a valid email address.'
  );
});

test('formatPocketBaseError with password-specific errors', () => {
  assert.equal(
    formatPocketBaseError({
      data: {
        password: { code: 'validation_len_out_of_range', message: 'Too short' },
      },
    }),
    'Password must be between 8 and 72 characters.'
  );
});

test('formatPocketBaseError with default field formatting and messages', () => {
  assert.equal(
    formatPocketBaseError({
      data: {
        voicePart: { code: 'validation_invalid', message: 'Cannot be empty.' },
      },
    }),
    'Voice Part: Cannot be empty.'
  );

  assert.equal(
    formatPocketBaseError({
      data: {
        phone_number: { code: 'validation_invalid', message: '' },
      },
    }),
    'Phone number: Invalid value.'
  );

  assert.equal(
    formatPocketBaseError({
      data: {
        'kebab-case-field': { code: 'validation_invalid', message: 'Oops' },
      },
    }),
    'Kebab case field: Oops'
  );
});

test('formatPocketBaseError handles invalid or incomplete info objects gracefully', () => {
  assert.equal(
    formatPocketBaseError({
      data: {
        field1: null,
        field2: 'string value instead of object',
        field3: { code: 'validation_invalid' }, // Missing message
      },
    }),
    'An error occurred'
  );

  assert.equal(
    formatPocketBaseError({
      data: {
        validField: { code: 'validation_invalid', message: 'A proper error' },
        invalidField: null,
      },
    }),
    'Valid Field: A proper error'
  );
});

test('formatPocketBaseError with multiple field errors', () => {
  const errorObj = {
    data: {
      email: { code: 'validation_invalid_email', message: 'Invalid' },
      password: { code: 'validation_len_out_of_range', message: 'Too short' },
      firstName: { code: 'validation_required', message: 'Missing' },
    },
  };

  const expected = [
    'Please enter a valid email address.',
    'Password must be between 8 and 72 characters.',
    'First Name is required.'
  ].join('\n');

  assert.equal(formatPocketBaseError(errorObj), expected);
});
