/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_seasons_001000');

    collection.listRule = "@request.auth.id != ''";
    collection.viewRule = "@request.auth.id != ''";
    collection.createRule = "@request.auth.id != '' && @request.auth.role = 'admin'";
    collection.updateRule = "@request.auth.id != '' && @request.auth.role = 'admin'";
    collection.deleteRule = "@request.auth.id != '' && @request.auth.role = 'admin'";

    app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_seasons_001000');

    collection.listRule = null;
    collection.viewRule = null;
    collection.createRule = null;
    collection.updateRule = null;
    collection.deleteRule = null;

    app.save(collection);
  }
);
