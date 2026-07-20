import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Event } from '../src/services/eventService.ts';
import {
  getEffectiveApprovedSetList,
  getSingerFeaturedAssignments,
} from '../src/lib/eventUtils.ts';

function event(overrides: Partial<Event>): Event {
  return {
    id: 'event-1',
    title: 'Concert',
    type: 'Performance',
    date: '2026-12-01T19:00:00Z',
    details: '',
    parentPerformanceId: '',
    ...overrides,
  } as Event;
}

const featuredItem = {
  id: 'song-1',
  title: 'Solo Song',
  type: 'song' as const,
  isFeaturedNumber: true,
  performerCredits: [
    { kind: 'profile' as const, profileId: 'profile-1', displayName: 'Singer Name' },
    { kind: 'guest' as const, displayName: 'Guest Name' },
  ],
};

describe('featured assignment resolution', () => {
  it('returns approved assignments independent of RSVP data', () => {
    const performance = event({ setListApproved: true, setList: [featuredItem] });
    const result = getSingerFeaturedAssignments(performance, 'profile-1', [performance]);
    assert.equal(result.length, 1);
    assert.equal(result[0].label, 'Group');
  });

  it('hides assignments from unapproved lists and never matches guests', () => {
    const performance = event({ setListApproved: false, setList: [featuredItem] });
    assert.deepEqual(getSingerFeaturedAssignments(performance, 'profile-1'), []);
    assert.deepEqual(getSingerFeaturedAssignments(performance, 'Guest Name'), []);
  });

  it('uses an approved rehearsal focus list before the parent list', () => {
    const parent = event({ id: 'parent', setListApproved: true, setList: [featuredItem] });
    const rehearsalItem = {
      ...featuredItem,
      id: 'rehearsal-song',
      title: 'Rehearsal Solo',
    };
    const rehearsal = event({
      id: 'rehearsal',
      type: 'Rehearsal',
      parentPerformanceId: parent.id,
      setListApproved: true,
      setList: [rehearsalItem],
    });
    const effective = getEffectiveApprovedSetList(rehearsal, [parent, rehearsal]);
    assert.equal(effective?.sourceEvent.id, rehearsal.id);
    assert.equal(effective?.setList[0].title, 'Rehearsal Solo');
  });

  it('falls back to the approved parent when a rehearsal list is empty', () => {
    const parent = event({ id: 'parent', setListApproved: true, setList: [featuredItem] });
    const rehearsal = event({
      id: 'rehearsal',
      type: 'Rehearsal',
      parentPerformanceId: parent.id,
      setListApproved: true,
      setList: [],
    });
    const result = getSingerFeaturedAssignments(rehearsal, 'profile-1', [parent, rehearsal]);
    assert.equal(result.length, 1);
    assert.equal(result[0].sourceEvent.id, parent.id);
  });
});
