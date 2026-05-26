/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_seating_001");

  let hasSortOrder = false;
  for (let i = 0; i < collection.fields.length; i++) {
    if (collection.fields[i].name === "sortOrder") {
      hasSortOrder = true;
      break;
    }
  }

  if (!hasSortOrder) {
    collection.fields.push(new NumberField({
      name: "sortOrder",
      required: false,
      onlyInt: true
    }));
    app.save(collection);
  }

  // Set default sortOrder to 0 for existing records
  const records = app.findRecordsByFilter("pbc_seating_001", "", "", 1000, 0);
  records.forEach((record, index) => {
    if (record.get("sortOrder") === null || record.get("sortOrder") === undefined) {
      record.set("sortOrder", index);
      app.saveNoValidate(record);
    }
  });
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_seating_001");

  // Remove sortOrder field
  collection.fields = collection.fields.filter(f => f.name !== "sortOrder");

  app.save(collection);
});
