/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_music_library_001");

  collection.fields.add(
    new DateField({
      name: "purchaseDate",
      required: false,
    })
  );

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_music_library_001");
  try {
    collection.fields.removeByName("purchaseDate");
    app.save(collection);
  } catch (e) {}
});
