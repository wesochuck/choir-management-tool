/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const events = app.findCollectionByNameOrId("pbc_1687431684");

  // 1. Add durationMinutes field
  const existingField = events.fields.getByName("durationMinutes");
  if (!existingField) {
    events.fields.add(
      new NumberField({
        name: "durationMinutes",
        required: false,
        onlyInt: true,
        min: 0,
      })
    );
    app.save(events);
  }

  // 2. Backfill existing events
  const performanceEvents = app.findRecordsByFilter(
    "events",
    "type = 'Performance' && (durationMinutes = null || durationMinutes = 0)",
    "",
    10000,
    0
  );
  performanceEvents.forEach((event) => {
    event.set("durationMinutes", 150);
    app.saveNoValidate(event);
  });

  const rehearsalEvents = app.findRecordsByFilter(
    "events",
    "type = 'Rehearsal' && (durationMinutes = null || durationMinutes = 0)",
    "",
    10000,
    0
  );
  rehearsalEvents.forEach((event) => {
    event.set("durationMinutes", 120);
    app.saveNoValidate(event);
  });
}, (app) => {
  const events = app.findCollectionByNameOrId("pbc_1687431684");
  const field = events.fields.getByName("durationMinutes");

  if (field) {
    events.fields.removeByName("durationMinutes");
    app.save(events);
  }
});
