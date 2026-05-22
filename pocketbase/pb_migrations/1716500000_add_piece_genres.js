/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_music_library_001");

  const existingIndex = collection.fields.findIndex((field) => field.name === "genres");
  if (existingIndex === -1) {
    collection.fields.push(new JSONField({
      name: "genres",
      required: false,
      presentable: false
    }));

    app.save(collection);
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_music_library_001");
  const field = collection.fields.getByName("genres");
  
  if (field) {
    collection.fields.removeById(field.id);
    app.save(collection);
  }
});

