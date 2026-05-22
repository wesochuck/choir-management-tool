/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_seating_001");

  // 1. Remove old free-form text column if it exists
  const oldIndex = collection.fields.findIndex((f) => f.name === "sectionOrder");
  if (oldIndex !== -1) {
    collection.fields.splice(oldIndex, 1);
  }

  // 2. Remove old formationType if it was added
  const oldTypeIndex = collection.fields.findIndex((f) => f.name === "formationType");
  if (oldTypeIndex !== -1) {
    collection.fields.splice(oldTypeIndex, 1);
  }

  // 3. Insert strict formation template identifier field
  const formationIndex = collection.fields.findIndex((f) => f.name === "formationId");
  if (formationIndex === -1) {
    collection.fields.push(new SchemaField({
      name: "formationId",
      id: "txt_seating_formation_id_001",
      type: "text",
      required: false, // make optional to allow migration without breaking empty tables
      system: false
    }));
  }

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_seating_001");
  const index = collection.fields.findIndex((f) => f.name === "formationId");
  if (index !== -1) {
    collection.fields.splice(index, 1);
    app.save(collection);
  }
});
