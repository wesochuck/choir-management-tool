migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_seating_001");
  collection.indexes = [
    ...collection.indexes,
    "CREATE UNIQUE INDEX `idx_seating_perf_venue` ON `seatingCharts` (`performance`, `venue`)"
  ];
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_seating_001");
  collection.indexes = collection.indexes.filter(i => !i.includes("idx_seating_perf_venue"));
  app.save(collection);
});
