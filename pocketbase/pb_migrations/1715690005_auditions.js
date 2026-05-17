migrate((app) => {
  const auditions = new Collection({
    "id": "pbc_auditions_001",
    "name": "auditions",
    "type": "base",
    "fields": [
      { "id": "text3208210256", "name": "id", "type": "text", "primaryKey": true, "required": true, "system": true, "autogeneratePattern": "[a-z0-9]{15}" },
      { "id": "text1579384326", "name": "name", "type": "text", "required": true },
      { "id": "text1146066909", "name": "contact", "type": "text", "required": true },
      { "id": "text2995910389", "name": "timeSlot", "type": "text", "required": true },
      { "id": "select2188170148", "name": "voicePart", "type": "select", "values": ["S1", "S2", "A1", "A2", "T1", "T2", "B1", "B2"] },
      { "id": "text1174032676", "name": "experience", "type": "text" },
      { "id": "select1704890621", "name": "status", "type": "select", "required": true, "values": ["New", "Contacted", "Scheduled", "Closed"] },
      { "id": "text18589324", "name": "notes", "type": "text" },
      { "id": "autodate2990389176", "name": "created", "type": "autodate", "system": true, "onCreate": true, "onUpdate": false },
      { "id": "autodate3332085495", "name": "updated", "type": "autodate", "system": true, "onCreate": true, "onUpdate": true }
    ],
    "listRule": "@request.auth.role = \"admin\"",
    "viewRule": "@request.auth.role = \"admin\"",
    "createRule": "@request.auth.id != \"\"",
    "updateRule": "@request.auth.role = \"admin\"",
    "deleteRule": "@request.auth.role = \"admin\""
  });

  app.save(auditions);
}, (app) => {
  const auditions = app.findCollectionByNameOrId("pbc_auditions_001");
  if (auditions) {
    app.delete(auditions);
  }
});
