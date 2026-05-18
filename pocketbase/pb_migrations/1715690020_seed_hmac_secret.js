migrate((app) => {
  const settings = app.findCollectionByNameOrId("pbc_settings_001");
  
  // Check if HMAC_SECRET already exists
  try {
    app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
    return; // Already exists
  } catch (e) {
    // Continue to create
  }

  const record = new Record(settings, {
    "key": "HMAC_SECRET",
    "value": { "secret": $security.randomString(32) },
    "isPublic": false
  });

  app.save(record);
}, (app) => {
  try {
    const record = app.findFirstRecordByFilter("appSettings", "key = 'HMAC_SECRET'");
    app.delete(record);
  } catch (e) {
    // Ignore if not found
  }
});
