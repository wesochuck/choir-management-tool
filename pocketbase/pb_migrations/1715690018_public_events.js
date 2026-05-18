migrate((app) => {
  const events = app.findCollectionByNameOrId("pbc_1687431684");
  
  events.listRule = "";
  events.viewRule = "";

  return app.save(events);
}, (app) => {
  const events = app.findCollectionByNameOrId("pbc_1687431684");
  events.listRule = "@request.auth.id != \"\"";
  events.viewRule = "@request.auth.id != \"\"";
  return app.save(events);
});
