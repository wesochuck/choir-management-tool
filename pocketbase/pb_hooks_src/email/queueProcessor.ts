import { parseJsonField } from './hookJson';
import type { EmailRecipient, PocketBaseRecord, PocketBaseApp } from './emailTypes';
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

/**
 * Retrieves HMAC secret for signature tokens.
 */
function getHmacSecret(app: PocketBaseApp): string {
    try {
        const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
        const parsed = parseJsonField<Record<string, string>>(record.get("value"));
        return (parsed && parsed.secret) ? parsed.secret : "";
    } catch (err) {
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
        "created", 
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
    const secret = getHmacSecret(app);
    let baseUrl = "http://localhost:5173";
    let mailingAddress = "123 Choir St, Harmony City, HC 12345";
    try {
        const commRecord = app.findFirstRecordByFilter("appSettings", "key = 'communications'");
        const comms = parseJsonField<Record<string, string>>(commRecord.get("value"));
        if (comms?.frontendUrl) baseUrl = comms.frontendUrl;
        if (comms?.mailingAddress) mailingAddress = comms.mailingAddress;
    } catch (e) {}
    baseUrl = normalizeBaseUrl(baseUrl);

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
    } catch (e) {}

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
                } catch (e) {}
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
                } catch (e) {}

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

                htmlBody = htmlBody.replace(/{eventTitle}/g, escapeHtml(eventTitle))
                                 .replace(/{eventType}/g, escapeHtml(eventType))
                                 .replace(/{eventDate}/g, escapeHtml(dateShort))
                                 .replace(/{eventLocation}/g, escapeHtml(venueName))
                                 .replace(/{eventDetails}/g, escapeHtml(eventDetails))
                                 .replace(/{{EVENT_INFO}}/g, eventInfoHtml)
                                 .replace(/{eventInfo}/g, eventInfoHtml);

                if ((htmlBody.includes("{{RSVP_LINKS}}") || htmlBody.includes("{rsvpLinks}")) && secret) {
                    const payload = `e=${event.id}&p=${recipientId}`;
                    const signature = $security.hs256(payload, secret);
                    const token = `${payload}&s=${signature}`;
                    const yesLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}&rsvp=Yes`;
                    const noLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}&rsvp=No`;
                    
                    const rsvpHtml = `
<div style="margin: 20px 0; display: flex; gap: 10px; justify-content: center; font-family: sans-serif;">
    <a href="${yesLink}" style="display: inline-block; padding: 10px 20px; background-color: #4a7c59; color: white; border-radius: 6px; font-weight: bold; text-decoration: none;">Yes, I'm attending</a>
    <a href="${noLink}" style="display: inline-block; padding: 10px 20px; background-color: #ef4444; color: white; border-radius: 6px; font-weight: bold; text-decoration: none;">No, I can't make it</a>
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
            const finalHtml = compileMailjetHtml(htmlBody, mailingAddress, unsubscribeUrl);
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
