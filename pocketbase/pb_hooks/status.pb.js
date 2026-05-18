// Profile Status Engine Hooks

onRecordAfterUpdateSuccess((e) => {
    updateProfileStatus(e.record);
}, "eventRosters");

onRecordAfterCreateSuccess((e) => {
    updateProfileStatus(e.record);
}, "eventRosters");

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
        futureRosters = $app.findAllRecords("eventRosters", {
            filter: "profile = {:profileId} && rsvp = 'Yes' && event.date >= {:now} && event.type = 'Performance'",
            params: { profileId, now },
            sort: "-event.date",
            limit: 1
        });
    } catch (err) {}

    if (futureRosters.length > 0) {
        if (profile.get("globalStatus") !== "Active (Future)" && profile.get("globalStatus") !== "Active (Current)") {
            profile.set("globalStatus", "Active (Future)");
            profile.set("statusLastChangedAt", now);
            profile.set("statusChangeReason", "Automated recovery via future RSVP");
            $app.save(profile);
        }
        return;
    }

    // 2. Check for Inactivity (3 past misses)
    // Find last 3 past Performances
    let pastRosters = [];
    try {
        pastRosters = $app.findAllRecords("eventRosters", {
            filter: "profile = {:profileId} && event.date < {:now} && event.type = 'Performance'",
            params: { profileId, now },
            sort: "-event.date",
            limit: 3
        });
    } catch (err) {}

    if (pastRosters.length === 3) {
        const allMissed = pastRosters.every(r => r.get("attendance") === "Absent" || r.get("rsvp") === "No");
        if (allMissed) {
            if (profile.get("globalStatus") !== "Inactive") {
                profile.set("globalStatus", "Inactive");
                profile.set("statusLastChangedAt", now);
                profile.set("statusChangeReason", "Automated deactivation due to 3 consecutive misses");
                $app.save(profile);
            }
            return;
        }
    }
}
