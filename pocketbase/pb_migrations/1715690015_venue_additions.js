migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_venues_001");

  collection.fields.add(new BoolField({
    "name": "isOpenSeating",
    "type": "bool"
  }));

  collection.fields.add(new TextField({
    "name": "address",
    "type": "text"
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_venues_001");
  collection.fields.removeByName("isOpenSeating");
  collection.fields.removeByName("address");
  return app.save(collection);
});
