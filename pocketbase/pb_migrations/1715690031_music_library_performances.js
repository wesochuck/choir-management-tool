migrate((app) => {
  const musicLibrary = app.findCollectionByNameOrId("pbc_music_library_001");

  // Remove the old historicalDates field (since we want to eliminate the free-text field)
  const historicalDatesField = musicLibrary.fields.getByName("historicalDates");
  if (historicalDatesField) {
    musicLibrary.fields.removeByName("historicalDates");
  }

  // Add the new multiple-relation field performances pointing to events ("pbc_1687431684")
  const existingPerformances = musicLibrary.fields.getByName("performances");
  if (!existingPerformances) {
    musicLibrary.fields.add(new RelationField({
      name: "performances",
      system: false,
      required: false,
      collectionId: "pbc_1687431684",
      cascadeDelete: false,
      maxSelect: 999
    }));
  }

  return app.save(musicLibrary);
}, (app) => {
  const musicLibrary = app.findCollectionByNameOrId("pbc_music_library_001");

  const performancesField = musicLibrary.fields.getByName("performances");
  if (performancesField) {
    musicLibrary.fields.removeByName("performances");
  }

  const existingHistoricalDates = musicLibrary.fields.getByName("historicalDates");
  if (!existingHistoricalDates) {
    musicLibrary.fields.add(new JSONField({
      name: "historicalDates",
      system: false,
      required: false
    }));
  }

  return app.save(musicLibrary);
});
