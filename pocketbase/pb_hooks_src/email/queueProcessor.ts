import { parseJsonField } from './hookJson';
import type { PocketBaseRecord, PocketBaseApp } from './emailTypes';
import { escapeHtml, sanitizeEmailSubject, normalizeBaseUrl, formatInTimezone } from './hookText';
import { renderMarkdown } from './emailRendering';
import { compileMailjetHtml } from './mailjetRenderer';

declare class MailerMessage {
    constructor(config: {
        from: { address: string; name?: string };
        to: [{ address: string; name?: string }];
        subject: string;
        html: string;
    });
}

declare const $security: {
    hs256(payload: string, secret: string): string;
};

/**
 * Retrieves HMAC secret for signature tokens.
 */
function getQueueHmacSecret(app: PocketBaseApp): string {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField<Record<string, string>>(record.get("value"));
        return (parsed && parsed.secret) ? parsed.secret : "";
    } catch {
        return "";
    }
}

/**
 * Batches and dispatches pending emails from the queue using PocketBase's built-in SMTP Mailer.
 */
export function processEmailQueue(app: PocketBaseApp): void {
    const settings = app.settings();
    if (!settings.smtp || !settings.smtp.enabled) {
        console.log("[Queue Error] SMTP settings are not enabled in PocketBase.");
        return;
    }

    // Fetch oldest pending records to guarantee sequential order delivery
    const records = app.findRecordsByFilter(
        "emailQueue", 
        "status = 'Pending' && attempts < 3", 
        "", 
        50, // Process in controlled batches of 50
        0
    );

    if (!records || records.length === 0) return;

    // Transition state immediately to prevent race conditions during async sending
    records.forEach((r: PocketBaseRecord) => {
        r.set("status", "Processing");
        app.save(r);
    });

    // Build variables used for layout rendering
    const secret = getQueueHmacSecret(app);
    let baseUrl = "http://localhost:5173";
    let mailingAddress = "123 Choir St, Harmony City, HC 12345";
    let choirName = "";

    try {
        const commRecord = app.findFirstRecordByFilter("appSettings", "key = 'communications'");
        const comms = parseJsonField<Record<string, string>>(commRecord.get("value"));
        if (comms?.frontendUrl) baseUrl = comms.frontendUrl;
        if (comms?.mailingAddress) mailingAddress = comms.mailingAddress;
    } catch {
        // use default baseUrl and mailingAddress
    }
    baseUrl = normalizeBaseUrl(baseUrl);

    try {
        const choirRecord = app.findFirstRecordByFilter("appSettings", "key = 'choir_name'");
        const val = parseJsonField<string>(choirRecord.get("value"));
        if (val) choirName = val;
    } catch {
        // use default choirName
    }

    let timezone = "America/New_York";
    try {
        const tzSetting = app.findFirstRecordByFilter("appSettings", "key = 'timezone'");
        const valueStr = tzSetting.get("value");
        const tzP = parseJsonField<string | Record<string, string>>(valueStr);
        if (tzP) {
            if (typeof tzP === "string") {
                timezone = tzP;
            } else if (typeof tzP === "object" && tzP.timezone) {
                timezone = tzP.timezone;
            }
        }
    } catch {
        // use default timezone
    }

    records.forEach((record: PocketBaseRecord) => {
        try {
            const rawContent = record.get("rawContent") as string || "";
            const recipientId = record.get("recipientId") as string;
            const recipientEmail = record.get("recipientEmail") as string;
            const recipientName = record.get("recipientName") as string || "Singer";
            const filters = parseJsonField<Record<string, string>>(record.get("filters")) || {};

            // Temporarily protect placeholders containing underscores from markdown parsing
            const protectedContent = rawContent
                .replace(/{{MAILING_ADDRESS}}/g, "%%MAILINGADDRESS%%")
                .replace(/{{UNSUBSCRIBE_LINK}}/g, "%%UNSUBSCRIBELINK%%")
                .replace(/{{EVENT_INFO}}/g, "%%EVENTINFO%%")
                .replace(/{{RSVP_LINKS}}/g, "%%RSVPLINKS%%");

            let htmlBody = renderMarkdown(protectedContent);

            // Restore protected placeholders
            htmlBody = htmlBody
                .replace(/%%MAILINGADDRESS%%/g, "{{MAILING_ADDRESS}}")
                .replace(/%%UNSUBSCRIBELINK%%/g, "{{UNSUBSCRIBE_LINK}}")
                .replace(/%%EVENTINFO%%/g, "{{EVENT_INFO}}")
                .replace(/%%RSVPLINKS%%/g, "{{RSVP_LINKS}}");

            let subject = record.get("subject") as string || "";
            subject = subject.replace(/{singerName}/g, sanitizeEmailSubject(recipientName));

            // Fetch dynamic event details if enqueued under filters
            let event: PocketBaseRecord | null = null;
            if (filters && filters.eventId) {
                try {
                    event = app.findRecordById("events", filters.eventId);
                } catch {
                    // event not found
                }
            }

            // Perform template placeholder resolutions (same engine as legacy)
            htmlBody = htmlBody.replace(/{singerName}/g, escapeHtml(recipientName));
            htmlBody = htmlBody.replace(/{{MAILING_ADDRESS}}/g, escapeHtml(mailingAddress));

            if (event) {
                const eventDate = event.get("date") as string;
                const eventTitle = (event.get("title") || event.get("type") || "Event") as string;
                const eventType = (event.get("type") || "Performance") as string;
                const eventDetails = (event.get("details") || "") as string;
                let venueName = "TBD";
                try {
                    const venueRecord = app.findRecordById("venues", event.get("venue") as string);
                    venueName = (venueRecord.get("name") || "TBD") as string;
                } catch {
                    // venue not found
                }

                const dateLong = formatInTimezone(eventDate, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                const timeStr = formatInTimezone(eventDate, timezone, { hour: 'numeric', minute: '2-digit' });
                const dateShort = formatInTimezone(eventDate, timezone, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

                // Resolve event placeholders in subject too
                subject = subject.replace(/{eventTitle}/g, sanitizeEmailSubject(eventTitle))
                                 .replace(/{eventType}/g, sanitizeEmailSubject(eventType))
                                 .replace(/{eventDate}/g, sanitizeEmailSubject(dateShort));

                const eventInfoHtml = `
<div style="margin: 20px 0; padding: 15px; background-color: #f8faf9; border-left: 4px solid #4a7c59; border-radius: 4px; font-family: sans-serif;">
    <strong style="font-size: 1.1em; color: #1a1a1a;">${escapeHtml(eventTitle)}</strong><br>
    <div style="margin-top: 8px; font-size: 0.95em; color: #444; line-height: 1.6;">
        📅 <strong>${escapeHtml(dateLong)}</strong><br>
        ⏰ <strong>${escapeHtml(timeStr)}</strong><br>
        📍 <strong>${escapeHtml(venueName)}</strong>
    </div>
</div>
`;

                // Optionally generate an "Add to Calendar" link for the first rehearsal
                let firstRehearsalHtml = "";
                if (htmlBody.includes("{firstRehearsalCalendarLink}") && event.get("type") === "Performance") {
                    try {
                        const rehearsals = app.findRecordsByFilter("events", "parentPerformanceId = {:eventId}", "date", 1, 0, { eventId: event.id });
                        if (rehearsals && rehearsals.length > 0) {
                            const firstReh = rehearsals[0];
                            const rehDate = firstReh.get("date") as string;
                            const dLong = formatInTimezone(rehDate, timezone, { weekday: 'short', month: 'long', day: 'numeric' });
                            const dTime = formatInTimezone(rehDate, timezone, { hour: 'numeric', minute: '2-digit' });
                            
                            // Generate a direct link to the backend ICS download route
                            let icsLink = "";
                            if (secret) {
                                const payload = `e=${firstReh.id}&p=${recipientId}`;
                                const signature = $security.hs256(payload, secret);
                                const token = `${payload}&s=${signature}`;
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
                let eventCalendarHtml = "";
                if (htmlBody.includes("{eventCalendarLink}")) {
                    let icsLink = "";
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
                                const audition = app.findRecordById("auditions", auditionId);
                                const auditionSlot = audition.get("scheduledTimeSlot") as string;
                                if (auditionSlot) {
                                    slotDateLong = formatInTimezone(auditionSlot, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                                    slotTimeStr = formatInTimezone(auditionSlot, timezone, { hour: 'numeric', minute: '2-digit' });
                                }
                            } catch {
                                // Ignore audition record resolution/formatting errors
                            }
                        } else {
                            const payload = `e=${event.id}&p=${recipientId}`;
                            const signature = $security.hs256(payload, secret);
                            const token = `${payload}&s=${signature}`;
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

                htmlBody = htmlBody.replace(/{eventTitle}/g, escapeHtml(eventTitle))
                                 .replace(/{eventType}/g, escapeHtml(eventType))
                                 .replace(/{eventDate}/g, escapeHtml(dateShort))
                                 .replace(/{eventLocation}/g, escapeHtml(venueName))
                                 .replace(/{eventDetails}/g, escapeHtml(eventDetails))
                                 .replace(/{{EVENT_INFO}}/g, eventInfoHtml)
                                 .replace(/{eventInfo}/g, eventInfoHtml)
                                 .replace(/{firstRehearsalCalendarLink}/g, firstRehearsalHtml)
                                 .replace(/{eventCalendarLink}/g, eventCalendarHtml);

                if ((htmlBody.includes("{{RSVP_LINKS}}") || htmlBody.includes("{rsvpLinks}")) && secret) {
                    const payload = `e=${event.id}&p=${recipientId}`;
                    const signature = $security.hs256(payload, secret);
                    const token = `${payload}&s=${signature}`;
                    const rsvpLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}`;
                    
                    const rsvpHtml = `
<div style="margin: 24px 0; text-align: center; font-family: sans-serif;">
    <a href="${rsvpLink}" style="display: inline-block; padding: 14px 28px; background-color: #4a7c59; color: white; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Let us know if you can sing with us</a>
    <p style="margin-top: 12px; font-size: 12px; color: #718096;">No login required</p>
</div>
`;
                    htmlBody = htmlBody.replace(/{{RSVP_LINKS}}/g, rsvpHtml).replace(/{rsvpLinks}/g, rsvpHtml);
                }
            }

            // Compile secure unsubscribe URL
            let unsubscribeUrl = `${baseUrl}/unsubscribe`;
            if (secret) {
                const payload = `p=${recipientId}`;
                const signature = $security.hs256(payload, secret);
                const token = `${payload}&s=${signature}`;
                unsubscribeUrl = `${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
                htmlBody = htmlBody.replace(/{{UNSUBSCRIBE_LINK}}/g, unsubscribeUrl);
            }

            // Final template layout wrap
            const finalHtml = compileMailjetHtml(htmlBody, mailingAddress, unsubscribeUrl, choirName);
            record.set("htmlBody", finalHtml);

            // Dispatch natively via PocketBase SMTP Client
            const mailerMessage = new MailerMessage({
                from: { 
                    address: settings.meta.senderAddress || "no-reply@choir.management", 
                    name: settings.meta.senderName || "Choir Management Tool" 
                },
                to: [{ address: recipientEmail, name: recipientName }],
                subject: subject,
                html: finalHtml
            });

            app.newMailClient().send(mailerMessage);
            record.set("status", "Sent");
        } catch (err: unknown) {
            const rawAttempts = record.get("attempts");
            const attempts = typeof rawAttempts === "number" ? rawAttempts : 0;
            const currentAttempts = (isNaN(attempts) ? 0 : attempts) + 1;
            record.set("attempts", currentAttempts);
            const message = err instanceof Error ? err.message : String(err);
            record.set("errorMessage", message);
            record.set("status", currentAttempts >= 3 ? "Failed" : "Pending");
        } finally {
            app.save(record);
        }
    });
}
