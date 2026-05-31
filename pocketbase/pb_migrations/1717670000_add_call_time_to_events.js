/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const events = app.findCollectionByNameOrId("pbc_1687431684");

  events.fields.add(
    new TextField({
      name: "callTime",
      required: false,
    })
  );

  app.save(events);
}, (app) => {
  const events = app.findCollectionByNameOrId("pbc_1687431684");
  try {
    events.fields.removeByName("callTime");
    app.save(events);
  } catch (e) {}
});
