/// <reference path="../pb_data/types.d.ts" />

function getFieldByName(collection, name) {
  try {
    return collection.fields.getByName(name);
  } catch (e) {
    return null;
  }
}

function ensureAutodateField(collection, name, onCreate, onUpdate) {
  if (getFieldByName(collection, name)) {
    return false;
  }

  collection.fields.add(new AutodateField({
    name,
    onCreate,
    onUpdate,
  }));
  return true;
}

function ensureEmailQueueTimestampFields(app) {
  const collection = app.findCollectionByNameOrId("pbc_email_queue_001");
  const addedCreated = ensureAutodateField(collection, "created", true, false);
  const addedUpdated = ensureAutodateField(collection, "updated", true, true);

  if (addedCreated || addedUpdated) {
    app.save(collection);
  }
}

function isMissingTimestamp(value) {
  return value === null || value === undefined || value === "";
}

function backfillMissingTimestamps(app, fallbackTimestamp) {
  let offset = 0;

  while (true) {
    const records = app.findRecordsByFilter("pbc_email_queue_001", "", "", 500, offset);
    if (!records || records.length === 0) {
      break;
    }

    records.forEach((record) => {
      let changed = false;

      if (isMissingTimestamp(record.get("created"))) {
        record.set("created", fallbackTimestamp);
        changed = true;
      }

      if (isMissingTimestamp(record.get("updated"))) {
        record.set("updated", fallbackTimestamp);
        changed = true;
      }

      if (changed) {
        app.saveNoValidate(record);
      }
    });

    offset += records.length;
  }
}

migrate((app) => {
  const fallbackTimestamp = new Date().toISOString();
  ensureEmailQueueTimestampFields(app);
  backfillMissingTimestamps(app, fallbackTimestamp);
}, (app) => {
  // Forward-only data repair. Timestamp backfills cannot be reconstructed safely.
});
