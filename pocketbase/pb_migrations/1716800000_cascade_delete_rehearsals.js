/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1687431684"); // "events"
  const field = collection.fields.getByName("parentPerformanceId");
  if (field) {
    field.cascadeDelete = true;
    app.save(collection);
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1687431684"); // "events"
  const field = collection.fields.getByName("parentPerformanceId");
  if (field) {
    field.cascadeDelete = false;
    app.save(collection);
  }
});
