import { parseJsonField } from './hookJson';
import { renderSetlistHtml } from './hookPlaceholders';
import {
  getHmacSecret,
  generateSignedPlayerToken,
  generateSignedEventRecipientToken,
} from '../hmacTokens';
import type { PocketBaseRecord, PocketBaseApp } from './emailTypes';
import { escapeHtml, sanitizeEmailSubject, normalizeBaseUrl, formatInTimezone } from './hookText';
import { renderMarkdown } from './emailRendering';
import { compileMailjetHtml } from './mailjetRenderer';
import { coercePocketBaseDate } from '../pocketbaseDate';
import { dispatchEmailViaBrevo, dispatchSmsViaBrevo } from './brevoAdapter';

declare class MailerMessage {
  constructor(config: {
    from: { address: string; name?: string };
    to: [{ address: string; name?: string }];
    subject: string;
    html?: string;
    text?: string;
  });
}

declare const $security: {
  hs256(payload: string, secret: string): string;
  randomString(length: number): string;
};

/**
 * Batches and dispatches pending emails from the queue using PocketBase's built-in SMTP Mailer.
 */
export function processEmailQueue(app: PocketBaseApp): void {
  const settings = app.settings();

  let provider = 'smtp';
  let brevoApiKey = '';

  try {
    const provRecord = app.findFirstRecordByFilter('appSettings', "key = 'email_provider'");
    const provConfig = parseJsonField<{ provider?: string; brevoApiKey?: string }>(
      provRecord.get('value')
    );
    if (provConfig) {
      if (provConfig.provider === 'brevo' && provConfig.brevoApiKey) {
        provider = 'brevo';
        brevoApiKey = provConfig.brevoApiKey;
      }
    }
  } catch {
    // Default to smtp
  }

  if (provider === 'smtp' && (!settings.smtp || !settings.smtp.enabled)) {
    console.log('[Queue Error] SMTP settings are not enabled in PocketBase.');
    return;
  }

  const EMAIL_QUEUE_BATCH_SIZE = 150;
  const EMAIL_QUEUE_MAX_ATTEMPTS = 3;
  const EMAIL_QUEUE_MAX_BATCHES_PER_INVOCATION = 6;

  // Stale Processing record recovery
  try {
    app
      .db()
      .newQuery(
        `
            UPDATE emailQueue
            SET status = 'Pending',
                processingRunId = NULL,
                processingStartedAt = NULL
            WHERE status = 'Processing'
              AND processingStartedAt < datetime('now', '-15 minutes')
              AND (attempts IS NULL OR attempts < {:maxAttempts})
        `
      )
      .bind({ maxAttempts: EMAIL_QUEUE_MAX_ATTEMPTS })
      .execute();

    app
      .db()
      .newQuery(
        `
            UPDATE emailQueue
            SET status = 'Failed',
                processingRunId = NULL,
                processingStartedAt = NULL
            WHERE status = 'Processing'
              AND processingStartedAt < datetime('now', '-15 minutes')
              AND attempts >= {:maxAttempts}
        `
      )
      .bind({ maxAttempts: EMAIL_QUEUE_MAX_ATTEMPTS })
      .execute();
  } catch (recoverErr) {
    console.log('[Email Queue] Error recovering stale records: ' + recoverErr);
  }

  // Build variables used for layout rendering
  const secret = getHmacSecret();
  let baseUrl = 'http://localhost:5173';
  let mailingAddress = '123 Choir St, Harmony City, HC 12345';
  let choirName = '';

  try {
    const commRecord = app.findFirstRecordByFilter('appSettings', "key = 'communications'");
    const comms = parseJsonField<Record<string, string>>(commRecord.get('value'));
    if (comms?.frontendUrl) baseUrl = comms.frontendUrl;
    if (comms?.mailingAddress) mailingAddress = comms.mailingAddress;
  } catch {
    // use default baseUrl and mailingAddress
  }

  if (baseUrl === 'http://localhost:5173' || !baseUrl || baseUrl.indexOf('localhost') !== -1) {
    const meta = app.settings()?.meta;
    const appSettingsUrl = meta?.appUrl || meta?.appURL || '';
    if (appSettingsUrl) {
      baseUrl = appSettingsUrl;
    }
  }
  baseUrl = normalizeBaseUrl(baseUrl);

  try {
    const choirRecord = app.findFirstRecordByFilter('appSettings', "key = 'choir_name'");
    const val = parseJsonField<string>(choirRecord.get('value'));
    if (val) choirName = val;
  } catch {
    // use default choirName
  }

  let timezone = 'America/New_York';
  try {
    const tzSetting = app.findFirstRecordByFilter('appSettings', "key = 'timezone'");
    const valueStr = tzSetting.get('value');
    const tzP = parseJsonField<string | Record<string, string>>(valueStr);
    if (tzP) {
      if (typeof tzP === 'string') {
        timezone = tzP;
      } else if (typeof tzP === 'object' && tzP.timezone) {
        timezone = tzP.timezone;
      }
    }
  } catch {
    // use default timezone
  }

  let totalClaimed = 0;

  for (let batchNumber = 1; batchNumber <= EMAIL_QUEUE_MAX_BATCHES_PER_INVOCATION; batchNumber++) {
    const runId = $security.randomString(20);
    console.log(
      `[Email Queue] Starting processing run: ${runId} (batch ${batchNumber}/${EMAIL_QUEUE_MAX_BATCHES_PER_INVOCATION})`
    );

    // Atomic SQLite-level claiming
    try {
      app
        .db()
        // SAFE: Parameterized query using bind(), preventing SQL injection
        .newQuery(
          `
                UPDATE emailQueue
                SET status = 'Processing',
                    processingRunId = {:runId},
                    processingStartedAt = datetime('now')
                WHERE id IN (
                    SELECT id
                    FROM emailQueue
                    WHERE status = 'Pending'
                      AND (attempts IS NULL OR attempts < {:maxAttempts})
                    ORDER BY created ASC
                    LIMIT {:batchSize}
                )
            `
        )
        .bind({
          runId: runId,
          maxAttempts: EMAIL_QUEUE_MAX_ATTEMPTS,
          batchSize: EMAIL_QUEUE_BATCH_SIZE,
        })
        .execute();
    } catch (claimErr) {
      console.log('[Email Queue] Error claiming records for run ' + runId + ': ' + claimErr);
      return;
    }

    const records = app.findRecordsByFilter(
      'emailQueue',
      "status = 'Processing' && processingRunId = {:runId}",
      'created',
      EMAIL_QUEUE_BATCH_SIZE,
      0,
      { runId }
    );

    if (!records || records.length === 0) {
      if (totalClaimed === 0) {
        console.log('[Email Queue] No records claimed for run: ' + runId);
      }
      break;
    }

    totalClaimed += records.length;
    console.log(`[Email Queue] Claimed ${records.length} records for run: ${runId}`);

    records.forEach((record: PocketBaseRecord) => {
      try {
        const rawContent = (record.get('rawContent') as string) || '';
        const recipientId = record.get('recipientId') as string;
        const recipientEmail = record.get('recipientEmail') as string;
        const performerLabel = (() => {
          try {
            const r = app.findFirstRecordByFilter('appSettings', "key = 'performer_label'");
            const v = r?.get('value');
            return typeof v === 'string' && v.trim() ? v.trim() : 'Performer';
          } catch {
            return 'Performer';
          }
        })();
        const recipientName = (record.get('recipientName') as string) || performerLabel;
        const filters = parseJsonField<Record<string, string>>(record.get('filters')) || {};
        const isSms = filters.channel === 'sms';

        // SMS entries: send plain text, skip HTML rendering and layout wrapping.
        // SMS carriers cannot render HTML — the SMTP2Go email-to-SMS gateway
        // delivers only the plain-text body to the recipient's phone.
        if (isSms) {
          const subject = (record.get('subject') as string) || '';

          let formattedPhone = recipientEmail.replace(/\D/g, '');
          if (formattedPhone) {
            try {
              const commSettingRec = app.findFirstRecordByFilter(
                'appSettings',
                "key = 'communications'"
              );
              const commSettings =
                parseJsonField<Record<string, unknown>>(commSettingRec?.get('value')) || {};
              const defaultCode = (commSettings.defaultCountryCode as string) || '1';

              if (formattedPhone.length === 10 && defaultCode === '1') {
                formattedPhone = defaultCode + formattedPhone;
              } else if (!formattedPhone.startsWith(defaultCode) && formattedPhone.length <= 10) {
                formattedPhone = defaultCode + formattedPhone;
              }
            } catch (e) {
              // Ignore missing setting
            }
          } else {
            formattedPhone = recipientEmail;
          }

          if (provider === 'brevo') {
            dispatchSmsViaBrevo(brevoApiKey, {
              senderName: settings.meta.senderName || 'Choir Management Tool',
              recipientPhone: formattedPhone,
              content: rawContent,
            });
          } else {
            // Dispatch as plain text via PocketBase SMTP Client
            const mailerMessage = new MailerMessage({
              from: {
                address: settings.meta.senderAddress || 'no-reply@choir.management',
                name: settings.meta.senderName || 'Choir Management Tool',
              },
              to: [{ address: formattedPhone + '@sms.smtp2go.com', name: recipientName }],
              subject: subject,
              text: rawContent,
            });

            app.newMailClient().send(mailerMessage);
          }

          record.set('status', 'Sent');
          record.set('sentAt', new Date().toISOString());
          record.set('processingRunId', null);
          record.set('processingStartedAt', null);
          record.set('errorMessage', '');
          console.log(`[Email Queue] Sent SMS record: ${record.id}`);
          return;
        }

        let htmlBody = '';
        if (filters.contentType === 'html') {
          htmlBody = rawContent;
        } else {
          // Temporarily protect placeholders containing underscores from markdown parsing
          const protectedContent = rawContent
            .replace(/{{MAILING_ADDRESS}}/g, '%%MAILINGADDRESS%%')
            .replace(/{{UNSUBSCRIBE_LINK}}/g, '%%UNSUBSCRIBELINK%%')
            .replace(/{{EVENT_INFO}}/g, '%%EVENTINFO%%')
            .replace(/{{RSVP_LINKS}}/g, '%%RSVPLINKS%%')
            .replace(/{{PLAYER_LINK}}/g, '%%PLAYERLINK%%')
            .replace(/{{TICKET_QR}}/g, '%%TICKETQR%%')
            .replace(/{{TICKET_BUTTON}}/g, '%%TICKETBUTTON%%')
            .replace(/{{POLL_LINK:([a-zA-Z0-9]+)}}/g, (_, id) => '%%POLLLINK_' + id + '%%');

          htmlBody = renderMarkdown(protectedContent);

          // Restore protected placeholders
          htmlBody = htmlBody
            .replace(/%%MAILINGADDRESS%%/g, '{{MAILING_ADDRESS}}')
            .replace(/%%UNSUBSCRIBELINK%%/g, '{{UNSUBSCRIBE_LINK}}')
            .replace(/%%EVENTINFO%%/g, '{{EVENT_INFO}}')
            .replace(/%%RSVPLINKS%%/g, '{{RSVP_LINKS}}')
            .replace(/%%PLAYERLINK%%/g, '{{PLAYER_LINK}}')
            .replace(/%%TICKETQR%%/g, '{{TICKET_QR}}')
            .replace(/%%TICKETBUTTON%%/g, '{{TICKET_BUTTON}}')
            .replace(/%%POLLLINK_([a-zA-Z0-9]+)%%/g, (_, id) => '{{POLL_LINK:' + id + '}}');
        }

        let subject = (record.get('subject') as string) || '';
        subject = subject.replace(/{singerName}/g, () => sanitizeEmailSubject(recipientName));

        // Fetch dynamic event details if enqueued under filters
        let event: PocketBaseRecord | null = null;
        if (filters && filters.eventId) {
          try {
            event = app.findRecordById('events', filters.eventId);
          } catch {
            // event not found
          }
        }

        // Perform template placeholder resolutions (same engine as legacy)
        htmlBody = htmlBody.replace(/{singerName}/g, () => escapeHtml(recipientName));
        htmlBody = htmlBody.replace(/{{MAILING_ADDRESS}}/g, () => escapeHtml(mailingAddress));

        if (event) {
          const eventDate = coercePocketBaseDate(event.get('date')) ?? new Date('');
          const eventTitle = (event.get('title') || event.get('type') || 'Event') as string;
          const eventType = (event.get('type') || 'Performance') as string;
          const eventDetails = (event.get('details') || '') as string;
          let venueName = 'TBD';
          let venueAddress = '';
          try {
            const venueRecord = app.findRecordById('venues', event.get('venue') as string);
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
          const timeStr = formatInTimezone(eventDate, timezone, {
            hour: 'numeric',
            minute: '2-digit',
          });
          const dateShort = formatInTimezone(eventDate, timezone, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          });

          // Resolve event placeholders in subject too
          subject = subject
            .replace(/{eventTitle}/g, () => sanitizeEmailSubject(eventTitle))
            .replace(/{eventType}/g, () => sanitizeEmailSubject(eventType))
            .replace(/{eventDate}/g, () => sanitizeEmailSubject(dateShort));

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

          // Optionally generate an "Add to Calendar" link for the first rehearsal
          let firstRehearsalHtml = '';
          if (
            htmlBody.includes('{firstRehearsalCalendarLink}') &&
            event.get('type') === 'Performance'
          ) {
            try {
              const rehearsals = app.findRecordsByFilter(
                'events',
                'parentPerformanceId = {:eventId}',
                'date',
                1,
                0,
                { eventId: event.id }
              );
              if (rehearsals && rehearsals.length > 0) {
                const firstReh = rehearsals[0];
                const rehDate = coercePocketBaseDate(firstReh.get('date')) ?? new Date('');
                const dLong = formatInTimezone(rehDate, timezone, {
                  weekday: 'short',
                  month: 'long',
                  day: 'numeric',
                });
                const dTime = formatInTimezone(rehDate, timezone, {
                  hour: 'numeric',
                  minute: '2-digit',
                });

                // Generate a direct link to the backend ICS download route
                let icsLink = '';
                if (secret) {
                  const token = generateSignedEventRecipientToken(firstReh.id, recipientId);
                  icsLink = `${baseUrl}/api/calendar/download?token=${encodeURIComponent(token)}`;
                }

                firstRehearsalHtml = `
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 16px 0; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; font-family: sans-serif; font-size: 0.9em; box-sizing: border-box; width: 100%;">
  <tr>
    <td align="left" valign="middle" style="padding: 12px; font-family: sans-serif; font-size: 14px; line-height: 1.5; color: #334155;">
        <strong style="color: #4a7c59;">First Rehearsal:</strong><br>
        ${escapeHtml(dLong)} at ${escapeHtml(dTime)}
    </td>
    <td align="right" valign="middle" style="padding: 12px; padding-left: 10px; width: 120px;">
        ${icsLink ? `<a href="${icsLink}" style="display: inline-block; padding: 8px 16px; background-color: #f1f5f9; color: #475569; border-radius: 4px; text-decoration: none; font-weight: 600; border: 1px solid #cbd5e1; font-family: sans-serif; font-size: 13px; white-space: nowrap;">Add to Calendar</a>` : ''}
    </td>
  </tr>
</table>
                                `.trim();
              }
            } catch {
              // Ignore rehearsals fetching or formatting errors
            }
          }

          // Optionally generate an "Add to Calendar" link for the event itself (or audition)
          let eventCalendarHtml = '';
          if (htmlBody.includes('{eventCalendarLink}')) {
            let icsLink = '';
            let slotDateLong = dateLong;
            let slotTimeStr = timeStr;

            if (secret) {
              const auditionId = filters.auditionId as string | undefined;
              if (auditionId) {
                const payload = `a=${auditionId}`;
                const signature = $security.hs256(payload, secret);
                const token = `${payload}&s=${signature}`;
                icsLink = `${baseUrl}/api/calendar/download?token=${encodeURIComponent(token)}`;

                try {
                  const audition = app.findRecordById('auditions', auditionId);
                  const auditionSlot =
                    coercePocketBaseDate(audition.get('scheduledTimeSlot')) ?? new Date('');
                  if (auditionSlot) {
                    slotDateLong = formatInTimezone(auditionSlot, timezone, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    });
                    slotTimeStr = formatInTimezone(auditionSlot, timezone, {
                      hour: 'numeric',
                      minute: '2-digit',
                      timeZoneName: 'short',
                    });
                  }
                } catch {
                  // Ignore audition record resolution/formatting errors
                }
              } else {
                const token = generateSignedEventRecipientToken(event.id, recipientId);
                icsLink = `${baseUrl}/api/calendar/download?token=${encodeURIComponent(token)}`;
              }
            }

            eventCalendarHtml = `
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 16px 0; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; font-family: sans-serif; font-size: 0.9em; box-sizing: border-box; width: 100%;">
  <tr>
    <td align="left" valign="middle" style="padding: 12px; font-family: sans-serif; font-size: 14px; line-height: 1.5; color: #334155;">
        <strong style="color: #4a7c59;">Save the Date:</strong><br>
        ${escapeHtml(slotDateLong)} at ${escapeHtml(slotTimeStr)}
    </td>
    <td align="right" valign="middle" style="padding: 12px; padding-left: 10px; width: 120px;">
        ${icsLink ? `<a href="${icsLink}" style="display: inline-block; padding: 8px 16px; background-color: #f1f5f9; color: #475569; border-radius: 4px; text-decoration: none; font-weight: 600; border: 1px solid #cbd5e1; font-family: sans-serif; font-size: 13px; white-space: nowrap;">Add to Calendar</a>` : ''}
    </td>
  </tr>
</table>
                        `.trim();
          }

          htmlBody = htmlBody
            .replace(/{eventTitle}/g, () => escapeHtml(eventTitle))
            .replace(/{eventType}/g, () => escapeHtml(eventType))
            .replace(/{eventDate}/g, () => escapeHtml(dateShort))
            .replace(/{eventLocation}/g, () => locationHtml)
            .replace(/{eventDetails}/g, () => escapeHtml(eventDetails))
            .replace(/{{EVENT_INFO}}/g, () => eventInfoHtml)
            .replace(/{eventInfo}/g, () => eventInfoHtml)
            .replace(/{setlist}/g, () => renderSetlistHtml(event.get('setList')))
            .replace(/{firstRehearsalCalendarLink}/g, () => firstRehearsalHtml)
            .replace(/{eventCalendarLink}/g, () => eventCalendarHtml);

          if ((htmlBody.includes('{{RSVP_LINKS}}') || htmlBody.includes('{rsvpLinks}')) && secret) {
            const token = generateSignedEventRecipientToken(event.id, recipientId);
            const rsvpLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}`;

            const rsvpHtml = `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${rsvpLink}" style="display: inline-block; padding: 14px 28px; background-color: #4a7c59; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Let us know if you can sing with us</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">No login required</p>
</div>
`;
            htmlBody = htmlBody
              .replace(/{{RSVP_LINKS}}/g, () => rsvpHtml)
              .replace(/{rsvpLinks}/g, () => rsvpHtml);
          }

          if (
            (htmlBody.includes('{{PLAYER_LINK}}') || htmlBody.includes('{playerLink}')) &&
            secret
          ) {
            const token = generateSignedPlayerToken(event.id);
            const playerLink = `${baseUrl}/player?token=${encodeURIComponent(token)}`;

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
          // If there's no event context, clear out the player link placeholders
          htmlBody = htmlBody.replace(/{{PLAYER_LINK}}/g, '').replace(/{playerLink}/g, '');
        }

        // Clear setlist placeholder when no event
        if (!event) {
          htmlBody = htmlBody.replace(/{setlist}/g, '');
        }

        // Resolve ticket QR code placeholder
        if (htmlBody.includes('{{TICKET_QR}}') && filters.ticketToken && filters.qrSvgSrc) {
          const isBundle = !!filters.bundleId;
          const caption = isBundle
            ? '<p style="text-align:center; color:#475569; font-size:13px; margin:8px 0 0;">Valid for any of the included performances</p>'
            : '';
          const ticketQrHtml = `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    ${caption}
    <img src="${filters.qrSvgSrc}"
         style="display:block; margin:12px auto; max-width:280px; border:1px solid #e2e8f0; border-radius:8px; padding:8px; background:#fff"
         alt="If you don't see the QR, use the 'View your ticket QR' button below" />
    <a href="${filters.successUrl || baseUrl + '/tickets/order/success'}"
       style="display:block; margin:12px auto; padding:12px 24px; background:#4a7c59; color:white; text-align:center; border-radius:8px; font-weight:bold; text-decoration:none; max-width:320px">
        View your ticket QR
    </a>
    <p style="margin-top:8px; font-size:12px; color:#718096;">Pro tip: open this email on your phone for quick scanning at the door.</p>
</div>`.trim();
          htmlBody = htmlBody.replace(/{{TICKET_QR}}/g, () => ticketQrHtml);
        } else {
          htmlBody = htmlBody.replace(/{{TICKET_QR}}/g, '');
        }

        // Resolve ticket button placeholder (styled CTA without requiring QR SVG)
        if (htmlBody.includes('{{TICKET_BUTTON}}') && filters.successUrl) {
          const ticketButtonHtml = `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${escapeHtml(filters.successUrl)}"
       style="display: inline-block; padding: 14px 28px; background-color: #4a7c59; color: #ffffff; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        View Your Tickets
    </a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">
        Open this link on your phone at the door for quick verification.
    </p>
</div>`.trim();
          htmlBody = htmlBody.replace(/{{TICKET_BUTTON}}/g, () => ticketButtonHtml);
        } else {
          htmlBody = htmlBody.replace(/{{TICKET_BUTTON}}/g, '');
        }

        // Resolve poll links: {{POLL_LINK:pollId}}
        if (htmlBody.includes('{{POLL_LINK:') && secret) {
          htmlBody = htmlBody.replace(/{{POLL_LINK:([a-zA-Z0-9]+)}}/g, (_, pollId) => {
            const payload = 'l=' + pollId + '&p=' + recipientId;
            const signature = $security.hs256(payload, secret);
            const token = payload + '&s=' + signature;
            const pollLink = baseUrl + '/poll?token=' + encodeURIComponent(token);
            let pollButtonLabel = 'Answer our quick question';

            try {
              const pollRecord = app.findRecordById('polls', pollId);
              const question = pollRecord?.get('question');
              if (typeof question === 'string' && question.trim()) {
                pollButtonLabel = question.trim();
              }
            } catch {
              // keep safe fallback label if poll lookup fails
            }

            return `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${pollLink}" style="display: inline-block; padding: 14px 28px; background-color: #7c4a4a; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${escapeHtml(pollButtonLabel)}</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">Engagement Poll (No login required)</p>
</div>
`.trim();
          });
        }

        // Compile secure unsubscribe URL
        let unsubscribeUrl = `${baseUrl}/unsubscribe`;
        if (secret) {
          const payload = `p=${recipientId}`;
          const signature = $security.hs256(payload, secret);
          const token = `${payload}&s=${signature}`;
          unsubscribeUrl = `${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
          htmlBody = htmlBody.replace(/{{UNSUBSCRIBE_LINK}}/g, () => unsubscribeUrl);
        }

        // Final template layout wrap
        const finalHtml = compileMailjetHtml(htmlBody, mailingAddress, unsubscribeUrl, choirName);
        record.set('htmlBody', finalHtml);

        // Dispatch natively or via Brevo
        if (provider === 'brevo') {
          dispatchEmailViaBrevo(brevoApiKey, {
            senderName: settings.meta.senderName || 'Choir Management Tool',
            senderAddress: settings.meta.senderAddress || 'no-reply@choir.management',
            recipientName: recipientName,
            recipientEmail: recipientEmail,
            subject: subject,
            htmlContent: finalHtml,
            textContent: rawContent,
          });
        } else {
          // Dispatch natively via PocketBase SMTP Client
          const mailerMessage = new MailerMessage({
            from: {
              address: settings.meta.senderAddress || 'no-reply@choir.management',
              name: settings.meta.senderName || 'Choir Management Tool',
            },
            to: [{ address: recipientEmail, name: recipientName }],
            subject: subject,
            html: finalHtml,
          });

          app.newMailClient().send(mailerMessage);
        }

        record.set('status', 'Sent');
        record.set('sentAt', new Date().toISOString());
        record.set('processingRunId', null);
        record.set('processingStartedAt', null);
        record.set('errorMessage', '');
        console.log(`[Email Queue] Sent record: ${record.id}`);
      } catch (err: unknown) {
        const rawAttempts = record.get('attempts');
        const attempts = typeof rawAttempts === 'number' ? rawAttempts : 0;
        const currentAttempts = (isNaN(attempts) ? 0 : attempts) + 1;
        record.set('attempts', currentAttempts);
        const message = err instanceof Error ? err.message : String(err);
        record.set('errorMessage', message);
        const nextStatus = currentAttempts >= EMAIL_QUEUE_MAX_ATTEMPTS ? 'Failed' : 'Pending';
        record.set('status', nextStatus);
        record.set('processingRunId', null);
        record.set('processingStartedAt', null);
        console.log(
          `[Email Queue] Failed record: ${record.id}, attempts: ${currentAttempts}, error: ${message}`
        );
      } finally {
        app.save(record);
      }
    });

    if (records.length < EMAIL_QUEUE_BATCH_SIZE) {
      break;
    }
  }

  if (totalClaimed >= EMAIL_QUEUE_BATCH_SIZE * EMAIL_QUEUE_MAX_BATCHES_PER_INVOCATION) {
    console.log(
      '[Email Queue] Max batches reached; additional pending records will continue in the next invocation.'
    );
  }
}
