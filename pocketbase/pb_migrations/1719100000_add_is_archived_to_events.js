/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1687431684");

  const existingField = collection.fields.getByName("isArchived");
  if (!existingField) {
    collection.fields.add(
      new BoolField({
        name: "isArchived",
        required: false,
      })
    );
    app.save(collection);
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1687431684");
  const field = collection.fields.getByName("isArchived");

  if (field) {
    collection.fields.removeByName("isArchived");
    app.save(collection);
  }
});
