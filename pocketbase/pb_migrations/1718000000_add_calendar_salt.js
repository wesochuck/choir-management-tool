/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("profiles");

  // 1. Add new calendarSalt field to profiles
  collection.fields.add(
    new TextField({
      name: "calendarSalt",
      required: false,
    })
  );
  app.save(collection);

  // 2. Generate random 16-char alphanumeric salt helper
  function generateRandomSalt(length = 16) {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // 3. Scan and backfill existing profile records with random salts
  let offset = 0;
  while (true) {
    const records = app.findRecordsByFilter("profiles", "calendarSalt = '' || calendarSalt = null", "", 100, offset);
    if (!records || records.length === 0) {
      break;
    }

    records.forEach((record) => {
      record.set("calendarSalt", generateRandomSalt(16));
      app.saveNoValidate(record);
    });

    offset += records.length;
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("profiles");
  try {
    collection.fields.removeByName("calendarSalt");
    app.save(collection);
  } catch (e) {}
});
