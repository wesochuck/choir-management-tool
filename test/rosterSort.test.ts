import test from 'node:test';
import assert from 'node:assert/strict';
import { getLastName } from '../src/lib/stringUtils.ts';

interface SortableProfile {
  id: string;
  name: string;
  voicePart: string;
}

// Extract the exact sort logic implemented in RosterView
const sortProfiles = (profiles: SortableProfile[], sortBy: 'lastName' | 'voicePart', voiceParts: string[]) => {
  return [...profiles].sort((a, b) => {
    if (sortBy === 'voicePart') {
      const idxA = voiceParts.indexOf(a.voicePart);
      const idxB = voiceParts.indexOf(b.voicePart);
      const orderA = idxA === -1 ? 999 : idxA;
      const orderB = idxB === -1 ? 999 : idxB;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
    }
    
    const lastA = getLastName(a.name);
    const lastB = getLastName(b.name);
    const cmp = lastA.localeCompare(lastB);
    if (cmp !== 0) return cmp;
    return a.name.localeCompare(b.name);
  });
};

const sampleVoiceParts = ['S1', 'S2', 'A1', 'A2', 'T1', 'T2', 'B1', 'B2'];

const sampleProfiles = [
  { id: '1', name: 'Tony Stark', voicePart: 'T1' },
  { id: '2', name: 'Sarah Connor', voicePart: 'S1' },
  { id: '3', name: 'Susan Storm', voicePart: 'S2' },
  { id: '4', name: 'Arthur Pendragon', voicePart: 'A1' },
  { id: '5', name: 'Amy Pond', voicePart: 'A2' },
  { id: '6', name: 'Bruce Banner', voicePart: 'B2' },
  { id: '7', name: 'Jane Foster', voicePart: 'S1' },
  { id: '8', name: 'Martin Luther King Jr.', voicePart: 'B1' },
];

test('sortProfiles sorts by last name alphabetically when sortBy is lastName', () => {
  const result = sortProfiles(sampleProfiles, 'lastName', sampleVoiceParts);
  const names = result.map(p => p.name);
  
  // Expected alphabetical order by last name:
  // Banner (Bruce Banner)
  // Connor (Sarah Connor)
  // Foster (Jane Foster)
  // King Jr. (Martin Luther King Jr.)
  // Pendragon (Arthur Pendragon)
  // Pond (Amy Pond)
  // Stark (Tony Stark)
  // Storm (Susan Storm)
  const expectedNames = [
    'Bruce Banner',
    'Sarah Connor',
    'Jane Foster',
    'Martin Luther King Jr.',
    'Arthur Pendragon',
    'Amy Pond',
    'Tony Stark',
    'Susan Storm',
  ];

  assert.deepEqual(names, expectedNames);
});

test('sortProfiles sorts by voice part order, then last name when sortBy is voicePart', () => {
  const result = sortProfiles(sampleProfiles, 'voicePart', sampleVoiceParts);
  const order = result.map(p => ({ name: p.name, part: p.voicePart }));

  const expectedOrder = [
    // S1: Connor, Foster -> alphabetically Foster, then Connor
    { name: 'Sarah Connor', part: 'S1' },
    { name: 'Jane Foster', part: 'S1' },
    // S2: Storm
    { name: 'Susan Storm', part: 'S2' },
    // A1: Pendragon
    { name: 'Arthur Pendragon', part: 'A1' },
    // A2: Pond
    { name: 'Amy Pond', part: 'A2' },
    // T1: Stark
    { name: 'Tony Stark', part: 'T1' },
    // B1: King Jr.
    { name: 'Martin Luther King Jr.', part: 'B1' },
    // B2: Banner
    { name: 'Bruce Banner', part: 'B2' },
  ];

  // Let's verify each one
  assert.deepEqual(order, expectedOrder);
});

test('sortProfiles handles unconfigured/unknown voice parts gracefully by sorting them at the end', () => {
  const customProfiles = [
    { id: '1', name: 'Tony Stark', voicePart: 'T1' },
    { id: '2', name: 'Thor Odinson', voicePart: 'Unknown' }, // Unknown voice part
    { id: '3', name: 'Sarah Connor', voicePart: 'S1' },
  ];
  
  const result = sortProfiles(customProfiles, 'voicePart', sampleVoiceParts);
  const names = result.map(p => p.name);
  
  // Connor (S1) -> Stark (T1) -> Odinson (Unknown/at the end)
  const expectedNames = [
    'Sarah Connor',
    'Tony Stark',
    'Thor Odinson',
  ];
  
  assert.deepEqual(names, expectedNames);
});
