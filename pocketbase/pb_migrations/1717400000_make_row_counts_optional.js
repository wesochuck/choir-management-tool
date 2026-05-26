/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_venues_001");
  const field = collection.fields.getByName("rowCounts");
  if (field) {
    field.required = false;
    app.save(collection);
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_venues_001");
  const field = collection.fields.getByName("rowCounts");
  if (field) {
    field.required = true;
    app.save(collection);
  }
})
