import type { PocketBaseApp, PocketBaseRequestEvent, PocketBaseRecord } from './email/emailTypes';
import { parseJsonField } from './email/hookJson';

declare const $app: PocketBaseApp;

interface SeatingAssignmentChart {
    performance?: string;
    assignments?: Record<string, string>;
}

function getRecordString(record: PocketBaseRecord, field: string): string {
    const value = record.get(field);
    return typeof value === "string" ? value : "";
}

function getChartAssignments(record: PocketBaseRecord): Record<string, string> {
    const parsed = parseJsonField<SeatingAssignmentChart>(record.get("assignments"));
    if (parsed && typeof parsed === "object" && parsed.assignments && typeof parsed.assignments === "object") {
        return parsed.assignments;
    }

    const rawAssignments = parseJsonField<Record<string, string>>(record.get("assignments"));
    return rawAssignments && typeof rawAssignments === "object" ? rawAssignments : {};
}

function getSingerProfileForAuth(app: PocketBaseApp, authId: string): PocketBaseRecord | null {
    try {
        return app.findFirstRecordByFilter("profiles", "user = {:userId}", { userId: authId });
    } catch {
        return null;
    }
}

function isSingerOnEventRoster(app: PocketBaseApp, eventId: string, profileId: string): boolean {
    try {
        app.findFirstRecordByFilter(
            "eventRosters",
            "event = {:eventId} && profile = {:profileId}",
            { eventId, profileId },
        );
        return true;
    } catch {
        return false;
    }
}

export function handleSingerSeatingProfiles(e: PocketBaseRequestEvent): unknown {
    const authRecord = e.auth;
    if (!authRecord) {
        return e.json(401, { error: "Authentication required" });
    }

    const query = e.requestInfo().query;
    const eventId = typeof query["eventId"] === "string" ? query["eventId"] : "";
    const chartId = typeof query["chartId"] === "string" ? query["chartId"] : "";
    if (!eventId || !chartId) {
        return e.json(400, { error: "Missing eventId or chartId" });
    }

    const app = $app;
    const requestProfile = getSingerProfileForAuth(app, authRecord.id);
    if (!requestProfile || !isSingerOnEventRoster(app, eventId, requestProfile.id)) {
        return e.json(403, { error: "Forbidden" });
    }

    let chart: PocketBaseRecord;
    try {
        chart = app.findRecordById("pbc_seating_001", chartId);
    } catch {
        return e.json(404, { error: "Seating chart not found" });
    }

    if (getRecordString(chart, "performance") !== eventId) {
        return e.json(403, { error: "Forbidden" });
    }

    const assignments = getChartAssignments(chart);
    const profileIds = Array.from(new Set(Object.values(assignments).filter(id => typeof id === "string" && id.length > 0)));
    const profiles = profileIds.map(profileId => {
        try {
            const profile = app.findRecordById("profiles", profileId);
            return {
                id: profile.id,
                name: getRecordString(profile, "name"),
                voicePart: getRecordString(profile, "voicePart"),
            };
        } catch {
            return null;
        }
    }).filter((profile): profile is { id: string; name: string; voicePart: string } => profile !== null);

    return e.json(200, { profiles });
}
