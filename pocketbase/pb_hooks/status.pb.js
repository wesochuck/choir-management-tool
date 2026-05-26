// Profile Status Engine Hooks

const STATUS_HOOK_VERSION = "2026-05-24T08:20:00-04:00-dynamic-settings";

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

        // Fetch global settings dynamically
        let statusAutomationEnabled = true;
        let statusAutomationMissThreshold = 3;
        let statusAutomationRecoveryEnabled = true;

        try {
            const rosterSettingRecord = $app.findFirstRecordByFilter("appSettings", "key = 'roster'");
            if (rosterSettingRecord) {
                const valBytes = rosterSettingRecord.get("value");
                if (valBytes) {
                    let str = "";
                    if (typeof valBytes === "string") {
                        str = valBytes;
                    } else if (Array.isArray(valBytes) || (typeof valBytes === "object" && valBytes.length !== undefined)) {
                        for (let i = 0; i < valBytes.length; i++) {
                            str += String.fromCharCode(valBytes[i]);
                        }
                    } else if (typeof valBytes === "object") {
                        str = JSON.stringify(valBytes);
                    }
                    const rosterSettings = JSON.parse(str);
                    if (rosterSettings.statusAutomationEnabled !== undefined) {
                        statusAutomationEnabled = rosterSettings.statusAutomationEnabled;
                    }
                    if (rosterSettings.statusAutomationMissThreshold !== undefined) {
                        statusAutomationMissThreshold = Number(rosterSettings.statusAutomationMissThreshold);
                    }
                    if (rosterSettings.statusAutomationRecoveryEnabled !== undefined) {
                        statusAutomationRecoveryEnabled = rosterSettings.statusAutomationRecoveryEnabled;
                    }
                }
            }
        } catch (err) {
            console.log("Failed to load global status settings, using defaults: " + err);
        }

        if (!statusAutomationEnabled) return;

        const now = new Date().toISOString().replace("T", " ").split(".")[0];

        if (statusAutomationRecoveryEnabled) {
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
                if (profile.get("globalStatus") !== "Idle" && profile.get("globalStatus") !== "Active") {
                    profile.set("globalStatus", "Idle");
                    profile.set("statusLastChangedAt", now);
                    profile.set("statusChangeReason", "Automated recovery via future RSVP");
                    saveProfileStatus(profile);
                }
                return;
            }
        }

        let pastRosters = [];
        try {
            pastRosters = $app.findRecordsByFilter(
                "eventRosters",
                "profile = {:profileId} && event.date < {:now} && event.type = 'Performance'",
                "-event.date",
                statusAutomationMissThreshold,
                0,
                { profileId: profileId, now: now }
            );
        } catch (err) {}

        if (pastRosters && pastRosters.length === statusAutomationMissThreshold) {
            const allMissed = pastRosters.every(r => r.get("attendance") === "Absent" || r.get("rsvp") === "No");
            if (allMissed && profile.get("globalStatus") !== "Inactive") {
                profile.set("globalStatus", "Inactive");
                profile.set("statusLastChangedAt", now);
                profile.set("statusChangeReason", "Automated deactivation due to " + statusAutomationMissThreshold + " consecutive misses");
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

        // Fetch global settings dynamically
        let statusAutomationEnabled = true;
        let statusAutomationMissThreshold = 3;
        let statusAutomationRecoveryEnabled = true;

        try {
            const rosterSettingRecord = $app.findFirstRecordByFilter("appSettings", "key = 'roster'");
            if (rosterSettingRecord) {
                const valBytes = rosterSettingRecord.get("value");
                if (valBytes) {
                    let str = "";
                    if (typeof valBytes === "string") {
                        str = valBytes;
                    } else if (Array.isArray(valBytes) || (typeof valBytes === "object" && valBytes.length !== undefined)) {
                        for (let i = 0; i < valBytes.length; i++) {
                            str += String.fromCharCode(valBytes[i]);
                        }
                    } else if (typeof valBytes === "object") {
                        str = JSON.stringify(valBytes);
                    }
                    const rosterSettings = JSON.parse(str);
                    if (rosterSettings.statusAutomationEnabled !== undefined) {
                        statusAutomationEnabled = rosterSettings.statusAutomationEnabled;
                    }
                    if (rosterSettings.statusAutomationMissThreshold !== undefined) {
                        statusAutomationMissThreshold = Number(rosterSettings.statusAutomationMissThreshold);
                    }
                    if (rosterSettings.statusAutomationRecoveryEnabled !== undefined) {
                        statusAutomationRecoveryEnabled = rosterSettings.statusAutomationRecoveryEnabled;
                    }
                }
            }
        } catch (err) {
            console.log("Failed to load global status settings, using defaults: " + err);
        }

        if (!statusAutomationEnabled) return;

        const now = new Date().toISOString().replace("T", " ").split(".")[0];

        if (statusAutomationRecoveryEnabled) {
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
                if (profile.get("globalStatus") !== "Idle" && profile.get("globalStatus") !== "Active") {
                    profile.set("globalStatus", "Idle");
                    profile.set("statusLastChangedAt", now);
                    profile.set("statusChangeReason", "Automated recovery via future RSVP");
                    saveProfileStatus(profile);
                }
                return;
            }
        }

        let pastRosters = [];
        try {
            pastRosters = $app.findRecordsByFilter(
                "eventRosters",
                "profile = {:profileId} && event.date < {:now} && event.type = 'Performance'",
                "-event.date",
                statusAutomationMissThreshold,
                0,
                { profileId: profileId, now: now }
            );
        } catch (err) {}

        if (pastRosters && pastRosters.length === statusAutomationMissThreshold) {
            const allMissed = pastRosters.every(r => r.get("attendance") === "Absent" || r.get("rsvp") === "No");
            if (allMissed && profile.get("globalStatus") !== "Inactive") {
                profile.set("globalStatus", "Inactive");
                profile.set("statusLastChangedAt", now);
                profile.set("statusChangeReason", "Automated deactivation due to " + statusAutomationMissThreshold + " consecutive misses");
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
