/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const profiles = app.findCollectionByNameOrId("profiles");

  // 1. Add receiveAdminNotifications boolean field
  const existingField = profiles.fields.getByName("receiveAdminNotifications");
  if (!existingField) {
    profiles.fields.add(
      new BoolField({
        name: "receiveAdminNotifications",
        required: false,
        presentable: false,
        hidden: false,
        system: false,
        default: true,
      })
    );
    app.save(profiles);
  }

  // 2. Backfill existing admin-linked profiles to true
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
      profile.set("receiveAdminNotifications", true);
      app.saveNoValidate(profile);
    }
  });
}, (app) => {
  const profiles = app.findCollectionByNameOrId("profiles");
  const field = profiles.fields.getByName("receiveAdminNotifications");

  if (field) {
    profiles.fields.removeByName("receiveAdminNotifications");
    app.save(profiles);
  }
});
