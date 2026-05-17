migrate((app) => {
  const events = app.findCollectionByNameOrId("pbc_1687431684");
  
  // Prevent duplicate field addition if migration is re-run
  const existing = events.fields.getByName("venue");
  if (!existing) {
    events.fields.add(new RelationField({
      name: "venue",
      system: false,
      required: false,
      collectionId: "pbc_venues_001",
      cascadeDelete: false,
      maxSelect: 1
    }));
    app.save(events);
  }
}, (app) => {
  const events = app.findCollectionByNameOrId("pbc_1687431684");
  const existing = events.fields.getByName("venue");
  if (existing) {
    events.fields.removeByName("venue");
    app.save(events);
  }
});
