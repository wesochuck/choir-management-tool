import type { PocketBaseApp, PocketBaseRecord } from '../email/emailTypes';
import type { MaintenanceState, MaintenanceTaskResult } from './maintenanceTypes';
import { formatInTimezone, escapeHtml, normalizeBaseUrl } from '../email/hookText';
import { coercePocketBaseDate } from '../pocketbaseDate';
import { parseJsonField } from '../email/hookJson';
import { renderMarkdown } from '../email/emailRendering';
import { renderSetlistHtml } from '../email/hookPlaceholders';
import { generateSignedEventRecipientToken, generateSignedPlayerToken } from '../hmacTokens';

declare const Record: new (collection: unknown, data?: unknown) => PocketBaseRecord;

export function runEventReminderTask(
  app: PocketBaseApp,
  state: MaintenanceState,
  now: Date
): MaintenanceTaskResult {
  let processed = 0;
  let queued = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  try {
    const nowMs = now.getTime();

    // 1. Fetch events that are active and have automated reminders enabled
    const events = app.findRecordsByFilter(
      'events',
      'enableAutomatedReminder = true && reminderSentAt = null && isArchived != true',
      'date',
      100,
      0
    );

    if (!events || events.length === 0) {
      return {
        task: 'eventReminder',
        status: 'ran',
        processed: 0,
        queued: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
      };
    }

    // 2. Fetch global configuration settings
    let timezone = 'America/New_York';
    try {
      const tzSetting = app.findFirstRecordByFilter('appSettings', "key = 'timezone'");
      const tzP = parseJsonField<string | { timezone?: string }>(tzSetting.get('value'));
      if (tzP) {
        if (typeof tzP === 'string') timezone = tzP;
        else if (tzP.timezone) timezone = tzP.timezone;
      }
    } catch (e) {}

    let choirName = 'Choir Management Tool';
    try {
      const choirRecord = app.findFirstRecordByFilter(
        'appSettings',
        "key = 'choir_name' || key = 'choirName'"
      );
      const parsed = parseJsonField<any>(choirRecord.get('value'));
      const val =
        parsed.name ||
        parsed.choirName ||
        parsed.value ||
        (typeof parsed === 'string' ? parsed : '');
      if (val) choirName = val;
    } catch (e) {}

    let baseUrl = 'http://localhost:5173';
    try {
      const commRecord = app.findFirstRecordByFilter('appSettings', "key = 'communications'");
      const comms = parseJsonField<any>(commRecord.get('value'));
      if (comms && comms.frontendUrl) baseUrl = comms.frontendUrl;
    } catch (e) {}
    if (baseUrl === 'http://localhost:5173' || !baseUrl || baseUrl.indexOf('localhost') !== -1) {
      const meta = app.settings()?.meta;
      const url = meta?.appUrl || meta?.appURL || '';
      if (url) baseUrl = url;
    }
    baseUrl = normalizeBaseUrl(baseUrl);

    // 3. Fetch active profiles and users
    const profiles = app.findRecordsByFilter(
      'profiles',
      "voicePart != '' && globalStatus != 'Inactive' && doNotEmail != true",
      'name',
      1000,
      0
    );

    if (!profiles || profiles.length === 0) {
      return {
        task: 'eventReminder',
        status: 'ran',
        processed: events.length,
        queued: 0,
        updated: 0,
        skipped: events.length,
        errors: 0,
      };
    }

    const users = app.findRecordsByFilter('users', "id != ''", '');
    const userMap: Record<string, PocketBaseRecord> = {};
    users.forEach((u) => {
      userMap[u.id] = u;
    });

    const queueCollection = app.findCollectionByNameOrId('emailQueue');

    // 4. Process each event
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      processed++;

      const eventDate = coercePocketBaseDate(event.get('date'));
      if (!eventDate) {
        skipped++;
        continue;
      }

      // If the event is already in the past, mark as sent and skip
      if (eventDate.getTime() <= nowMs) {
        try {
          event.set('reminderSentAt', now);
          app.save(event);
          updated++;
        } catch (err) {
          console.log(
            '[Event Reminder] Failed to mark past event ' + event.id + ' as reminder sent: ' + err
          );
          errors++;
        }
        continue;
      }

      const leadTimeHours =
        event.get('reminderLeadTimeHours') !== null &&
        event.get('reminderLeadTimeHours') !== undefined
          ? Number(event.get('reminderLeadTimeHours'))
          : 48;
      const leadTimeMs = leadTimeHours * 60 * 60 * 1000;

      // Check if we are within the lead time window
      if (eventDate.getTime() - nowMs > leadTimeMs) {
        skipped++;
        continue;
      }

      // Fetch the appropriate template based on event type
      const eventType = (event.get('type') || 'Performance') as string;
      const systemRole =
        eventType === 'Performance' ? 'performance_reminder' : 'rehearsal_reminder';

      let template: PocketBaseRecord | null = null;
      try {
        template = app.findFirstRecordByFilter('messageTemplates', 'systemRole = {:systemRole}', {
          systemRole,
        });
      } catch (e) {
        console.log('[Event Reminder] Template not found for systemRole: ' + systemRole);
        errors++;
        continue;
      }

      const eventTitle = (event.get('title') || eventType) as string;
      const eventDetails = (event.get('details') || '') as string;
      const eventCallTime = (event.get('callTime') || '') as string;

      let venueName = 'TBD';
      let venueAddress = '';
      try {
        const venueId = event.get('venue') as string;
        if (venueId) {
          const venueRecord = app.findRecordById('venues', venueId);
          venueName = (venueRecord.get('name') || 'TBD') as string;
          venueAddress = (venueRecord.get('address') || '') as string;
        }
      } catch (err) {}

      const dateLong = formatInTimezone(event.get('date') as string, timezone, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const timeStr = formatInTimezone(event.get('date') as string, timezone, {
        hour: 'numeric',
        minute: '2-digit',
      });
      const dateShort = formatInTimezone(event.get('date') as string, timezone, {
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

      let targetEventId = event.id;
      if (eventType === 'Rehearsal') {
        const parentId = event.get('parentPerformanceId') as string;
        if (parentId) {
          targetEventId = parentId;
        }
      }

      // Fetch "Yes" RSVPs for targetEventId
      const rosters = app.findRecordsByFilter(
        'eventRosters',
        'event = {:targetEventId} && rsvp = "Yes"',
        '',
        1000,
        0,
        { targetEventId }
      );

      const rsvpProfileMap: Record<string, boolean> = {};
      if (rosters) {
        rosters.forEach((r) => {
          const profileId = r.get('profile') as string;
          if (profileId) {
            rsvpProfileMap[profileId] = true;
          }
        });
      }

      let rawContentTemplate = (template.get('content') as string) || '';
      let subjectTemplate = (template.get('subject') as string) || 'Event Reminder';

      // Queue email for each active profile
      profiles.forEach((profile) => {
        if (!rsvpProfileMap[profile.id]) return;

        const userId = profile.get('user') as string;
        const user = userId ? userMap[userId] : null;
        const recipientEmail = user ? (user.get('email') as string) : '';
        const performerLabel = (() => {
          try {
            const r = app.findFirstRecordByFilter('appSettings', "key = 'performer_label'");
            const v = r?.get('value');
            return typeof v === 'string' && v.trim() ? v.trim() : 'Performer';
          } catch {
            return 'Performer';
          }
        })();
        const recipientName = (profile.get('name') || performerLabel) as string;

        if (!recipientEmail) return;

        // Perform token/link resolution
        const rsvpToken = generateSignedEventRecipientToken(event.id, profile.id);
        const rsvpLink = baseUrl + '/rsvp?token=' + encodeURIComponent(rsvpToken);
        const rsvpHtml = `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${rsvpLink}" style="display: inline-block; padding: 14px 28px; background-color: #4a7c59; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Let us know if you can sing with us</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">(No login required)</p>
</div>
`;

        const playerToken = generateSignedPlayerToken(event.id);
        const playerLink = baseUrl + '/player?token=' + encodeURIComponent(playerToken);
        const playerHtml = `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${playerLink}" style="display: inline-block; padding: 14px 28px; background-color: #1e3a8a; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Open Practice Player</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">Access practice tracks (No login required)</p>
</div>
`;

        // Resolve markdown content
        // Temporarily protect placeholders containing underscores from markdown parsing
        const protectedContent = rawContentTemplate
          .replace(/{{EVENT_INFO}}/g, '%%EVENTINFO%%')
          .replace(/{{RSVP_LINKS}}/g, '%%RSVPLINKS%%')
          .replace(/{{PLAYER_LINK}}/g, '%%PLAYERLINK%%');

        let htmlBody = renderMarkdown(protectedContent);

        // Restore protected placeholders
        htmlBody = htmlBody
          .replace(/%%EVENTINFO%%/g, '{{EVENT_INFO}}')
          .replace(/%%RSVPLINKS%%/g, '{{RSVP_LINKS}}')
          .replace(/%%PLAYERLINK%%/g, '{{PLAYER_LINK}}');

        // Replace all placeholders
        htmlBody = htmlBody
          .replace(/{singerName}/g, () => escapeHtml(recipientName))
          .replace(/{eventTitle}/g, () => escapeHtml(eventTitle))
          .replace(/{eventType}/g, () => escapeHtml(eventType))
          .replace(/{eventDate}/g, () => escapeHtml(dateShort))
          .replace(/{eventLocation}/g, () => locationHtml)
          .replace(/{eventCallTime}/g, () => escapeHtml(eventCallTime))
          .replace(/{eventDetails}/g, () => escapeHtml(eventDetails))
          .replace(/{{EVENT_INFO}}/g, () => eventInfoHtml)
          .replace(/{eventInfo}/g, () => eventInfoHtml)
          .replace(/{setlist}/g, () =>
            renderSetlistHtml(event.get('setList'), event.get('setListApproved') !== false)
          )
          .replace(/{{RSVP_LINKS}}/g, () => rsvpHtml)
          .replace(/{rsvpLinks}/g, () => rsvpHtml)
          .replace(/{{PLAYER_LINK}}/g, () => playerHtml)
          .replace(/{playerLink}/g, () => playerHtml)
          .replace(/{choirName}/g, () => escapeHtml(choirName));

        const subject = subjectTemplate
          .replace(/{eventTitle}/g, eventTitle)
          .replace(/{choirName}/g, choirName);

        try {
          const mailRecord = new Record(queueCollection, {
            recipientId: profile.id,
            recipientEmail: recipientEmail,
            recipientName: recipientName,
            subject: subject,
            rawContent: htmlBody,
            status: 'Pending',
            attempts: 0,
            filters: JSON.stringify({
              eventId: event.id,
              type: 'Event Automated Reminder',
            }),
          });
          app.save(mailRecord);
          queued++;
        } catch (err) {
          console.log(
            '[Event Reminder] Failed to enqueue reminder for profile ' + profile.id + ': ' + err
          );
          errors++;
        }
      });

      // Mark the event reminder as sent
      try {
        event.set('reminderSentAt', now);
        app.save(event);
        updated++;
      } catch (err) {
        console.log(
          '[Event Reminder] Failed to mark event ' + event.id + ' as reminder sent: ' + err
        );
        errors++;
      }
    }
  } catch (globalErr: any) {
    const msg = globalErr instanceof Error ? globalErr.message : String(globalErr);
    console.log('[Event Reminder] Task global error: ' + msg);
    errors++;
    return {
      task: 'eventReminder',
      status: 'failed',
      processed,
      queued,
      updated,
      skipped,
      errors,
      message: msg,
    };
  }

  return {
    task: 'eventReminder',
    status: errors > 0 ? 'failed' : 'ran',
    processed,
    queued,
    updated,
    skipped,
    errors,
  };
}
