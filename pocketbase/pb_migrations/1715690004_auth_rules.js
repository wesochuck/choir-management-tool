migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  users.createRule = "@request.auth.role = \"admin\"";
  users.updateRule = "@request.auth.role = \"admin\" || id = @request.auth.id";
  users.deleteRule = "@request.auth.role = \"admin\"";
  users.viewRule = "@request.auth.role = \"admin\" || id = @request.auth.id";
  users.listRule = "@request.auth.role = \"admin\" || id = @request.auth.id";
  app.save(users);

  const profiles = app.findCollectionByNameOrId("profiles");
  profiles.listRule = "@request.auth.role = \"admin\" || user = @request.auth.id";
  profiles.viewRule = "@request.auth.role = \"admin\" || user = @request.auth.id";
  profiles.createRule = "@request.auth.role = \"admin\"";
  profiles.updateRule = "@request.auth.role = \"admin\" || user = @request.auth.id";
  profiles.deleteRule = "@request.auth.role = \"admin\"";
  app.save(profiles);

  const events = app.findCollectionByNameOrId("events");
  events.createRule = "@request.auth.role = \"admin\"";
  events.updateRule = "@request.auth.role = \"admin\"";
  events.deleteRule = "@request.auth.role = \"admin\"";
  app.save(events);

  const eventRosters = app.findCollectionByNameOrId("eventRosters");
  eventRosters.createRule = "@request.auth.role = \"admin\" || profile.user = @request.auth.id";
  eventRosters.updateRule = "@request.auth.role = \"admin\" || profile.user = @request.auth.id";
  eventRosters.deleteRule = "@request.auth.role = \"admin\"";
  app.save(eventRosters);
}, (app) => {
  const users = app.findCollectionByNameOrId("users");
  users.createRule = "";
  users.updateRule = "id = @request.auth.id";
  users.deleteRule = "id = @request.auth.id";
  users.viewRule = "id = @request.auth.id";
  users.listRule = "id = @request.auth.id";
  app.save(users);

  const profiles = app.findCollectionByNameOrId("profiles");
  profiles.listRule = "@request.auth.id != \"\"";
  profiles.viewRule = "@request.auth.id != \"\"";
  profiles.createRule = "@request.auth.id != \"\"";
  profiles.updateRule = "@request.auth.id != \"\"";
  profiles.deleteRule = "@request.auth.id != \"\"";
  app.save(profiles);

  const events = app.findCollectionByNameOrId("events");
  events.createRule = "@request.auth.id != \"\"";
  events.updateRule = "@request.auth.id != \"\"";
  events.deleteRule = "@request.auth.id != \"\"";
  app.save(events);

  const eventRosters = app.findCollectionByNameOrId("eventRosters");
  eventRosters.createRule = "@request.auth.id != \"\"";
  eventRosters.updateRule = "@request.auth.id != \"\"";
  eventRosters.deleteRule = "@request.auth.id != \"\"";
  app.save(eventRosters);
});
