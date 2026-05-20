import test from 'node:test';
import assert from 'node:assert/strict';

interface VoicePartDef {
  label: string;
  fullName: string;
}

interface Profile {
  id: string;
  name: string;
  voicePart: string;
}

interface EventRoster {
  profile: string;
  rsvp: 'Yes' | 'No' | 'Pending';
}

// Grouping and calculation logic matching our component implementation
function calculateVoicePartRSVPs(
  voiceParts: VoicePartDef[],
  activeProfiles: Profile[],
  eventRoster: EventRoster[]
) {
  const profileRosterMap = new Map<string, EventRoster>();
  eventRoster.forEach(item => {
    if (item.profile) {
      profileRosterMap.set(item.profile, item);
    }
  });

  const mappedSingers = activeProfiles.map(profile => {
    const roster = profileRosterMap.get(profile.id);
    const rsvp = roster?.rsvp || 'Pending';
    return {
      profile,
      rsvp,
    };
  });

  return voiceParts.map(vp => {
    const partSingers = mappedSingers.filter(s => s.profile.voicePart === vp.label);
    const yes = partSingers.filter(s => s.rsvp === 'Yes').length;
    const no = partSingers.filter(s => s.rsvp === 'No').length;
    const pending = partSingers.filter(s => s.rsvp === 'Pending').length;
    return {
      ...vp,
      yes,
      no,
      pending,
    };
  });
}

test('calculateVoicePartRSVPs computes exact counts for standard voice parts', () => {
  const voiceParts: VoicePartDef[] = [
    { label: 'S1', fullName: 'Soprano 1' },
    { label: 'S2', fullName: 'Soprano 2' },
    { label: 'A1', fullName: 'Alto 1' },
    { label: 'T1', fullName: 'Tenor 1' },
  ];

  const activeProfiles: Profile[] = [
    { id: 'p1', name: 'Singer A', voicePart: 'S1' },
    { id: 'p2', name: 'Singer B', voicePart: 'S1' },
    { id: 'p3', name: 'Singer C', voicePart: 'S2' },
    { id: 'p4', name: 'Singer D', voicePart: 'A1' },
    { id: 'p5', name: 'Singer E', voicePart: 'T1' },
  ];

  const eventRoster: EventRoster[] = [
    { profile: 'p1', rsvp: 'Yes' },
    { profile: 'p2', rsvp: 'No' },
    { profile: 'p3', rsvp: 'Yes' },
    { profile: 'p4', rsvp: 'Pending' },
    // p5 has no roster entry, should fallback to Pending
  ];

  const result = calculateVoicePartRSVPs(voiceParts, activeProfiles, eventRoster);

  // S1 has 2 singers: p1 (Yes), p2 (No)
  const s1 = result.find(r => r.label === 'S1');
  assert.ok(s1);
  assert.equal(s1.yes, 1);
  assert.equal(s1.no, 1);
  assert.equal(s1.pending, 0);

  // S2 has 1 singer: p3 (Yes)
  const s2 = result.find(r => r.label === 'S2');
  assert.ok(s2);
  assert.equal(s2.yes, 1);
  assert.equal(s2.no, 0);
  assert.equal(s2.pending, 0);

  // A1 has 1 singer: p4 (Pending)
  const a1 = result.find(r => r.label === 'A1');
  assert.ok(a1);
  assert.equal(a1.yes, 0);
  assert.equal(a1.no, 0);
  assert.equal(a1.pending, 1);

  // T1 has 1 singer: p5 (No entry -> Pending)
  const t1 = result.find(r => r.label === 'T1');
  assert.ok(t1);
  assert.equal(t1.yes, 0);
  assert.equal(t1.no, 0);
  assert.equal(t1.pending, 1);
});

test('calculateVoicePartRSVPs correctly flags empty sections as 0 attending', () => {
  const voiceParts: VoicePartDef[] = [
    { label: 'B1', fullName: 'Bass 1' },
    { label: 'B2', fullName: 'Bass 2' },
  ];

  const activeProfiles: Profile[] = [
    { id: 'p1', name: 'Singer F', voicePart: 'B1' },
  ];

  const eventRoster: EventRoster[] = [
    { profile: 'p1', rsvp: 'No' },
  ];

  const result = calculateVoicePartRSVPs(voiceParts, activeProfiles, eventRoster);

  // B1 has 1 singer but 0 Yes
  const b1 = result.find(r => r.label === 'B1');
  assert.ok(b1);
  assert.equal(b1.yes, 0);
  assert.equal(b1.no, 1);

  // B2 has 0 singers, so 0 yes, 0 no, 0 pending
  const b2 = result.find(r => r.label === 'B2');
  assert.ok(b2);
  assert.equal(b2.yes, 0);
  assert.equal(b2.no, 0);
  assert.equal(b2.pending, 0);
});
