// @vitest-environment jsdom
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EventRosterTable } from '../src/components/admin/EventRosterTable';
import { DialogProvider } from '../src/contexts/DialogProvider';
import type { Profile } from '../src/services/profileService';

function createProfile(id: string, name: string, voicePart: string): Profile {
  return {
    id,
    collectionId: 'profiles_collection',
    collectionName: 'profiles',
    created: '2026-01-01T00:00:00.000Z',
    updated: '2026-01-01T00:00:00.000Z',
    user: '',
    name,
    phone: '',
    photo: '',
    voicePart,
    globalStatus: 'Active',
    notes: '',
  };
}

function countOccurrences(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

test('EventRosterTable renders event roster RSVP badge labels for each status', () => {
  const singers = [
    { profile: createProfile('p1', 'Yes Singer', 'S1'), rsvp: 'Yes' as const },
    { profile: createProfile('p2', 'No Singer', 'A1'), rsvp: 'No' as const },
    { profile: createProfile('p3', 'Pending Singer', 'T1'), rsvp: 'Pending' as const },
  ];

  const html = renderToStaticMarkup(
    React.createElement(
      DialogProvider,
      null,
      React.createElement(EventRosterTable, {
        singers,
        isUpdating: false,
        onUpdateRSVP: async () => undefined,
      })
    )
  );

  assert.equal(countOccurrences(html, '🟢 Attending'), 1);
  assert.equal(countOccurrences(html, '🔴 Declined'), 1);
  assert.equal(countOccurrences(html, '⏳ No Response'), 1);
});
