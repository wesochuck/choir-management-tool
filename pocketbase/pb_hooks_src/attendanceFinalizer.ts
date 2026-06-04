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

    activeProfiles.forEach(profile => {
        let perfRsvpYes = false;
        try {
            const perfRosters = app.findRecordsByFilter(
                "eventRosters",
                "event = {:perfId} && profile = {:profileId}",
                "",
                1,
                0,
                { perfId: linkedPerfId, profileId: profile.id }
            );
            if (perfRosters && perfRosters.length > 0 && perfRosters[0].get("rsvp") === "Yes") {
                perfRsvpYes = true;
            }
        } catch {
            // ignore
        }

        if (perfRsvpYes) {
            let rosterRecord = null;
            try {
                const rosters = app.findRecordsByFilter(
                    "eventRosters",
                    "event = {:eventId} && profile = {:profileId}",
                    "",
                    1,
                    0,
                    { eventId: event.id, profileId: profile.id }
                );
                if (rosters && rosters.length > 0) {
                    rosterRecord = rosters[0];
                }
            } catch {
                // ignore
            }

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
    });
}
