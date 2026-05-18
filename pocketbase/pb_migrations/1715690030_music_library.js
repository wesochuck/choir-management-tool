migrate((app) => {
  const collection = new Collection({
    "id": "pbc_music_library_001",
    "name": "musicLibrary",
    "type": "base",
    "fields": [
      {
        "name": "id",
        "type": "text",
        "primaryKey": true,
        "required": true,
        "system": true,
        "autogeneratePattern": "[a-z0-9]{15}"
      },
      {
        "name": "title",
        "type": "text",
        "required": true
      },
      {
        "name": "composer",
        "type": "text"
      },
      {
        "name": "copies",
        "type": "number"
      },
      {
        "name": "catalogId",
        "type": "text"
      },
      {
        "name": "historicalDates",
        "type": "json"
      },
      {
        "name": "notes",
        "type": "text"
      },
      {
        "name": "created",
        "type": "autodate",
        "system": true,
        "onCreate": true,
        "onUpdate": false
      },
      {
        "name": "updated",
        "type": "autodate",
        "system": true,
        "onCreate": true,
        "onUpdate": true
      }
    ],
    "listRule": "@request.auth.role = \"admin\"",
    "viewRule": "@request.auth.role = \"admin\"",
    "createRule": "@request.auth.role = \"admin\"",
    "updateRule": "@request.auth.role = \"admin\"",
    "deleteRule": "@request.auth.role = \"admin\""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_music_library_001");
  if (collection) {
    return app.delete(collection);
  }
});