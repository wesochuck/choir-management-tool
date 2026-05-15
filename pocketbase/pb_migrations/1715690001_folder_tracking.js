migrate((app) => {
  const collection = app.findCollectionByNameOrId("eventRosters");

  collection.fields.add(new TextField({
    "name": "folderNumber",
    "type": "text"
  }));

  collection.fields.add(new BoolField({
    "name": "folderReturned",
    "type": "bool"
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("eventRosters");

  collection.fields.removeByName("folderNumber");
  collection.fields.removeByName("folderReturned");

  return app.save(collection);
});
