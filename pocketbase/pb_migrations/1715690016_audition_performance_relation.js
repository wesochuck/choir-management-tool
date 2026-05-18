migrate((app) => {
  const auditions = app.findCollectionByNameOrId("pbc_auditions_001");

  auditions.fields.add(new RelationField({
    "name": "performance",
    "required": false,
    "collectionId": "pbc_1687431684",
    "cascadeDelete": false,
    "maxSelect": 1,
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
