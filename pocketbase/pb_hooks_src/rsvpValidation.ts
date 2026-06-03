import type { PocketBaseRecord, PocketBaseApp } from './email/emailTypes';
import { processEmailQueue } from './email/queueProcessor';

declare const Record: new (collection: unknown, data?: unknown) => PocketBaseRecord;


export function parsePocketBaseDate(dateValue: unknown): Date | null {
    const raw = String(dateValue || "").trim();
    if (!raw) return null;

    const normalized = /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.replace(" ", "T") : raw;
    const withTimezone = /^\d{4}-\d{2}-\d{2}/.test(normalized) && !/(Z|[+-]\d{2}:?\d{2})$/.test(normalized)
        ? normalized + "Z"
        : normalized;

    try {
        const parsed = new Date(withTimezone);
        if (!Number.isNaN(parsed.getTime())) return parsed;
    } catch {
        // Goja can be stricter than browsers for date strings; fall back below.
    }

    try {
        const parsed = new Date(raw);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    } catch {
        return null;
    }
}

export function validateSingerRsvpWindow(event: PocketBaseRecord): { ok: true } | { ok: false; status: number; error: string } {
    const eventType = String(event.get("type") || "");

    if (eventType === "Performance" && !event.get("isOpenForRSVP")) {
        return {
            ok: false,
            status: 410,
            error: "The RSVP window for this performance is closed. Contact choir admins if you need help changing your commitment.",
        };
    }

    if (eventType === "Rehearsal") {
        const eventDate = parsePocketBaseDate(event.get("date"));
        if (!eventDate) {
            return { ok: false, status: 400, error: "Invalid rehearsal date." };
        }

        if (eventDate.getTime() < Date.now()) {
            return { ok: false, status: 410, error: "This rehearsal has already passed." };
        }
    }

    return { ok: true };
}

export function getRsvpWindowInfo(event: PocketBaseRecord): {
    canSubmit: boolean;
    isReadOnly: boolean;
    reason: string;
} {
    const eventType = String(event.get("type") || "");

    if (eventType === "Performance" && !event.get("isOpenForRSVP")) {
        return {
            canSubmit: false,
            isReadOnly: true,
            reason: "The RSVP window for this performance is closed. Your current response is shown below.",
        };
    }

    if (eventType === "Rehearsal") {
        const eventDate = parsePocketBaseDate(event.get("date"));
        if (!eventDate) {
            return {
                canSubmit: false,
                isReadOnly: true,
                reason: "Invalid rehearsal date.",
            };
        }

        if (eventDate.getTime() < Date.now()) {
            return {
                canSubmit: false,
                isReadOnly: true,
                reason: "This rehearsal has already passed.",
            };
        }
    }

    return {
        canSubmit: true,
        isReadOnly: false,
        reason: "",
    };
}

export function notifyAdminsOfDecline(app: any, eventId: string, profile: PocketBaseRecord, rsvpNote: string) {
    const voicePart = (profile.get("voicePart") as string) || "";
    // Primary singer signal check: profiles with empty voicePart are excluded from singer-focused contexts
    if (!voicePart) {
        return;
    }

    try {
        const adminUsers = app.findRecordsByFilter("users", "role = 'admin'", "");
        if (!adminUsers || adminUsers.length === 0) return;
        
        const adminUserIds = adminUsers.map((u: any) => u.id);
        
        const adminProfiles = app.findRecordsByFilter("profiles", "receiveRsvpDeclineNotices = true && globalStatus != 'Inactive'", "");
        if (!adminProfiles || adminProfiles.length === 0) return;

        let template: PocketBaseRecord | null = null;
        try {
            template = app.findFirstRecordByFilter("messageTemplates", "title = 'RSVP Decline Notice' && isSystemTemplate = true");
        } catch (err) {
            console.log("[RSVP Decline Hook Error] Failed to find RSVP Decline Notice template: " + err);
            return;
        }

        if (!template) {
            console.log("[RSVP Decline Hook Error] RSVP Decline Notice template is null");
            return;
        }

        let event: PocketBaseRecord | null = null;
        let eventTitle = "Event";
        try {
            event = app.findRecordById("events", eventId);
            if (event) {
                eventTitle = (event.get("title") || event.get("type") || "Event") as string;
            }
        } catch (err) {
            console.log("[RSVP Decline Hook Error] Failed to find event: " + err);
        }

        const queueCollection = app.findCollectionByNameOrId("emailQueue");
        const singerName = (profile.get("name") || "Singer") as string;

        const finalTemplate = template; // aliasing for local block type stability
        adminProfiles.forEach((adminProf: any) => {
            const userId = adminProf.get("user") as string;
            if (!userId || adminUserIds.indexOf(userId) === -1) {
                return;
            }

            const adminUser = adminUsers.find((u: any) => u.id === userId);
            const recipientEmail = adminUser ? (adminUser.get("email") as string) : "";
            if (!recipientEmail || adminProf.get("doNotEmail")) {
                return;
            }

            const adminName = (adminProf.get("name") || (adminUser ? adminUser.get("name") : "") || "Administrator") as string;

            let subject = (finalTemplate.get("subject") as string) || "";
            let content = (finalTemplate.get("content") as string) || "";

            subject = subject.replace(/{declinedSingerName}/g, singerName)
                             .replace(/{eventTitle}/g, eventTitle);

            content = content.replace(/{adminName}/g, adminName)
                             .replace(/{declinedSingerName}/g, singerName)
                             .replace(/{voicePart}/g, voicePart)
                             .replace(/{rsvpNote}/g, rsvpNote || "None provided");

            const queueRecord = new Record(queueCollection, {
                recipientId: adminProf.id,
                recipientEmail: recipientEmail,
                recipientName: adminName,
                subject: subject,
                rawContent: content,
                status: "Pending",
                attempts: 0,
                filters: JSON.stringify({
                    eventId: eventId,
                    type: "Automated Decline Notice"
                })
            });

            app.save(queueRecord);
        });

        // Trigger queue processor to dispatch emails immediately
        processEmailQueue(app);

    } catch (err) {
        console.log("[RSVP Decline Hook Error] Failed to process decline notifications: " + err);
    }
}

