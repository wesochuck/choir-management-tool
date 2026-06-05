/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_ticketBundles_001");
  collection.createRule = "@request.auth.role = 'admin'";
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_ticketBundles_001");
  collection.createRule = null;
  app.save(collection);
});
