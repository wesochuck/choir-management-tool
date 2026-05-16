migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_seating_001");

  collection.fields.add(new TextField({
    "name": "sectionOrder",
    "type": "text"
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_seating_001");

  collection.fields.removeByName("sectionOrder");

  return app.save(collection);
});
