// Profile Status Engine Hooks

onRecordAfterUpdateSuccess((e) => {
    updateProfileStatus(e.record);
}, "eventRosters");

onRecordAfterCreateSuccess((e) => {
    updateProfileStatus(e.record);
}, "eventRosters");

function saveProfileStatus(profile) {
    try {
        // Status automation should not block attendance/RSVP writes if an
        // older profile has unrelated values that no longer pass validation.
        $app.saveNoValidate(profile);
    } catch (err) {
        console.log("Failed to update automated profile status for " + profile.id + ": " + err);
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
