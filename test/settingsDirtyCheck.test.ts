import test from 'node:test';
import assert from 'node:assert/strict';
import { isDeepEqual, calculateSettingsDirty } from '../src/lib/settings/dirtyCheck.ts';

test('Pristine settings return false for dirty checks', () => {
  const initial = {
    choirName: 'Downtown Community Chorale',
    attendance: { defaultSort: 'lastName' },
    roster: { defaultStatus: 'Active', defaultSort: 'voicePart' },
    musicLibrary: { catalogLookupUrlTemplate: '', genres: [{ id: 'sacred', label: 'Sacred' }] },
    seating: { formations: [] },
  };

  const current = {
    choirName: 'Downtown Community Chorale',
    attendance: { defaultSort: 'lastName' },
    roster: { defaultStatus: 'Active', defaultSort: 'voicePart' },
    musicLibrary: { catalogLookupUrlTemplate: '', genres: [{ id: 'sacred', label: 'Sacred' }] },
    seating: { formations: [] },
  };

  assert.equal(isDeepEqual(initial, current), true);
  assert.equal(calculateSettingsDirty(initial, current), false);
});

test('Modifying a primitive string field changes state and returns true', () => {
  const initial = {
    choirName: 'Downtown Community Chorale',
  };

  const current = {
    choirName: 'Uptown Community Chorale',
  };

  assert.equal(isDeepEqual(initial, current), false);
  assert.equal(calculateSettingsDirty(initial, current), true);
});

test('Adding an element to a nested array property returns true', () => {
  const initial = {
    musicLibrary: {
      genres: [
        { id: 'sacred', label: 'Sacred' }
      ]
    }
  };

  const current = {
    musicLibrary: {
      genres: [
        { id: 'sacred', label: 'Sacred' },
        { id: 'secular', label: 'Secular' }
      ]
    }
  };

  assert.equal(isDeepEqual(initial, current), false);
  assert.equal(calculateSettingsDirty(initial, current), true);
});

test('Restoring values back to matching initial parameters clears dirty status to false', () => {
  const initial = {
    choirName: 'Downtown Community Chorale',
    attendance: { defaultSort: 'lastName' },
  };

  const current = {
    choirName: 'Uptown Community Chorale',
    attendance: { defaultSort: 'lastName' },
  };

  assert.equal(calculateSettingsDirty(initial, current), true);

  // Restore the value
  current.choirName = 'Downtown Community Chorale';
  assert.equal(calculateSettingsDirty(initial, current), false);
});
