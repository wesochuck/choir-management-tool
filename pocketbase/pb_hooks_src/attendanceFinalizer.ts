import type { PocketBaseApp, PocketBaseRecord } from './email/emailTypes';

declare const Record: new (collection: unknown, data?: unknown) => PocketBaseRecord;

export function finalizeUnmarkedAttendanceForEvent(app: PocketBaseApp, event: PocketBaseRecord): void {
    const isPerformance = event.get("type") === "Performance";
    const parentPerf = event.get("parentPerformanceId");
    const linkedPerfId = isPerformance ? event.id : (typeof parentPerf === "string" ? parentPerf : "");

    if (!linkedPerfId) return;

    let linkedPerformance = null;
    try {
        linkedPerformance = app.findRecordById("events", linkedPerfId);
    } catch {
        // ignore
    }

    if (!linkedPerformance) return;

    const activeProfiles = app.findRecordsByFilter("profiles", "voicePart != '' && globalStatus != 'Inactive'", "name", 1000, 0);

    // Batch: fetch all RSVP'd rosters for the linked performance at once
    const performingProfileIds: Record<string, boolean> = {};
    try {
        const perfRosters = app.findRecordsByFilter(
            "eventRosters",
            "event = {:perfId}",
            "",
            1000,
            0,
            { perfId: linkedPerfId }
        );
        if (perfRosters) {
            perfRosters.forEach(r => {
                if (r.get("rsvp") === "Yes") {
                    performingProfileIds[r.get("profile") as string] = true;
                }
            });
        }
    } catch {
        // ignore
    }

    // Batch: fetch all existing rosters for the current event at once
    const existingRostersByProfile: Record<string, PocketBaseRecord> = {};
    try {
        const existingRosters = app.findRecordsByFilter(
            "eventRosters",
            "event = {:eventId}",
            "",
            1000,
            0,
            { eventId: event.id }
        );
        if (existingRosters) {
            existingRosters.forEach(r => {
                existingRostersByProfile[r.get("profile") as string] = r;
            });
        }
    } catch {
        // ignore
    }

    for (const profile of activeProfiles || []) {
        if (!performingProfileIds[profile.id]) continue;

        let rosterRecord = existingRostersByProfile[profile.id] || null;

        if (!rosterRecord) {
            const rosterCollection = app.findCollectionByNameOrId("eventRosters");
            rosterRecord = new Record(rosterCollection, {
                event: event.id,
                profile: profile.id,
                rsvp: "Pending",
                attendance: "Absent"
            });
            try {
                app.save(rosterRecord);
            } catch (e) {
                console.log("Failed to auto-create Absent roster record: " + e);
            }
        } else if (rosterRecord.get("attendance") === "Pending" || rosterRecord.get("attendance") === "") {
            rosterRecord.set("attendance", "Absent");
            try {
                app.save(rosterRecord);
            } catch (e) {
                console.log("Failed to auto-update roster record to Absent: " + e);
            }
        }
    }
}
