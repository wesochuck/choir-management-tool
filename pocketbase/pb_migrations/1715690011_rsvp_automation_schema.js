migrate((app) => {
  const profiles = app.findCollectionByNameOrId("pbc_3414089001");
  const events = app.findCollectionByNameOrId("pbc_1687431684");

  profiles.fields.add(new SchemaField({
    name: "doNotEmail",
    type: "bool",
    system: false,
    required: false,
  }));

  profiles.fields.add(new SchemaField({
    name: "statusIsManual",
    type: "bool",
    system: false,
    required: false,
  }));

  profiles.fields.add(new SchemaField({
    name: "statusLastChangedAt",
    type: "date",
    system: false,
    required: false,
  }));

  profiles.fields.add(new SchemaField({
    name: "statusChangeReason",
    type: "text",
    system: false,
    required: false,
  }));

  events.fields.add(new SchemaField({
    name: "isOpenForRSVP",
    type: "bool",
    system: false,
    required: false,
  }));

  app.save(profiles);
  app.save(events);
}, (app) => {
  const profiles = app.findCollectionByNameOrId("pbc_3414089001");
  const events = app.findCollectionByNameOrId("pbc_1687431684");

  profiles.fields.removeByName("doNotEmail");
  profiles.fields.removeByName("statusIsManual");
  profiles.fields.removeByName("statusLastChangedAt");
  profiles.fields.removeByName("statusChangeReason");
  events.fields.removeByName("isOpenForRSVP");

  app.save(profiles);
  app.save(events);
});
