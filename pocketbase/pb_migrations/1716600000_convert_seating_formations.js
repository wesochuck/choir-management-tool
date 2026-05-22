/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_seating_001");

  // 1. Add new formationId field first if it doesn't exist
  let hasFormationId = false;
  for (let i = 0; i < collection.fields.length; i++) {
    if (collection.fields[i].name === "formationId") {
      hasFormationId = true;
      break;
    }
  }

  if (!hasFormationId) {
    collection.fields.push(new TextField({
      name: "formationId",
      required: false
    }));
    app.save(collection);
  }

  // 2. Query all existing records in seating charts and migrate
  const records = app.findRecordsByFilter("pbc_seating_001", "", "", 1000, 0);
  records.forEach((record) => {
    // If the record doesn't have a formationId yet, migrate it
    if (!record.get("formationId")) {
      const formationType = record.get("formationType");

      // Default mapping based on old formationType value
      let targetId = "columns-standard";
      if (formationType === "Row") {
        targetId = "rows-standard";
      }

      record.set("formationId", targetId);
      app.saveNoValidate(record);
    }
  });

  // 3. Drop legacy fields from collection schema
  let fieldsChanged = false;
  collection.fields = collection.fields.filter(f => {
    if (f.name === "sectionOrder" || f.name === "formationType") {
      fieldsChanged = true;
      return false;
    }
    return true;
  });

  if (fieldsChanged) {
    app.save(collection);
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_seating_001");

  // Re-add legacy columns
  let hasSectionOrder = false;
  let hasFormationType = false;
  for (let i = 0; i < collection.fields.length; i++) {
    if (collection.fields[i].name === "sectionOrder") hasSectionOrder = true;
    if (collection.fields[i].name === "formationType") hasFormationType = true;
  }

  if (!hasSectionOrder) {
    collection.fields.push(new TextField({
      name: "sectionOrder",
      required: false
    }));
  }
  if (!hasFormationType) {
    collection.fields.push(new TextField({
      name: "formationType",
      required: false
    }));
  }
  
  if (!hasSectionOrder || !hasFormationType) {
    app.save(collection);
  }

  // Populate legacy columns from formationId
  const records = app.findRecordsByFilter("pbc_seating_001", "", "", 1000, 0);
  records.forEach((record) => {
    const formationId = record.get("formationId");
    if (formationId === "rows-standard") {
      record.set("formationType", "Row");
      record.set("sectionOrder", "S,A,T,B");
    } else {
      record.set("formationType", "Column");
      record.set("sectionOrder", "S,A,T,B");
    }
    app.saveNoValidate(record);
  });

  // Drop formationId
  collection.fields = collection.fields.filter(f => f.name !== "formationId");
  app.save(collection);
});
