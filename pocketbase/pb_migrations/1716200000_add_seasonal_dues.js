/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const collection = new Collection({
    id: "pbc_seasonalDues_001",
    name: "seasonalDues",
    type: "base",
    fields: [
      {
        name: "id",
        type: "text",
        primaryKey: true,
        required: true,
        system: true,
        pattern: "^[a-z0-9]+$"
      },
      {
        name: "profile",
        type: "relation",
        required: true,
        presentable: false,
        options: {
          collectionId: "pbc_3414089001", // profiles collection
          cascadeDelete: true,
          minSelect: null,
          maxSelect: 1,
          displayFields: null
        }
      },
      {
        name: "season",
        type: "text",
        required: true
      },
      {
        name: "paid",
        type: "bool",
        required: false
      }
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
