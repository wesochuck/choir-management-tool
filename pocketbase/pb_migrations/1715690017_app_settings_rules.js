migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_settings_001");

  collection.listRule = "@request.auth.role = \"admin\" || @request.auth.collectionName = \"_superusers\" || isPublic = true";
  collection.viewRule = "@request.auth.role = \"admin\" || @request.auth.collectionName = \"_superusers\" || isPublic = true";
  collection.createRule = "@request.auth.role = \"admin\" || @request.auth.collectionName = \"_superusers\"";
  collection.updateRule = "@request.auth.role = \"admin\" || @request.auth.collectionName = \"_superusers\"";
  collection.deleteRule = "@request.auth.role = \"admin\" || @request.auth.collectionName = \"_superusers\"";

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_settings_001");

  collection.listRule = "@request.auth.role = \"admin\" || isPublic = true";
  collection.viewRule = "@request.auth.role = \"admin\" || isPublic = true";
  collection.createRule = "@request.auth.role = \"admin\"";
  collection.updateRule = "@request.auth.role = \"admin\"";
  collection.deleteRule = "@request.auth.role = \"admin\"";

  app.save(collection);
})
