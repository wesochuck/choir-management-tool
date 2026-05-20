/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1687431684");
  
  // Create and add the new bool field explicitly
  collection.fields.push(new BoolField({
    name: "setListApproved",
    id: "bool3510191381", // explicitly unique and stable
    hidden: false,
    presentable: false,
    required: false,
    system: false
  }));
  app.save(collection);

  // Seed all existing events to approved = true
  const events = app.findRecordsByFilter("events", "1=1", "", 1000, 0);
  events.forEach((event) => {
    event.set("setListApproved", true);
    app.save(event);
  });
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1687431684");
  const index = collection.fields.findIndex(f => f.name === "setListApproved");
  if (index !== -1) {
    collection.fields.splice(index, 1);
  }
  app.save(collection);
});
