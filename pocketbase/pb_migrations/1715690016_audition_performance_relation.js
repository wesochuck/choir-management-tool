migrate((app) => {
  const auditions = app.findCollectionByNameOrId("pbc_auditions_001");

  auditions.fields.add(new Field({
    "id": "relation1234567890", // Random-ish ID
    "name": "performance",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "pbc_1687431684",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }));

  return app.save(auditions);
}, (app) => {
  const auditions = app.findCollectionByNameOrId("pbc_auditions_001");
  const field = auditions.fields.getByName("performance");

  if (field) {
    auditions.fields.removeById(field.id);
  }

  return app.save(auditions);
});
