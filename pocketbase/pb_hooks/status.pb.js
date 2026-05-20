// Profile Status Engine Hooks

const STATUS_HOOK_VERSION = "2026-05-19T21:30:00-04:00-inline-callbacks";

console.log("Profile status hook loaded: " + STATUS_HOOK_VERSION);

onRecordAfterUpdateSuccess((e) => {
    // Keep all logic inside the registered callback. PocketHost executes hook
    // callbacks in a context that may not resolve helper functions from this file.
    try {
        const roster = e && e.record;
        if (!roster) return;

        const saveProfileStatus = (profile) => {
            try {
                $app.saveNoValidate(profile);
            } catch (err) {
                let profileId = "unknown";
                try {
                    profileId = profile.get("id") || profile.id || "unknown";
                } catch (idErr) {}
                console.log("Failed to update automated profile status for " + profileId + ": " + err);
            }
        };

        const profileId = roster.get("profile");
        let profile;
        try {
            profile = $app.findRecordById("profiles", profileId);
        } catch (err) {
            return;
        }

        if (profile.get("statusIsManual")) return;

        const now = new Date().toISOString().replace("T", " ").split(".")[0];

        let futureRosters = [];
        try {
            futureRosters = $app.findRecordsByFilter(
                "eventRosters",
                "profile = {:profileId} && rsvp = 'Yes' && event.date >= {:now} && event.type = 'Performance'",
                "-event.date",
                1,
                0,
                { profileId: profileId, now: now }
            );
        } catch (err) {}

        if (futureRosters && futureRosters.length > 0) {
            if (profile.get("globalStatus") !== "Active (Future)" && profile.get("globalStatus") !== "Active (Current)") {
                profile.set("globalStatus", "Active (Future)");
                profile.set("statusLastChangedAt", now);
                profile.set("statusChangeReason", "Automated recovery via future RSVP");
                saveProfileStatus(profile);
            }
            return;
        }

        let pastRosters = [];
        try {
            pastRosters = $app.findRecordsByFilter(
                "eventRosters",
                "profile = {:profileId} && event.date < {:now} && event.type = 'Performance'",
                "-event.date",
                3,
                0,
                { profileId: profileId, now: now }
            );
        } catch (err) {}

        if (pastRosters && pastRosters.length === 3) {
            const allMissed = pastRosters.every(r => r.get("attendance") === "Absent" || r.get("rsvp") === "No");
            if (allMissed && profile.get("globalStatus") !== "Inactive") {
                profile.set("globalStatus", "Inactive");
                profile.set("statusLastChangedAt", now);
                profile.set("statusChangeReason", "Automated deactivation due to 3 consecutive misses");
                saveProfileStatus(profile);
            }
        }
    } catch (err) {
        let rosterId = "unknown";
        try {
            const roster = e && e.record;
            if (roster) rosterId = roster.get("id") || roster.id || "unknown";
        } catch (idErr) {}
        console.log("Profile status hook failed after eventRosters update for " + rosterId + ": " + err);
    }
}, "eventRosters");

onRecordAfterCreateSuccess((e) => {
    // Keep all logic inside the registered callback. PocketHost executes hook
    // callbacks in a context that may not resolve helper functions from this file.
    try {
        const roster = e && e.record;
        if (!roster) return;

        const saveProfileStatus = (profile) => {
            try {
                $app.saveNoValidate(profile);
            } catch (err) {
                let profileId = "unknown";
                try {
                    profileId = profile.get("id") || profile.id || "unknown";
                } catch (idErr) {}
                console.log("Failed to update automated profile status for " + profileId + ": " + err);
            }
        };

        const profileId = roster.get("profile");
        let profile;
        try {
            profile = $app.findRecordById("profiles", profileId);
        } catch (err) {
            return;
        }

        if (profile.get("statusIsManual")) return;

        const now = new Date().toISOString().replace("T", " ").split(".")[0];

        let futureRosters = [];
        try {
            futureRosters = $app.findRecordsByFilter(
                "eventRosters",
                "profile = {:profileId} && rsvp = 'Yes' && event.date >= {:now} && event.type = 'Performance'",
                "-event.date",
                1,
                0,
                { profileId: profileId, now: now }
            );
        } catch (err) {}

        if (futureRosters && futureRosters.length > 0) {
            if (profile.get("globalStatus") !== "Active (Future)" && profile.get("globalStatus") !== "Active (Current)") {
                profile.set("globalStatus", "Active (Future)");
                profile.set("statusLastChangedAt", now);
                profile.set("statusChangeReason", "Automated recovery via future RSVP");
                saveProfileStatus(profile);
            }
            return;
        }

        let pastRosters = [];
        try {
            pastRosters = $app.findRecordsByFilter(
                "eventRosters",
                "profile = {:profileId} && event.date < {:now} && event.type = 'Performance'",
                "-event.date",
                3,
                0,
                { profileId: profileId, now: now }
            );
        } catch (err) {}

        if (pastRosters && pastRosters.length === 3) {
            const allMissed = pastRosters.every(r => r.get("attendance") === "Absent" || r.get("rsvp") === "No");
            if (allMissed && profile.get("globalStatus") !== "Inactive") {
                profile.set("globalStatus", "Inactive");
                profile.set("statusLastChangedAt", now);
                profile.set("statusChangeReason", "Automated deactivation due to 3 consecutive misses");
                saveProfileStatus(profile);
            }
        }
    } catch (err) {
        let rosterId = "unknown";
        try {
            const roster = e && e.record;
            if (roster) rosterId = roster.get("id") || roster.id || "unknown";
        } catch (idErr) {}
        console.log("Profile status hook failed after eventRosters create for " + rosterId + ": " + err);
    }
}, "eventRosters");
