/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_music_library_001");

  const existingIndex = collection.fields.findIndex((field) => field.name === "parentId");
  if (existingIndex === -1) {
    collection.fields.push(new RelationField({
      name: "parentId",
      id: "relation3101992202",
      collectionId: "pbc_music_library_001",
      cascadeDelete: true,
      maxSelect: 1,
      minSelect: 0,
      hidden: false,
      presentable: false,
      required: false,
      system: false
    }));

    app.save(collection);
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_music_library_001");
  const index = collection.fields.findIndex((field) => field.name === "parentId");

  if (index !== -1) {
    collection.fields.splice(index, 1);
    app.save(collection);
  }
});
