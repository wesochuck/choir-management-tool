/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const collection = new Collection({
    id: "pbc_seasonalDues_001",
    name: "seasonalDues",
    type: "base",
    fields: [
      new TextField({
        name: "id",
        primaryKey: true,
        required: true,
        system: true,
        pattern: "^[a-z0-9]+$"
      }),
      new RelationField({
        name: "profile",
        required: true,
        presentable: false,
        collectionId: "pbc_3414089001",
        cascadeDelete: true,
        minSelect: 0,
        maxSelect: 1
      }),
      new TextField({
        name: "season",
        required: true
      }),
      new BoolField({
        name: "paid",
        required: false
      })
    ],
    listRule: "@request.auth.role = 'admin'",
    viewRule: "@request.auth.role = 'admin'",
    createRule: "@request.auth.role = 'admin'",
    updateRule: "@request.auth.role = 'admin'",
    deleteRule: "@request.auth.role = 'admin'",
  });
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_seasonalDues_001");
  app.delete(collection);
});
