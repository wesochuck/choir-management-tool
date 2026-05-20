import test from 'node:test';
import assert from 'node:assert/strict';

// Core matching logic matching our implementation plan
const matchesVoicePart = (profilePart: string, filterPart: string): boolean => {
  if (!filterPart) return true;
  if (profilePart === filterPart) return true;
  // If the filter is a single letter (S, A, T, B), match as a prefix prefix for the section
  return filterPart.length === 1 && profilePart.startsWith(filterPart);
};

// Double-layered filtering matching useProfiles.ts useMemo logic
const filterProfiles = (
  profiles: any[],
  filters: { voicePart: string; status: string; name: string }
) => {
  return profiles.filter((p) => {
    const matchesVoice = matchesVoicePart(p.voicePart, filters.voicePart);
    const matchesStatus = !filters.status || p.globalStatus === filters.status;
    const matchesName = !filters.name || p.name.toLowerCase().includes(filters.name.toLowerCase());
    return matchesVoice && matchesStatus && matchesName;
  });
};

// Filtered list specifically for calculating RosterSummary counts (not filtered by voice part)
const getProfilesForSummary = (
  profiles: any[],
  filters: { voicePart: string; status: string; name: string }
) => {
  return profiles.filter((p) => {
    const matchesStatus = !filters.status || p.globalStatus === filters.status;
    const matchesName = !filters.name || p.name.toLowerCase().includes(filters.name.toLowerCase());
    return matchesStatus && matchesName;
  });
};

const sampleProfiles = [
  { id: '1', name: 'Sarah Connor', voicePart: 'S1', globalStatus: 'Active (Current)' },
  { id: '2', name: 'Susan Storm', voicePart: 'S2', globalStatus: 'Active (Current)' },
  { id: '3', name: 'Arthur Pendragon', voicePart: 'A1', globalStatus: 'Active (Current)' },
  { id: '4', name: 'Amy Pond', voicePart: 'A2', globalStatus: 'Inactive' },
  { id: '5', name: 'Tony Stark', voicePart: 'T1', globalStatus: 'Active (Future)' },
  { id: '6', name: 'Bruce Banner', voicePart: 'B2', globalStatus: 'Active (Current)' },
];

test('matchesVoicePart correctly matches subparts', () => {
  assert.equal(matchesVoicePart('S1', 'S1'), true);
  assert.equal(matchesVoicePart('S1', 'S2'), false);
  assert.equal(matchesVoicePart('T2', 'T2'), true);
  assert.equal(matchesVoicePart('T2', 'T1'), false);
});

test('matchesVoicePart correctly matches sections by first letter prefix', () => {
  // S matches both S1 and S2
  assert.equal(matchesVoicePart('S1', 'S'), true);
  assert.equal(matchesVoicePart('S2', 'S'), true);
  
  // A matches A1 and A2
  assert.equal(matchesVoicePart('A1', 'A'), true);
  assert.equal(matchesVoicePart('A2', 'A'), true);
  
  // T matches T1 but not B2
  assert.equal(matchesVoicePart('T1', 'T'), true);
  assert.equal(matchesVoicePart('B2', 'T'), false);
});

test('matchesVoicePart handles empty filter part by returning true', () => {
  assert.equal(matchesVoicePart('S1', ''), true);
  assert.equal(matchesVoicePart('T2', ''), true);
});

test('filterProfiles filters by subparts correctly', () => {
  const result = filterProfiles(sampleProfiles, { voicePart: 'S1', status: '', name: '' });
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'Sarah Connor');
});

test('filterProfiles filters by full section correctly', () => {
  const result = filterProfiles(sampleProfiles, { voicePart: 'S', status: '', name: '' });
  assert.equal(result.length, 2);
  assert.equal(result[0].name, 'Sarah Connor');
  assert.equal(result[1].name, 'Susan Storm');
});

test('getProfilesForSummary bypasses voice part filter but respects status and name', () => {
  const filters = { voicePart: 'S1', status: 'Active (Current)', name: '' };
  
  // The table is filtered by S1 and Active (Current) -> only 1 profile (Sarah)
  const tableResult = filterProfiles(sampleProfiles, filters);
  assert.equal(tableResult.length, 1);
  assert.equal(tableResult[0].name, 'Sarah Connor');

  // The summary is filtered ONLY by Active (Current) -> Sarah (S1), Susan (S2), Arthur (A1), Bruce (B2)
  const summaryResult = getProfilesForSummary(sampleProfiles, filters);
  assert.equal(summaryResult.length, 4);
  
  // All parts remain visible in summary counts
  const voicePartsInSummary = summaryResult.map(p => p.voicePart);
  assert.ok(voicePartsInSummary.includes('S1'));
  assert.ok(voicePartsInSummary.includes('S2'));
  assert.ok(voicePartsInSummary.includes('A1'));
  assert.ok(voicePartsInSummary.includes('B2'));
});
