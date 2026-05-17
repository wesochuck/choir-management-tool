migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_venues_001");

  collection.fields.add({
    "id": "bool_is_open_seating",
    "name": "isOpenSeating",
    "type": "bool",
    "system": false,
    "required": false
  });

  collection.fields.add({
    "id": "text_address",
    "name": "address",
    "type": "text",
    "system": false,
    "required": false
  });

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_venues_001");
  collection.fields.removeById("bool_is_open_seating");
  collection.fields.removeById("text_address");
  app.save(collection);
});
