/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_messages_001");
  collection.listRule = "@request.auth.id != '' && (@request.auth.role = 'admin' || status = 'Sent')";
  collection.viewRule = "@request.auth.id != '' && (@request.auth.role = 'admin' || status = 'Sent')";
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_messages_001");
  collection.listRule = "@request.auth.role = 'admin'";
  collection.viewRule = "@request.auth.role = 'admin'";
  app.save(collection);
});
