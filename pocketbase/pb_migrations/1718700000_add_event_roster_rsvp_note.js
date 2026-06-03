/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2357252437");

  const existingField = collection.fields.getByName("rsvpNote");
  if (!existingField) {
    collection.fields.add(
      new TextField({
        name: "rsvpNote",
        required: false,
        max: 1000,
      })
    );
    app.save(collection);
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2357252437");
  const field = collection.fields.getByName("rsvpNote");

  if (field) {
    collection.fields.removeByName("rsvpNote");
    app.save(collection);
  }
});
