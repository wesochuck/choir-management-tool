migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_music_library_001");

  collection.fields.add(new TextField({
    "name": "duration",
    "type": "text",
    "system": false,
    "required": false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_music_library_001");
  if (collection) {
    collection.fields.removeByName("duration");
    return app.save(collection);
  }
});
