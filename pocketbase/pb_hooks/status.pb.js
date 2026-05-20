// Profile Status Engine Hooks

const STATUS_HOOK_VERSION = "2026-05-19T21:20:00-04:00-robust-wrapper";

console.log("Profile status hook loaded: " + STATUS_HOOK_VERSION);

onRecordAfterUpdateSuccess((e) => {
    handleProfileStatusHook(e, "update");
}, "eventRosters");

onRecordAfterCreateSuccess((e) => {
    handleProfileStatusHook(e, "create");
}, "eventRosters");

function handleProfileStatusHook(e, action) {
    try {
        runProfileStatusUpdate(e && e.record, action);
    } catch (err) {
        logProfileStatusHookFailure(null, action, err);
    }
}

function runProfileStatusUpdate(roster, action) {
    try {
        if (!roster) {
            return;
        }
        updateProfileStatus(roster);
    } catch (err) {
        // This hook is advisory. Attendance writes must never fail after the
        // roster row has already been saved.
        logProfileStatusHookFailure(roster, action, err);
    }
}

function logProfileStatusHookFailure(roster, action, err) {
    let rosterId = "unknown";
    try {
        if (roster && typeof roster.get === "function") {
            rosterId = roster.get("id") || roster.id || "unknown";
        } else if (roster && roster.id) {
            rosterId = roster.id;
        }
    } catch (idErr) {}

    console.log("Profile status hook failed after eventRosters " + action + " for " + rosterId + ": " + err);
}

function saveProfileStatus(profile) {
    try {
        // Status automation should not block attendance/RSVP writes if an
        // older profile has unrelated values that no longer pass validation.
        $app.saveNoValidate(profile);
    } catch (err) {
        let profileId = "unknown";
        try {
            profileId = profile.get("id") || profile.id || "unknown";
        } catch (idErr) {}
        console.log("Failed to update automated profile status for " + profileId + ": " + err);
    }
}

function updateProfileStatus(roster) {
    const profileId = roster.get("profile");
    let profile;
    try {
        profile = $app.findRecordById("profiles", profileId);
    } catch (err) {
        return; // Profile not found
    }

    if (profile.get("statusIsManual")) {
        return;
    }

    const now = new Date().toISOString().replace('T', ' ').split('.')[0];

    // 1. Check for Recovery (Future events)
    // Find any future Performance with rsvp = 'Yes'
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

    // 2. Check for Inactivity (3 past misses)
    // Find last 3 past Performances
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
        if (allMissed) {
            if (profile.get("globalStatus") !== "Inactive") {
                profile.set("globalStatus", "Inactive");
                profile.set("statusLastChangedAt", now);
                profile.set("statusChangeReason", "Automated deactivation due to 3 consecutive misses");
                saveProfileStatus(profile);
            }
            return;
        }
    }
}
