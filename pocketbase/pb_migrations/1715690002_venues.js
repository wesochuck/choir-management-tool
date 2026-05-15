migrate((app) => {
  const venues = new Collection({
    "id": "venues_coll",
    "name": "venues",
    "type": "base",
    "fields": [
      { "id": "text3208210256", "name": "id", "type": "text", "primaryKey": true, "required": true, "system": true, "autogeneratePattern": "[a-z0-9]{15}" },
      { "id": "text1579384326", "name": "name", "type": "text", "required": true },
      { "id": "json2995910389", "name": "rowCounts", "type": "json", "required": true } // Array of numbers
    ],
    "listRule": "@request.auth.id != \"\"",
    "viewRule": "@request.auth.id != \"\"",
    "createRule": "@request.auth.id != \"\"",
    "updateRule": "@request.auth.id != \"\"",
    "deleteRule": "@request.auth.id != \"\""
  });
  app.save(venues);

  const seatingCharts = new Collection({
    "id": "seatingCharts_coll",
    "name": "seatingCharts",
    "type": "base",
    "fields": [
      { "id": "text3208210256", "name": "id", "type": "text", "primaryKey": true, "required": true, "system": true, "autogeneratePattern": "[a-z0-9]{15}" },
      { "id": "relation1001261735", "name": "performance", "type": "relation", "required": true, "collectionId": "pbc_1687431684", "cascadeDelete": true, "maxSelect": 1 },
      { "id": "relation2170006031", "name": "venue", "type": "relation", "required": true, "collectionId": "venues_coll", "cascadeDelete": true, "maxSelect": 1 },
      { "id": "json2818714156", "name": "layoutOverride", "type": "json" },
      { "id": "json3600819990", "name": "assignments", "type": "json" } // Map of SeatIndex (string) to ProfileID
    ],
    "listRule": "@request.auth.id != \"\"",
    "viewRule": "@request.auth.id != \"\"",
    "createRule": "@request.auth.id != \"\"",
    "updateRule": "@request.auth.id != \"\"",
    "deleteRule": "@request.auth.id != \"\""
  });
  app.save(seatingCharts);
}, (app) => {
  try {
    app.delete(app.findCollectionByNameOrId("seatingCharts_coll"));
  } catch (e) {}
  try {
    app.delete(app.findCollectionByNameOrId("venues_coll"));
  } catch (e) {}
});
