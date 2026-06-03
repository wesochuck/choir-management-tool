/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    id: "pbc_singer_res_001",
    name: "singer_resources",
    type: "base",
    system: false,
    indexes: [],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
    updateRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
    deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
  });

  collection.fields.add(
    new TextField({
      name: "title",
      required: true
    }),
    new FileField({
      name: "file",
      maxSelect: 1,
      maxSize: 10485760, // 10MB limit
      required: false
    }),
    new URLField({
      name: "url",
      required: false
    }),
    new NumberField({
      name: "sortOrder",
      required: false
    }),
    new AutodateField({
      name: "created",
      onCreate: true,
      onUpdate: false
    }),
    new AutodateField({
      name: "updated",
      onCreate: true,
      onUpdate: true
    })
  );

  app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("pbc_singer_res_001");
    app.delete(collection);
  } catch (e) {}
});
