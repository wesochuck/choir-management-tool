/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  try {
    const collection = app.findCollectionByNameOrId("pbc_email_queue_001");
    const attemptsField = collection.fields.find(f => f.name === "attempts");
    if (attemptsField) {
      attemptsField.required = false;
      app.save(collection);
    }
  } catch (e) {
    // Collection doesn't exist yet, will be handled by 1717000000_create_email_queue.js
  }
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("pbc_email_queue_001");
    const attemptsField = collection.fields.find(f => f.name === "attempts");
    if (attemptsField) {
      attemptsField.required = true;
      app.save(collection);
    }
  } catch (e) {}
});
