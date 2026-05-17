migrate((app) => {
  const profiles = app.findCollectionByNameOrId("pbc_3414089001");
  const events = app.findCollectionByNameOrId("pbc_1687431684");

  profiles.fields.add(new BoolField({
    name: "doNotEmail",
    system: false,
    required: false,
  }));

  profiles.fields.add(new BoolField({
    name: "statusIsManual",
    system: false,
    required: false,
  }));

  profiles.fields.add(new DateField({
    name: "statusLastChangedAt",
    system: false,
    required: false,
  }));

  profiles.fields.add(new TextField({
    name: "statusChangeReason",
    system: false,
    required: false,
  }));

  events.fields.add(new BoolField({
    name: "isOpenForRSVP",
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
