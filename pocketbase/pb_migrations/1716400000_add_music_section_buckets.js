/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_music_library_001");
  
  collection.fields.push(new JSONField({
    name: "sectionBuckets",
    required: false,
    presentable: false
  }));

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_music_library_001");
  const field = collection.fields.getByName("sectionBuckets");
  if (field) {
    collection.fields.removeById(field.id);
  }
  app.save(collection);
});
