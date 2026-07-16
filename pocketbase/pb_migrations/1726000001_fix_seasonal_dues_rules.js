/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_seasonalDues_001');
    const rule = "@request.auth.id != '' && @request.auth.role = 'admin'";

    collection.listRule = rule;
    collection.viewRule = rule;
    collection.createRule = rule;
    collection.updateRule = rule;
    collection.deleteRule = rule;

    app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_seasonalDues_001');
    const oldRule = "@request.auth.role = 'admin'";

    collection.listRule = oldRule;
    collection.viewRule = oldRule;
    collection.createRule = oldRule;
    collection.updateRule = oldRule;
    collection.deleteRule = oldRule;

    app.save(collection);
  }
);
