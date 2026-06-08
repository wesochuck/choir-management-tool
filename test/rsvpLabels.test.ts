import test from 'node:test';
import assert from 'node:assert/strict';
import { getRsvpStatusLabel, getRsvpExportGroupLabel } from '../src/lib/eventRoster/rsvpLabels.ts';

test('getRsvpStatusLabel should return correct string for Yes', () => {
  assert.equal(getRsvpStatusLabel('Yes'), 'Attending');
});

test('getRsvpStatusLabel should return correct string for No', () => {
  assert.equal(getRsvpStatusLabel('No'), 'Declined');
});

test('getRsvpStatusLabel should return correct string for Pending', () => {
  assert.equal(getRsvpStatusLabel('Pending'), 'No Response');
});

test('getRsvpExportGroupLabel should return correct string for Yes', () => {
  assert.equal(getRsvpExportGroupLabel('Yes'), 'Attending (Yes)');
});

test('getRsvpExportGroupLabel should return correct string for No', () => {
  assert.equal(getRsvpExportGroupLabel('No'), 'Declined (No)');
});

test('getRsvpExportGroupLabel should return correct string for Pending', () => {
  assert.equal(getRsvpExportGroupLabel('Pending'), 'No Response (Pending)');
});
