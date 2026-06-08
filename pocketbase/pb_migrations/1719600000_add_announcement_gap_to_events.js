/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const events = app.findCollectionByNameOrId("pbc_1687431684");

  const existingField = events.fields.getByName("announcementGapSeconds");
  if (!existingField) {
    events.fields.add(
      new NumberField({
        name: "announcementGapSeconds",
        required: false,
        onlyInt: true,
        min: 0,
      })
    );
    app.save(events);
  }
}, (app) => {
  const events = app.findCollectionByNameOrId("pbc_1687431684");
  const field = events.fields.getByName("announcementGapSeconds");
  if (field) {
    events.fields.removeByName("announcementGapSeconds");
    app.save(events);
  }
});
