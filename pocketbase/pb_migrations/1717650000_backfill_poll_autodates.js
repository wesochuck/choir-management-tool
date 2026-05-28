/// <reference path="../pb_data/types.d.ts" />

// Ensure engagement poll timestamp fields exist in older hosted schemas and
// backfill legacy rows so frontend reverse-chronological sorting is safe.

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

function ensurePollTimestampFields(app, collectionNameOrId) {
  const collection = app.findCollectionByNameOrId(collectionNameOrId);
  const addedCreated = ensureAutodateField(collection, "created", true, false);
  const addedUpdated = ensureAutodateField(collection, "updated", true, true);

  if (addedCreated || addedUpdated) {
    app.save(collection);
  }
}

function isMissingTimestamp(value) {
  return value === null || value === undefined || value === "";
}

function backfillMissingTimestamps(app, collectionNameOrId, fallbackTimestamp) {
  let offset = 0;

  while (true) {
    const records = app.findRecordsByFilter(collectionNameOrId, "", "", 500, offset);
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
  const collectionNames = ["polls", "pollResponses"];

  collectionNames.forEach((collectionName) => {
    ensurePollTimestampFields(app, collectionName);
    backfillMissingTimestamps(app, collectionName, fallbackTimestamp);
  });
}, (app) => {
  // Forward-only data repair. Timestamp backfills cannot be reconstructed safely.
});
