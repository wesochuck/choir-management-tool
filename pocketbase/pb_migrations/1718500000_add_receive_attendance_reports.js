/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const profiles = app.findCollectionByNameOrId("profiles");

  // 1. Add receiveAttendanceReports boolean field
  const existingField = profiles.fields.getByName("receiveAttendanceReports");
  if (!existingField) {
    profiles.fields.add(
      new BoolField({
        name: "receiveAttendanceReports",
        required: false,
        presentable: false,
        hidden: false,
        system: false,
        default: true, // Default to true as per requirements
      })
    );
    app.save(profiles);
  }

  // 2. Backfill existing admin-linked profiles to true (redundant due to default: true, but safer)
  const adminUsers = app.findRecordsByFilter(
    "users",
    "role = 'admin'",
    "",
    10000,
    0
  );

  const adminUserIds = new Set(adminUsers.map((user) => user.id));

  const profileRecords = app.findRecordsByFilter(
    "profiles",
    "user != null && user != ''",
    "",
    10000,
    0
  );

  profileRecords.forEach((profile) => {
    const userId = profile.get("user");

    if (adminUserIds.has(userId)) {
      profile.set("receiveAttendanceReports", true);
      app.saveNoValidate(profile);
    }
  });
}, (app) => {
  const profiles = app.findCollectionByNameOrId("profiles");
  const field = profiles.fields.getByName("receiveAttendanceReports");

  if (field) {
    profiles.fields.removeByName("receiveAttendanceReports");
    app.save(profiles);
  }
});
