migrate((app) => {
  const auditions = app.findCollectionByNameOrId("pbc_auditions_001");
  
  const existing = auditions.fields.getByName("performance");
  if (existing) {
    // Remove the potentially incorrect field
    auditions.fields.removeById(existing.id);
  }

  // Add the correct RelationField
  auditions.fields.add(new RelationField({
    name: "performance",
    system: false,
    required: false,
    collectionId: "pbc_1687431684", // events collection
    cascadeDelete: false,
    minSelect: null,
    maxSelect: 1,
    displayFields: null
  }));

  return app.save(auditions);
}, (app) => {
  // Rollback logic if needed
  return null;
});
