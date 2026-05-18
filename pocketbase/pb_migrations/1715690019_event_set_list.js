migrate((app) => {
  const events = app.findCollectionByNameOrId("pbc_1687431684");

  events.fields.add(new JSONField({
    "name": "setList",
    "system": false,
    "required": false
  }));

  app.save(events);
}, (app) => {
  const events = app.findCollectionByNameOrId("pbc_1687431684");
  events.fields.removeByName("setList");
  app.save(events);
});
