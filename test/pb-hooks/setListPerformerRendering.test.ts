import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderSetlistHtml } from '../../pocketbase/pb_hooks_src/email/hookPlaceholders.ts';
import { formatCalendarPerformerCredit } from '../../pocketbase/pb_hooks_src/calendarEndpoint.ts';
import { sanitizeSetListForPlayer } from '../../pocketbase/pb_hooks_src/playerEndpoints.ts';

const setList = [
  {
    id: 'song-1',
    title: 'Featured Song',
    isFeaturedNumber: true,
    performerCredits: [
      { kind: 'profile', profileId: 'secret-profile-id', displayName: '<Jane & Co.>' },
    ],
  },
];

describe('set-list performer publication rendering', () => {
  it('renders escaped approved credits in message set lists', () => {
    const html = renderSetlistHtml(setList, true);
    assert.match(html, /Solo — &lt;Jane &amp; Co\.&gt;/);
    assert.doesNotMatch(html, /secret-profile-id/);
  });

  it('withholds credits from draft message set lists while preserving titles', () => {
    const html = renderSetlistHtml(setList, false);
    assert.match(html, /Featured Song/);
    assert.doesNotMatch(html, /Solo/);
    assert.doesNotMatch(html, /Jane/);
  });

  it('formats calendar credits and TBA labels', () => {
    assert.equal(formatCalendarPerformerCredit(setList[0]), 'Solo — <Jane & Co.>');
    assert.equal(
      formatCalendarPerformerCredit({ title: 'TBA', isFeaturedNumber: true }),
      'Featured Number — Performers TBA'
    );
  });

  it('strips performer identity data from player payloads', () => {
    const sanitized = sanitizeSetListForPlayer(setList);
    assert.equal(sanitized[0].title, 'Featured Song');
    assert.equal(sanitized[0].performerCredits, undefined);
    assert.equal(sanitized[0].isFeaturedNumber, undefined);
  });
});
