/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const settingsCollection = app.findCollectionByNameOrId('pbc_settings_001');
    const record = new Record(settingsCollection, {
      key: 'stripe_fees',
      value: JSON.stringify({
        percentage: 2.9,
        fixedCents: 30,
      }),
    });
    app.save(record);
  },
  (app) => {
    try {
      const record = app.findFirstRecordByFilter('appSettings', "key = 'stripe_fees'");
      if (record) {
        app.delete(record);
      }
    } catch {
      // silently fail if not found
    }
  }
);
