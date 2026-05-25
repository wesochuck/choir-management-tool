import test from 'node:test';
import assert from 'node:assert/strict';
import { getLastName } from '../src/lib/stringUtils.ts';

test('getLastName with empty or falsy inputs', () => {
  assert.equal(getLastName(''), '');
});

test('getLastName with single word name', () => {
  assert.equal(getLastName('Prince'), 'Prince');
  assert.equal(getLastName('   Cher   '), 'Cher');
});

test('getLastName with standard first and last name', () => {
  assert.equal(getLastName('John Doe'), 'Doe');
});

test('getLastName with middle names', () => {
  assert.equal(getLastName('John Jacob Jingleheimer Schmidt'), 'Jingleheimer Schmidt');
  assert.equal(getLastName('John Van Dyke'), 'Van Dyke');
});

test('getLastName preserves standard suffixes', () => {
  assert.equal(getLastName('Martin Luther King Jr.'), 'Luther King Jr.');
  assert.equal(getLastName('Thurston Howell III'), 'Howell III');
  assert.equal(getLastName('John Doe Sr'), 'Doe Sr');
  assert.equal(getLastName('John Doe IV'), 'Doe IV');
  assert.equal(getLastName('John Van Dyke Jr.'), 'Van Dyke Jr.');
});

test('getLastName ignores suffix if there is no last name to attach to', () => {
  assert.equal(getLastName('John Jr.'), 'Jr.');
  assert.equal(getLastName('III'), 'III');
});

test('getLastName handles extra whitespace gracefully', () => {
  assert.equal(getLastName('  John   Doe   '), 'Doe');
  assert.equal(getLastName(' John   Doe  Jr.  '), 'Doe Jr.');
});
