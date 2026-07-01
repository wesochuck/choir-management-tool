import { parseJsonField } from '../email/hookJson';
import { renderSetlistHtml } from '../email/hookPlaceholders';
import type { PocketBaseApp, PocketBaseRequestEvent, PocketBaseRecord } from '../email/emailTypes';
import {
  getHmacSecret,
  generateSignedEventRecipientToken,
  generateSignedPlayerToken,
} from '../hmacTokens';
import { renderMarkdown } from '../email/emailRendering';
import { escapeHtml, normalizeBaseUrl, formatInTimezone } from '../email/hookText';

declare const $app: PocketBaseApp;
declare const $security: {
  hs256(data: string, secret: string): string;
  equal(a: string, b: string): boolean;
};
declare function routerAdd(
  method: string,
  path: string,
  handler: (e: PocketBaseRequestEvent) => unknown
): void;

routerAdd('POST', '/api/singer/resolve-placeholders', (e) => {
  // __SHARED_UTILS__

  const authRecord = e.auth;
  if (!authRecord) {
    return e.json(401, { error: 'Unauthorized' });
  }

  const data = e.requestInfo().body as { [key: string]: unknown };
  if (typeof data.content !== 'string') {
    return e.json(400, { error: 'Missing or invalid content parameter' });
  }
  const content: string = data.content;
  const eventId = typeof data.eventId === 'string' ? data.eventId : undefined;

  let profile: PocketBaseRecord;
  try {
    profile = $app.findFirstRecordByFilter('profiles', 'user = {:userId}', {
      userId: authRecord.id,
    });
  } catch {
    return e.json(404, { error: 'Profile not found' });
  }

  let secret: string;
  try {
    secret = getHmacSecret();
    if (!secret) throw new Error('Missing secret');
  } catch {
    return e.json(500, { error: 'HMAC_SECRET not configured' });
  }

  let baseUrl = '';
  try {
    let commSettings;
    try {
      commSettings = $app.findFirstRecordByFilter('appSettings', "key = 'communications'");
    } catch {
      commSettings = $app.findFirstRecordByFilter('appSettings', "key = 'communication'");
    }
    if (commSettings) {
      const parsed = parseJsonField<{ frontendUrl?: string }>(commSettings.get('value'));
      if (parsed && typeof parsed.frontendUrl === 'string') {
        baseUrl = parsed.frontendUrl;
      }
    }
  } catch (err) {
    console.log('[Resolve Placeholders Hook Error] Failed to read communication settings: ' + err);
  }

  if (!baseUrl || baseUrl === 'http://localhost:5173' || baseUrl.indexOf('localhost') !== -1) {
    const requestInfo = e.requestInfo();
    const host = requestInfo.headers?.['host'];
    const proto = requestInfo.headers?.['x-forwarded-proto'] || 'https';
    if (host && host.indexOf('localhost') === -1) {
      baseUrl = proto + '://' + host;
    } else {
      const meta = $app.settings()?.meta;
      const settingsAppUrl = meta?.appUrl || meta?.appURL || '';
      if (settingsAppUrl) {
        baseUrl = settingsAppUrl;
      } else if (host) {
        baseUrl = proto + '://' + host;
      } else {
        baseUrl = 'http://localhost:5173';
      }
    }
  }
  baseUrl = normalizeBaseUrl(baseUrl);

  let timezone = 'America/New_York';
  try {
    const tzSetting = $app.findFirstRecordByFilter('appSettings', "key = 'timezone'");
    const valueStr = tzSetting.get('value');
    const tzP = parseJsonField<string | { timezone?: string }>(valueStr);
    if (tzP) {
      if (typeof tzP === 'string') {
        timezone = tzP;
      } else if (
        typeof tzP === 'object' &&
        tzP !== null &&
        'timezone' in tzP &&
        typeof tzP.timezone === 'string'
      ) {
        timezone = tzP.timezone;
      }
    }
  } catch {
    // use default timezone
  }

  let event: PocketBaseRecord | null = null;
  if (eventId) {
    try {
      event = $app.findRecordById('events', eventId);
    } catch (err) {
      console.log('[Resolve Placeholders] Failed to find event: ' + err);
    }
  }

  // Temporarily protect placeholders containing underscores from markdown parsing
  const protectedContent = content
    .replace(/{{MAILING_ADDRESS}}/g, '%%MAILINGADDRESS%%')
    .replace(/{{UNSUBSCRIBE_LINK}}/g, '%%UNSUBSCRIBELINK%%')
    .replace(/{{EVENT_INFO}}/g, '%%EVENTINFO%%')
    .replace(/{{RSVP_LINKS}}/g, '%%RSVPLINKS%%')
    .replace(/{{PLAYER_LINK}}/g, '%%PLAYERLINK%%')
    .replace(/{{POLL_LINK:([a-zA-Z0-9]+)}}/g, (_, id) => '%%POLLLINK_' + id + '%%');

  let htmlBody = renderMarkdown(protectedContent);

  // Restore protected placeholders
  htmlBody = htmlBody
    .replace(/%%MAILINGADDRESS%%/g, '{{MAILING_ADDRESS}}')
    .replace(/%%UNSUBSCRIBELINK%%/g, '{{UNSUBSCRIBE_LINK}}')
    .replace(/%%EVENTINFO%%/g, '{{EVENT_INFO}}')
    .replace(/%%RSVPLINKS%%/g, '{{RSVP_LINKS}}')
    .replace(/%%PLAYERLINK%%/g, '{{PLAYER_LINK}}')
    .replace(/%%POLLLINK_([a-zA-Z0-9]+)%%/g, (_, id) => '{{POLL_LINK:' + id + '}}');

  // Resolve {singerName}
  const performerLabel = (() => {
    try { const r = $app.findFirstRecordByFilter('appSettings', "key = 'performer_label'"); const v = r?.get('value'); return typeof v === 'string' && v.trim() ? v.trim() : 'Performer'; } catch { return 'Performer'; }
  })();
  const recipientName = (profile.get('name') || performerLabel) as string;
  htmlBody = htmlBody.replace(/{singerName}/g, () => escapeHtml(recipientName));

  if (event) {
    const eventDate = String(event.get('date') || '');
    const eventTitle = (event.get('title') || event.get('type') || 'Event') as string;
    const eventType = (event.get('type') || 'Performance') as string;
    const eventDetails = (event.get('details') || '') as string;
    let venueName = 'TBD';
    let venueAddress = '';
    try {
      const venueRecord = $app.findRecordById('venues', event.get('venue') as string);
      venueName = (venueRecord.get('name') || 'TBD') as string;
      venueAddress = (venueRecord.get('address') || '') as string;
    } catch {
      // venue not found
    }

    const dateLong = formatInTimezone(eventDate, timezone, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const timeStr = formatInTimezone(eventDate, timezone, { hour: 'numeric', minute: '2-digit' });
    const dateShort = formatInTimezone(eventDate, timezone, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    let locationHtml = escapeHtml(venueName);
    if (venueAddress.trim()) {
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueAddress)}`;
      locationHtml = `<a href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener noreferrer" style="color: #4a7c59; text-decoration: underline;">${escapeHtml(venueName)}</a>`;
    }

    const eventInfoHtml = `
<div style="margin: 20px 0; padding: 15px; background-color: #f8faf9; border-left: 4px solid #4a7c59; border-radius: 4px; font-family: sans-serif;">
    <strong style="font-size: 1.1em; color: #1a1a1a;">${escapeHtml(eventTitle)}</strong><br>
    <div style="margin-top: 8px; font-size: 0.95em; color: #444; line-height: 1.6;">
        📅 <strong>${escapeHtml(dateLong)}</strong><br>
        ⏰ <strong>${escapeHtml(timeStr)}</strong><br>
        📍 <strong>${locationHtml}</strong>
    </div>
</div>
`;

    htmlBody = htmlBody
      .replace(/{eventTitle}/g, () => escapeHtml(eventTitle))
      .replace(/{eventType}/g, () => escapeHtml(eventType))
      .replace(/{eventDate}/g, () => escapeHtml(dateShort))
      .replace(/{eventLocation}/g, () => locationHtml)
      .replace(/{eventDetails}/g, () => escapeHtml(eventDetails))
      .replace(/{{EVENT_INFO}}/g, () => eventInfoHtml)
      .replace(/{eventInfo}/g, () => eventInfoHtml)
      .replace(/{setlist}/g, () => renderSetlistHtml(event.get('setList')));

    // Resolve RSVP links
    if (htmlBody.indexOf('{{RSVP_LINKS}}') !== -1 || htmlBody.indexOf('{rsvpLinks}') !== -1) {
      const token = generateSignedEventRecipientToken(event.id, profile.id);
      const rsvpLink = baseUrl + '/rsvp?token=' + encodeURIComponent(token);
      const rsvpHtml = `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${rsvpLink}" style="display: inline-block; padding: 14px 28px; background-color: #4a7c59; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Let us know if you can sing with us</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">(No login required)</p>
</div>
`;
      htmlBody = htmlBody
        .replace(/{{RSVP_LINKS}}/g, () => rsvpHtml)
        .replace(/{rsvpLinks}/g, () => rsvpHtml);
    }

    // Resolve Player links
    if (htmlBody.indexOf('{{PLAYER_LINK}}') !== -1 || htmlBody.indexOf('{playerLink}') !== -1) {
      const token = generateSignedPlayerToken(event.id);
      const playerLink = baseUrl + '/player?token=' + encodeURIComponent(token);
      const playerHtml = `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${playerLink}" style="display: inline-block; padding: 14px 28px; background-color: #1e3a8a; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Open Practice Player</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">Access practice tracks (No login required)</p>
</div>
`;
      htmlBody = htmlBody
        .replace(/{{PLAYER_LINK}}/g, () => playerHtml)
        .replace(/{playerLink}/g, () => playerHtml);
    }
  } else {
    // Clear event placeholders if no event is present
    htmlBody = htmlBody
      .replace(/{eventTitle}/g, '')
      .replace(/{eventType}/g, '')
      .replace(/{eventDate}/g, '')
      .replace(/{eventLocation}/g, '')
      .replace(/{eventDetails}/g, '')
      .replace(/{{EVENT_INFO}}/g, '')
      .replace(/{eventInfo}/g, '')
      .replace(/{{RSVP_LINKS}}/g, '')
      .replace(/{rsvpLinks}/g, '')
      .replace(/{{PLAYER_LINK}}/g, '')
      .replace(/{playerLink}/g, '')
      .replace(/{setlist}/g, '');
  }

  // Resolve Poll links
  const pollRegex = /{{POLL_LINK:([a-zA-Z0-9]+)}}/g;
  let match;
  while ((match = pollRegex.exec(htmlBody)) !== null) {
    const fullPlaceholder = match[0];
    const pollId = match[1];
    const payload = 'l=' + pollId + '&p=' + profile.id;
    const signature = $security.hs256(payload, secret);
    const token = payload + '&s=' + signature;
    const pollLink = baseUrl + '/poll?token=' + encodeURIComponent(token);

    let pollButtonLabel = 'Answer our quick question';
    try {
      const pollRecord = $app.findRecordById('polls', pollId);
      const question = pollRecord?.get('question');
      if (typeof question === 'string' && question.trim()) {
        pollButtonLabel = question.trim();
      }
    } catch {
      // Keep default fallback
    }

    const replacement = `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${pollLink}" style="display: inline-block; padding: 14px 28px; background-color: #7c4a4a; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${escapeHtml(pollButtonLabel)}</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">Engagement Poll (No login required)</p>
</div>
`.trim();
    htmlBody = htmlBody.replace(fullPlaceholder, replacement);
    pollRegex.lastIndex = 0; // Reset index since we replaced content
  }

  return e.json(200, { resolvedContent: htmlBody });
});
