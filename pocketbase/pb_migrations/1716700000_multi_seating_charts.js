/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_seating_001");

  // 1. Add 'name' text field as optional first
  let hasName = false;
  for (let i = 0; i < collection.fields.length; i++) {
    if (collection.fields[i].name === "name") {
      hasName = true;
      break;
    }
  }

  if (!hasName) {
    collection.fields.push(new TextField({
      name: "name",
      required: false
    }));
    app.save(collection);
  }

  // 2. Set default name 'Main Seating Chart' for existing records
  const records = app.findRecordsByFilter("pbc_seating_001", "", "", 1000, 0);
  records.forEach((record) => {
    if (!record.get("name")) {
      record.set("name", "Main Seating Chart");
      app.saveNoValidate(record);
    }
  });

  // 3. Make name field required and add minimum constraint
  collection.fields.forEach(f => {
    if (f.name === "name") {
      f.required = true;
      f.min = 1;
    }
  });

  // 4. Update index constraint to include 'name'
  collection.indexes = [
    "CREATE UNIQUE INDEX `idx_seating_perf_venue_name` ON `seatingCharts` (`performance`, `venue`, `name`)"
  ];

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_seating_001");

  // Restore original unique index
  collection.indexes = [
    "CREATE UNIQUE INDEX `idx_seating_perf_venue` ON `seatingCharts` (`performance`, `venue`)"
  ];

  // Remove name field
  collection.fields = collection.fields.filter(f => f.name !== "name");

  app.save(collection);
});
