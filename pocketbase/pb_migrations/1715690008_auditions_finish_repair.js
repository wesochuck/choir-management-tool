migrate((app) => {
  const addFieldIfMissing = (collection, name, createField) => {
    const existing = collection.fields.getByName(name);
    if (existing) return;
    collection.fields.add(createField());
  };

  const addAutodates = (collection) => {
    addFieldIfMissing(collection, "created", () => new AutodateField({
      "name": "created",
      "system": true,
      "onCreate": true,
      "onUpdate": false
    }));
    addFieldIfMissing(collection, "updated", () => new AutodateField({
      "name": "updated",
      "system": true,
      "onCreate": true,
      "onUpdate": true
    }));
  };

  const auditions = app.findCollectionByNameOrId("pbc_auditions_001");
  addFieldIfMissing(auditions, "voicePart", () => new SelectField({
    "name": "voicePart",
    "maxSelect": 1,
    "values": ["S1", "S2", "A1", "A2", "T1", "T2", "B1", "B2"]
  }));
  addFieldIfMissing(auditions, "experience", () => new TextField({
    "name": "experience",
    "type": "text"
  }));
  addAutodates(auditions);
  app.save(auditions);

  const venues = app.findCollectionByNameOrId("pbc_venues_001");
  addAutodates(venues);
  app.save(venues);

  const appSettings = app.findCollectionByNameOrId("pbc_settings_001");
  addAutodates(appSettings);
  app.save(appSettings);
}, (app) => {
  const removeIfPresent = (collection, name) => {
    const existing = collection.fields.getByName(name);
    if (existing) collection.fields.removeByName(name);
  };

  const auditions = app.findCollectionByNameOrId("pbc_auditions_001");
  removeIfPresent(auditions, "voicePart");
  removeIfPresent(auditions, "experience");
  app.save(auditions);
});
