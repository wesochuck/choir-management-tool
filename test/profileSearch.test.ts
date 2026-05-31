import test from 'node:test';
import assert from 'node:assert/strict';

interface TestProfile {
  name: string;
  email?: string;
  expand?: {
    user?: {
      email: string;
    };
  };
}

// Extract the search filter logic from useProfiles.ts
function matchesSearch(profile: TestProfile, query: string): boolean {
  if (!query) return true;
  const normalizedQuery = query.toLowerCase();
  const nameMatches = profile.name.toLowerCase().includes(normalizedQuery);
  const directEmail = profile.email || '';
  const expandedEmail = profile.expand?.user?.email || '';
  const emailMatches = directEmail.toLowerCase().includes(normalizedQuery) ||
                       expandedEmail.toLowerCase().includes(normalizedQuery);
  return nameMatches || emailMatches;
}

const mockProfiles: TestProfile[] = [
  { name: 'John Doe', email: 'john.doe@example.com' },
  { name: 'Jane Smith', expand: { user: { email: 'jane.smith@choir.org' } } },
  { name: 'Bob Ross' }, // No email
];

test('matchesSearch returns true for empty query', () => {
  assert.equal(matchesSearch(mockProfiles[0], ''), true);
  assert.equal(matchesSearch(mockProfiles[2], ''), true);
});

test('matchesSearch filters by name case-insensitively', () => {
  assert.equal(matchesSearch(mockProfiles[0], 'john'), true);
  assert.equal(matchesSearch(mockProfiles[0], 'doe'), true);
  assert.equal(matchesSearch(mockProfiles[0], 'Jane'), false);
});

test('matchesSearch filters by direct email address', () => {
  assert.equal(matchesSearch(mockProfiles[0], 'john.doe@'), true);
  assert.equal(matchesSearch(mockProfiles[0], 'example.com'), true);
  assert.equal(matchesSearch(mockProfiles[0], 'gmail.com'), false);
});

test('matchesSearch filters by expanded user account email address', () => {
  assert.equal(matchesSearch(mockProfiles[1], 'jane.smith@'), true);
  assert.equal(matchesSearch(mockProfiles[1], 'choir.org'), true);
  assert.equal(matchesSearch(mockProfiles[1], 'gmail.com'), false);
});

test('matchesSearch handles missing email addresses gracefully', () => {
  assert.equal(matchesSearch(mockProfiles[2], 'bob'), true);
  assert.equal(matchesSearch(mockProfiles[2], 'example'), false);
});
