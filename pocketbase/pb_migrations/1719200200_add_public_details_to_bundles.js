/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_ticketBundles_001");
  collection.fields.add(
    new TextField({ name: "publicDetails", required: false })
  );
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_ticketBundles_001");
  const idx = collection.fields.findIndex(f => f.name === "publicDetails");
  if (idx !== -1) {
    collection.fields.splice(idx, 1);
    app.save(collection);
  }
});
