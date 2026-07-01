import type { PocketBaseRecord, PocketBaseApp } from './email/emailTypes';
import { processEmailQueue } from './email/queueProcessor';

declare const Record: new (collection: unknown, data?: unknown) => PocketBaseRecord;

function getPerformerLabel(app: PocketBaseApp): string {
  try {
    const record = app.findFirstRecordByFilter('appSettings', "key = 'performer_label'");
    const value = record?.get('value');
    if (typeof value === 'string' && value.trim()) return value.trim();
  } catch {
    // ignore
  }
  return 'Performer';
}

export function notifyAdminsOfDecline(app: PocketBaseApp, eventId: string, profile: PocketBaseRecord, rsvpNote: string) {
    const voicePart = (profile.get("voicePart") as string) || "";
    // Primary singer signal check: profiles with empty voicePart are excluded from singer-focused contexts
    if (!voicePart) {
        return;
    }

    try {
        const adminUsers = app.findRecordsByFilter("users", "role = 'admin'", "");
        if (!adminUsers || adminUsers.length === 0) return;
        
        const adminUserIds = adminUsers.map((u: PocketBaseRecord) => u.id);
        
        const adminProfiles = app.findRecordsByFilter("profiles", "globalStatus != 'Inactive'", "");
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
        const performerLabel = getPerformerLabel(app);
        const singerName = (profile.get("name") || performerLabel) as string;

        const finalTemplate = template; // aliasing for local block type stability
        adminProfiles.forEach((adminProf: PocketBaseRecord) => {
            const userId = adminProf.get("user") as string;
            if (!userId || adminUserIds.indexOf(userId) === -1) {
                return;
            }

            const adminUser = adminUsers.find((u: PocketBaseRecord) => u.id === userId);
            const recipientEmail = adminUser ? (adminUser.get("email") as string) : "";
            
            // Check opt-out settings: receiveRsvpDeclineNotices or receiveAdminNotifications or doNotEmail
            const isOptedOut =
                adminProf.get("receiveRsvpDeclineNotices") === false ||
                adminProf.get("receiveAdminNotifications") === false;

            if (isOptedOut || adminProf.get("doNotEmail")) {
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
