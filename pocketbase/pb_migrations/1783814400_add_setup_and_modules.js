/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const settings = app.findCollectionByNameOrId('appSettings');
    let hasAdmin = false;
    try {
      hasAdmin = !!app.findFirstRecordByFilter('users', "role = 'admin'");
    } catch {
      hasAdmin = false;
    }

    const setup = new Record(settings, {
      key: 'setup_state',
      value: {
        version: 1,
        initialized: hasAdmin,
        completedSections: hasAdmin ? ['legacy-install'] : [],
      },
      isPublic: false,
    });
    app.save(setup);

    const modules = new Record(settings, {
      key: 'module_state',
      value: {
        version: 1,
        enabled: hasAdmin
          ? [
              'roster',
              'events',
              'attendance',
              'rsvps',
              'musicLibrary',
              'setLists',
              'resources',
              'reports',
              'publicWebsite',
              'directory',
              'auditions',
              'communications',
              'polls',
              'seating',
              'ticketSales',
              'donations',
              'patrons',
            ]
          : [],
      },
      isPublic: false,
    });
    app.save(modules);
  },
  (app) => {
    for (const key of ['setup_state', 'module_state']) {
      try {
        app.delete(app.findFirstRecordByFilter('appSettings', 'key = {:key}', { key }));
      } catch {
        // rollback is idempotent
      }
    }
  }
);
