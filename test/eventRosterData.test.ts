import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mapSingersToRosters,
  calculateRsvpCounts,
  calculateSectionCounts,
  calculatePartCounts,
  filterMappedSingers,
  sortMappedSingers,
  type MappedSinger
} from '../src/lib/eventRosterUtils.ts';
import type { Profile } from '../src/services/profileService.ts';
import type { EventRoster } from '../src/services/rosterService.ts';
import type { SectionDef, VoicePartDef } from '../src/services/settingsService.ts';

describe('useEventRosterData pure helpers', () => {
  const mockProfiles = [
    { id: 'p1', name: 'Alice Smith', voicePart: 'S1', active: true, email: 'alice@example.com', sectionLeader: false },
    { id: 'p2', name: 'Bob Jones', voicePart: 'A1', active: true, email: 'bob@example.com', sectionLeader: false },
    { id: 'p3', name: 'Charlie Brown', voicePart: 'T1', active: true, email: 'charlie@example.com', sectionLeader: false }
  ] as unknown as Profile[];

  const mockRosters = [
    { id: 'r1', event: 'evt1', profile: 'p1', rsvp: 'Yes', attendance: 'Present' },
    { id: 'r2', event: 'evt1', profile: 'p2', rsvp: 'No', attendance: 'Absent' }
  ] as unknown as EventRoster[];

  const mockSections: SectionDef[] = [
    { code: 'S', name: 'Sopranos' },
    { code: 'A', name: 'Altos' },
    { code: 'T', name: 'Tenors' }
  ];

  const mockVoiceParts: VoicePartDef[] = [
    { label: 'S1', fullName: 'Soprano 1', sectionCode: 'S' },
    { label: 'A1', fullName: 'Alto 1', sectionCode: 'A' },
    { label: 'T1', fullName: 'Tenor 1', sectionCode: 'T' }
  ];

  describe('mapSingersToRosters', () => {
    it('correctly maps profiles to rosters and determines RSVPs', () => {
      const mapped = mapSingersToRosters(mockProfiles, mockRosters);
      assert.strictEqual(mapped.length, 3);

      assert.strictEqual(mapped[0].profile.id, 'p1');
      assert.strictEqual(mapped[0].rsvp, 'Yes');
      assert.strictEqual(mapped[0].roster?.id, 'r1');

      assert.strictEqual(mapped[1].profile.id, 'p2');
      assert.strictEqual(mapped[1].rsvp, 'No');
      assert.strictEqual(mapped[1].roster?.id, 'r2');

      assert.strictEqual(mapped[2].profile.id, 'p3');
      assert.strictEqual(mapped[2].rsvp, 'Pending');
      assert.strictEqual(mapped[2].roster, undefined);
    });
  });

  describe('calculateRsvpCounts', () => {
    it('correctly sums up Yes, No, and Pending RSVPs', () => {
      const mapped: MappedSinger[] = [
        { profile: mockProfiles[0], rsvp: 'Yes', roster: mockRosters[0] },
        { profile: mockProfiles[1], rsvp: 'No', roster: mockRosters[1] },
        { profile: mockProfiles[2], rsvp: 'Pending', roster: undefined }
      ];

      const counts = calculateRsvpCounts(mapped);
      assert.strictEqual(counts.yesCount, 1);
      assert.strictEqual(counts.noCount, 1);
      assert.strictEqual(counts.pendingCount, 1);
    });
  });

  describe('calculateSectionCounts', () => {
    it('sums singers by section using voicePart definitions', () => {
      const mapped: MappedSinger[] = [
        { profile: mockProfiles[0], rsvp: 'Yes', roster: mockRosters[0] },
        { profile: mockProfiles[1], rsvp: 'No', roster: mockRosters[1] },
        { profile: mockProfiles[2], rsvp: 'Pending', roster: undefined }
      ];

      const counts = calculateSectionCounts(mapped, mockSections, mockVoiceParts);
      assert.strictEqual(counts['S'], 1);
      assert.strictEqual(counts['A'], 1);
      assert.strictEqual(counts['T'], 1);
    });
  });

  describe('calculatePartCounts', () => {
    it('sums singers by exact voice part label', () => {
      const mapped: MappedSinger[] = [
        { profile: mockProfiles[0], rsvp: 'Yes', roster: mockRosters[0] },
        { profile: mockProfiles[1], rsvp: 'No', roster: mockRosters[1] },
        { profile: mockProfiles[2], rsvp: 'Pending', roster: undefined }
      ];

      const counts = calculatePartCounts(mapped, mockVoiceParts);
      assert.strictEqual(counts.get('S1'), 1);
      assert.strictEqual(counts.get('A1'), 1);
      assert.strictEqual(counts.get('T1'), 1);
      assert.strictEqual(counts.get('NonExistent'), undefined);
    });
  });

  describe('filterMappedSingers', () => {
    const mapped: MappedSinger[] = [
      { profile: mockProfiles[0], rsvp: 'Yes', roster: mockRosters[0] },
      { profile: mockProfiles[1], rsvp: 'No', roster: mockRosters[1] },
      { profile: mockProfiles[2], rsvp: 'Pending', roster: undefined }
    ];

    it('filters by RSVP status', () => {
      const yesFiltered = filterMappedSingers(mapped, 'Yes', [], mockVoiceParts, '');
      assert.strictEqual(yesFiltered.length, 1);
      assert.strictEqual(yesFiltered[0].profile.id, 'p1');

      const allFiltered = filterMappedSingers(mapped, 'All', [], mockVoiceParts, '');
      assert.strictEqual(allFiltered.length, 3);
    });

    it('filters by voice part selection', () => {
      const partFiltered = filterMappedSingers(mapped, 'All', ['S1'], mockVoiceParts, '');
      assert.strictEqual(partFiltered.length, 1);
      assert.strictEqual(partFiltered[0].profile.id, 'p1');
    });

    it('filters by search query case-insensitively', () => {
      const searchFiltered = filterMappedSingers(mapped, 'All', [], mockVoiceParts, 'ali');
      assert.strictEqual(searchFiltered.length, 1);
      assert.strictEqual(searchFiltered[0].profile.id, 'p1');
    });
  });

  describe('sortMappedSingers', () => {
    const mapped: MappedSinger[] = [
      { profile: mockProfiles[2], rsvp: 'Pending', roster: undefined }, // Charlie Brown, T1
      { profile: mockProfiles[0], rsvp: 'Yes', roster: mockRosters[0] }, // Alice Smith, S1
      { profile: mockProfiles[1], rsvp: 'No', roster: mockRosters[1] }  // Bob Jones, A1
    ];

    it('sorts by lastName as default', () => {
      const sorted = sortMappedSingers(mapped, 'lastName', mockVoiceParts);
      // Alphabetical by last name: Charlie Brown (Brown), Bob Jones (Jones), Alice Smith (Smith)
      assert.strictEqual(sorted[0].profile.name, 'Charlie Brown');
      assert.strictEqual(sorted[1].profile.name, 'Bob Jones');
      assert.strictEqual(sorted[2].profile.name, 'Alice Smith');
    });

    it('sorts by voicePart (S1 < A1 < T1)', () => {
      const sorted = sortMappedSingers(mapped, 'voicePart', mockVoiceParts);
      // Voice part order: S1 (Alice Smith), A1 (Bob Jones), T1 (Charlie Brown)
      assert.strictEqual(sorted[0].profile.name, 'Alice Smith');
      assert.strictEqual(sorted[1].profile.name, 'Bob Jones');
      assert.strictEqual(sorted[2].profile.name, 'Charlie Brown');
    });
  });
});
