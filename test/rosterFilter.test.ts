import test from 'node:test';
import assert from 'node:assert/strict';

// Core matching logic matching our implementation plan for multi-select
interface FilterableProfile {
  id: string;
  name: string;
  voicePart: string;
  globalStatus: string;
}

const matchesVoiceParts = (profilePart: string, filterParts: string[]): boolean => {
  if (!filterParts || filterParts.length === 0) return true;
  return filterParts.some(vp => 
    profilePart === vp || (vp.length === 1 && profilePart?.startsWith(vp))
  );
};

// Double-layered filtering matching useProfiles.ts useMemo logic
const filterProfiles = (
  profiles: FilterableProfile[],
  filters: { voiceParts: string[]; status: string; name: string }
) => {
  return profiles.filter((p) => {
    const matchesVoice = matchesVoiceParts(p.voicePart, filters.voiceParts);
    const matchesStatus = !filters.status || p.globalStatus === filters.status;
    const matchesName = !filters.name || p.name.toLowerCase().includes(filters.name.toLowerCase());
    return matchesVoice && matchesStatus && matchesName;
  });
};

// Filtered list specifically for calculating RosterSummary counts (not filtered by voice parts)
const getProfilesForSummary = (
  profiles: FilterableProfile[],
  filters: { voiceParts: string[]; status: string; name: string }
) => {
  return profiles.filter((p) => {
    const matchesStatus = !filters.status || p.globalStatus === filters.status;
    const matchesName = !filters.name || p.name.toLowerCase().includes(filters.name.toLowerCase());
    return matchesStatus && matchesName;
  });
};

const sampleProfiles = [
  { id: '1', name: 'Sarah Connor', voicePart: 'S1', globalStatus: 'Active' },
  { id: '2', name: 'Susan Storm', voicePart: 'S2', globalStatus: 'Active' },
  { id: '3', name: 'Arthur Pendragon', voicePart: 'A1', globalStatus: 'Active' },
  { id: '4', name: 'Amy Pond', voicePart: 'A2', globalStatus: 'Inactive' },
  { id: '5', name: 'Tony Stark', voicePart: 'T1', globalStatus: 'Idle' },
  { id: '6', name: 'Bruce Banner', voicePart: 'B2', globalStatus: 'Active' },
];

test('matchesVoiceParts correctly matches multiple exact subparts', () => {
  assert.equal(matchesVoiceParts('S1', ['S1', 'B2']), true);
  assert.equal(matchesVoiceParts('B2', ['S1', 'B2']), true);
  assert.equal(matchesVoiceParts('S2', ['S1', 'B2']), false);
});

test('matchesVoiceParts correctly matches multiple mixed sections and parts by prefix', () => {
  // S matches both S1 and S2. T matches T1.
  assert.equal(matchesVoiceParts('S1', ['S', 'T1']), true);
  assert.equal(matchesVoiceParts('S2', ['S', 'T1']), true);
  assert.equal(matchesVoiceParts('T1', ['S', 'T1']), true);
  assert.equal(matchesVoiceParts('B2', ['S', 'T1']), false);
});

test('matchesVoiceParts handles empty filter part list by returning true', () => {
  assert.equal(matchesVoiceParts('S1', []), true);
  assert.equal(matchesVoiceParts('T2', []), true);
});

test('filterProfiles filters by multiple subparts correctly', () => {
  const result = filterProfiles(sampleProfiles, { voiceParts: ['S1', 'A2'], status: '', name: '' });
  assert.equal(result.length, 2);
  assert.ok(result.some(p => p.name === 'Sarah Connor'));
  assert.ok(result.some(p => p.name === 'Amy Pond'));
});

test('filterProfiles filters by combined sections and subparts correctly', () => {
  // Section A (matches A1, A2) and subpart S2
  const result = filterProfiles(sampleProfiles, { voiceParts: ['A', 'S2'], status: '', name: '' });
  assert.equal(result.length, 3);
  assert.ok(result.some(p => p.name === 'Susan Storm')); // S2
  assert.ok(result.some(p => p.name === 'Arthur Pendragon')); // A1
  assert.ok(result.some(p => p.name === 'Amy Pond')); // A2
});

test('getProfilesForSummary bypasses voice parts filter but respects status and name', () => {
  const filters = { voiceParts: ['S1', 'B2'], status: 'Active', name: '' };
  
  // Roster table shows S1 and B2 Active profiles -> Sarah (S1) and Bruce (B2)
  const tableResult = filterProfiles(sampleProfiles, filters);
  assert.equal(tableResult.length, 2);
  assert.ok(tableResult.some(p => p.name === 'Sarah Connor'));
  assert.ok(tableResult.some(p => p.name === 'Bruce Banner'));

  // Roster summary counts shows all Active profiles -> Sarah (S1), Susan (S2), Arthur (A1), Bruce (B2)
  const summaryResult = getProfilesForSummary(sampleProfiles, filters);
  assert.equal(summaryResult.length, 4);
  
  const voicePartsInSummary = summaryResult.map(p => p.voicePart);
  assert.ok(voicePartsInSummary.includes('S1'));
  assert.ok(voicePartsInSummary.includes('S2'));
  assert.ok(voicePartsInSummary.includes('A1'));
  assert.ok(voicePartsInSummary.includes('B2'));
});
