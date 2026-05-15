migrate((db) => {
  const dao = new Dao(db);

  // 1. Update Users collection
  const users = dao.findCollectionByNameOrId("users");
  users.schema.addField(new SchemaField({
    name: "role",
    type: "select",
    required: true,
    options: { maxSelect: 1, values: ["admin", "singer"] }
  }));
  dao.saveCollection(users);

  // 2. Profiles Collection
  const profiles = new Collection({
    name: "profiles",
    type: "base",
    schema: [
      { name: "user", type: "relation", required: true, options: { collectionId: users.id, cascadeDelete: true, maxSelect: 1 } },
      { name: "name", type: "text", required: true },
      { name: "phone", type: "text" },
      { name: "voicePart", type: "select", options: { maxSelect: 1, values: ["S1", "S2", "A1", "A2", "T1", "T2", "B1", "B2"] } },
      { name: "globalStatus", type: "select", required: true, options: { maxSelect: 1, values: ["Active", "Inactive"] } },
      { name: "notes", type: "text" }
    ],
    listRule: "@request.auth.role = 'admin' || @request.auth.id = user",
    viewRule: "@request.auth.role = 'admin' || @request.auth.id = user",
    createRule: "@request.auth.role = 'admin'",
    updateRule: "@request.auth.role = 'admin' || @request.auth.id = user",
    deleteRule: "@request.auth.role = 'admin'"
  });
  dao.saveCollection(profiles);

  // 3. Events Collection
  const events = new Collection({
    name: "events",
    type: "base",
    schema: [
      { name: "date", type: "date", required: true },
      { name: "location", type: "text", required: true },
      { name: "type", type: "select", required: true, options: { maxSelect: 1, values: ["Performance", "Rehearsal"] } },
      { name: "details", type: "text" },
      { name: "parentPerformanceId", type: "relation", options: { collectionId: null, cascadeDelete: false, maxSelect: 1 } } // Will link to self after creation
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.role = 'admin'",
    updateRule: "@request.auth.role = 'admin'",
    deleteRule: "@request.auth.role = 'admin'"
  });
  dao.saveCollection(events);
  
  // Fix parentPerformanceId relation
  events.schema.getFieldByName("parentPerformanceId").options.collectionId = events.id;
  dao.saveCollection(events);

  // 4. EventRosters Collection
  const eventRosters = new Collection({
    name: "eventRosters",
    type: "base",
    schema: [
      { name: "profile", type: "relation", required: true, options: { collectionId: profiles.id, cascadeDelete: true, maxSelect: 1 } },
      { name: "event", type: "relation", required: true, options: { collectionId: events.id, cascadeDelete: true, maxSelect: 1 } },
      { name: "rsvp", type: "select", required: true, options: { maxSelect: 1, values: ["Yes", "No", "Pending"] } },
      { name: "attendance", type: "select", required: true, options: { maxSelect: 1, values: ["Present", "Absent", "Pending"] } },
      { name: "seatId", type: "text" }
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.role = 'admin'",
    updateRule: "@request.auth.role = 'admin' || @request.auth.id = profile.user",
    deleteRule: "@request.auth.role = 'admin'"
  });
  dao.saveCollection(eventRosters);
}, (db) => {
  const dao = new Dao(db);

  try {
    const eventRosters = dao.findCollectionByNameOrId("eventRosters");
    dao.deleteCollection(eventRosters);
  } catch (e) {}

  try {
    const events = dao.findCollectionByNameOrId("events");
    dao.deleteCollection(events);
  } catch (e) {}

  try {
    const profiles = dao.findCollectionByNameOrId("profiles");
    dao.deleteCollection(profiles);
  } catch (e) {}

  try {
    const users = dao.findCollectionByNameOrId("users");
    users.schema.removeField("role");
    dao.saveCollection(users);
  } catch (e) {}
});
