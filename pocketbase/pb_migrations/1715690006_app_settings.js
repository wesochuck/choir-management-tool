migrate((app) => {
  const appSettings = new Collection({
    "id": "pbc_settings_001",
    "name": "appSettings",
    "type": "base",
    "fields": [
      { "id": "text3208210256", "name": "id", "type": "text", "primaryKey": true, "required": true, "system": true, "autogeneratePattern": "[a-z0-9]{15}" },
      { "id": "text1579384326", "name": "key", "type": "text", "required": true },
      { "id": "json2995910389", "name": "value", "type": "json", "required": true },
      { "id": "bool1146066909", "name": "isPublic", "type": "bool" },
      { "id": "autodate2990389176", "name": "created", "type": "autodate", "system": true, "onCreate": true, "onUpdate": false },
      { "id": "autodate3332085495", "name": "updated", "type": "autodate", "system": true, "onCreate": true, "onUpdate": true }
    ],
    "listRule": "@request.auth.role = \"admin\" || isPublic = true",
    "viewRule": "@request.auth.role = \"admin\" || isPublic = true",
    "createRule": "@request.auth.role = \"admin\"",
    "updateRule": "@request.auth.role = \"admin\"",
    "deleteRule": "@request.auth.role = \"admin\""
  });

  app.save(appSettings);
}, (app) => {
  const appSettings = app.findCollectionByNameOrId("pbc_settings_001");
  if (appSettings) {
    app.delete(appSettings);
  }
});
