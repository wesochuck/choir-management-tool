migrate((app) => {
  const venues = new Collection({
    "id": "pbc_venues_001",
    "name": "venues",
    "type": "base",
    "fields": [
      { "id": "text3208210256", "name": "id", "type": "text", "primaryKey": true, "required": true, "system": true, "autogeneratePattern": "[a-z0-9]{15}" },
      { "id": "text1579384326", "name": "name", "type": "text", "required": true },
      { "id": "json2995910389", "name": "rowCounts", "type": "json", "required": true }
    ],
    "listRule": "@request.auth.id != \"\"",
    "viewRule": "@request.auth.id != \"\"",
    "createRule": "@request.auth.id != \"\"",
    "updateRule": "@request.auth.id != \"\"",
    "deleteRule": "@request.auth.id != \"\""
  });
  app.save(venues);

  const seatingCharts = new Collection({
    "id": "pbc_seating_001",
    "name": "seatingCharts",
    "type": "base",
    "fields": [
      { "id": "text3208210256", "name": "id", "type": "text", "primaryKey": true, "required": true, "system": true, "autogeneratePattern": "[a-z0-9]{15}" },
      { "id": "relation1001261735", "name": "performance", "type": "relation", "required": true, "collectionId": "pbc_1687431684", "cascadeDelete": true, "maxSelect": 1 },
      { "id": "relation2170006031", "name": "venue", "type": "relation", "required": true, "collectionId": "pbc_venues_001", "cascadeDelete": true, "maxSelect": 1 },
      { "id": "json2818714156", "name": "layoutOverride", "type": "json" },
      { "id": "json3600819990", "name": "assignments", "type": "json" }
    ],
    "listRule": "@request.auth.id != \"\"",
    "viewRule": "@request.auth.id != \"\"",
    "createRule": "@request.auth.id != \"\"",
    "updateRule": "@request.auth.id != \"\"",
    "deleteRule": "@request.auth.id != \"\""
  });
  app.save(seatingCharts);
}, (app) => {
  return null;
});
