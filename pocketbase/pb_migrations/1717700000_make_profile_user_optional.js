/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3414089001");
  const field = collection.fields.getByName("user");
  if (field) {
    field.required = false;
    app.save(collection);
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3414089001");
  const field = collection.fields.getByName("user");
  if (field) {
    field.required = true;
    app.save(collection);
  }
})
