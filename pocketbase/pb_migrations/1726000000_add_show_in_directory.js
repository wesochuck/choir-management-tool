/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const profiles = app.findCollectionByNameOrId('profiles');

    // 1. Add showInDirectory boolean field
    const existingField = profiles.fields.getByName('showInDirectory');
    if (!existingField) {
      profiles.fields.add(
        new BoolField({
          name: 'showInDirectory',
          required: false,
          presentable: false,
          hidden: false,
          system: false,
          default: true,
        })
      );
    }

    // 2. Update profiles access rules
    profiles.listRule =
      "@request.auth.role = 'admin' || user = @request.auth.id || (@request.auth.id != '' && globalStatus != 'Inactive' && showInDirectory != false)";
    profiles.viewRule =
      "@request.auth.role = 'admin' || user = @request.auth.id || (@request.auth.id != '' && globalStatus != 'Inactive' && showInDirectory != false)";
    app.save(profiles);

    // 3. Backfill existing profiles to showInDirectory = true
    const profilesRecords = app.findRecordsByFilter('profiles', '', '', 10000, 0);

    profilesRecords.forEach((profile) => {
      profile.set('showInDirectory', true);
      app.saveNoValidate(profile);
    });

    // 4. Relax users viewRule to allow user expansion in the directory
    const users = app.findCollectionByNameOrId('users');
    users.viewRule = "@request.auth.id != ''";
    app.save(users);
  },
  (app) => {
    const profiles = app.findCollectionByNameOrId('profiles');

    // 1. Restore profiles rules
    profiles.listRule = "@request.auth.role = 'admin' || user = @request.auth.id";
    profiles.viewRule = "@request.auth.role = 'admin' || user = @request.auth.id";

    // 2. Remove showInDirectory field
    const field = profiles.fields.getByName('showInDirectory');
    if (field) {
      profiles.fields.removeByName('showInDirectory');
    }
    app.save(profiles);

    // 3. Restore users viewRule
    const users = app.findCollectionByNameOrId('users');
    users.viewRule = "@request.auth.role = 'admin' || id = @request.auth.id";
    app.save(users);
  }
);
