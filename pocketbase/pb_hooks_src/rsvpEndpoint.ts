// Source-of-truth hook snippet for RSVP/admin routes that are maintained in
// pocketbase/pb_hooks/rsvp.pb.js and consumed by PocketBase directly.
// Keep this file in sync with the generated/deployed hook JS.

routerAdd("POST", "/api/admin/bulk-upsert-attendance", (e) => {
  const authRecord = e.auth;
  if (!authRecord || authRecord.get("role") !== "admin") {
    return e.json(403, { error: "Forbidden: Admins only" });
  }

  const data = e.requestInfo().body;
  const eventId = data.eventId;
  const updates = data.updates;

  if (!eventId) {
    return e.json(400, { error: "Missing eventId" });
  }
  if (!Array.isArray(updates)) {
    return e.json(400, { error: "updates must be an array" });
  }

  const allowedAttendance = {
    Present: true,
    Absent: true,
    Pending: true
  };

  for (let i = 0; i < updates.length; i++) {
    const update = updates[i] || {};
    if (!update.profileId) {
      return e.json(400, { error: "Each update requires profileId" });
    }
    if (!allowedAttendance[update.attendance]) {
      return e.json(400, { error: "Invalid attendance value" });
    }
  }

  try {
    const rosterCollection = $app.findCollectionByNameOrId("eventRosters");
    const existingRosters = $app.findRecordsByFilter(
      "eventRosters",
      "event = {:eventId}",
      "",
      1000,
      0,
      { eventId: eventId }
    ) || [];

    const rosterMap = {};
    existingRosters.forEach((roster) => {
      rosterMap[roster.get("profile")] = roster;
    });

    const changedRosters = [];
    $app.runInTransaction((txApp) => {
      updates.forEach((update) => {
        const existingRoster = rosterMap[update.profileId];
        if (existingRoster) {
          if (existingRoster.get("attendance") !== update.attendance) {
            existingRoster.set("attendance", update.attendance);
            txApp.save(existingRoster);
          }
          changedRosters.push(existingRoster);
        } else {
          const roster = new Record(rosterCollection);
          roster.set("event", eventId);
          roster.set("profile", update.profileId);
          roster.set("rsvp", "Pending");
          roster.set("attendance", update.attendance);
          roster.set("folderReturned", false);
          txApp.save(roster);
          changedRosters.push(roster);
        }
      });
    });

    const payload = changedRosters.map((roster) => ({
      id: roster.id,
      event: roster.get("event"),
      profile: roster.get("profile"),
      attendance: roster.get("attendance"),
      rsvp: roster.get("rsvp"),
      folderNumber: roster.get("folderNumber") || "",
      folderReturned: !!roster.get("folderReturned"),
      seatId: roster.get("seatId") || ""
    }));

    return e.json(200, { rosters: payload });
  } catch (err) {
    console.log("[Bulk Attendance Hook Error]: " + String(err));
    return e.json(500, { error: "Failed to bulk upsert attendance: " + String(err) });
  }
});
