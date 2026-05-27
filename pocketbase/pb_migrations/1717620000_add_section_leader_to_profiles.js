/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const collection = app.findCollectionByNameOrId("profiles");
  const existingField = collection.fields.getByName("isSectionLeader");

  if (!existingField) {
    collection.fields.add(
      new BoolField({
        name: "isSectionLeader",
        required: false,
        presentable: false,
        hidden: false,
        system: false,
        default: false,
      })
    );
    app.save(collection);
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("profiles");
  const existingField = collection.fields.getByName("isSectionLeader");

  if (existingField) {
    collection.fields.removeByName("isSectionLeader");
    app.save(collection);
  }
});
