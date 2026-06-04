/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const settings = app.settings();

  // Enable Batch API to support seating chart reordering and other batch operations
  settings.batch.enabled = true;
  if (!settings.batch.maxRequests || settings.batch.maxRequests < 100) {
    settings.batch.maxRequests = 100;
  }
  if (!settings.batch.timeout || settings.batch.timeout < 10) {
    settings.batch.timeout = 10;
  }

  app.save(settings);
}, (app) => {
  const settings = app.settings();

  // Revert Batch API setting
  settings.batch.enabled = false;

  app.save(settings);
});
