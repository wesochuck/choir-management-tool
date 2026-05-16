migrate((app) => {
  const messages = new Collection({
    "id": "pbc_messages_001",
    "name": "messages",
    "type": "base",
    "fields": [
      { "id": "text3208210256", "name": "id", "type": "text", "primaryKey": true, "required": true, "system": true, "autogeneratePattern": "[a-z0-9]{15}" },
      { "id": "text1579384326", "name": "subject", "type": "text" },
      { "id": "text1146066909", "name": "content", "type": "text", "required": true },
      { "id": "select1704890621", "name": "type", "type": "select", "required": true, "values": ["Email", "SMS", "Both"] },
      { "id": "json2995910389", "name": "recipients", "type": "json", "required": true },
      { "id": "json2818714156", "name": "filters", "type": "json", "required": true },
      { "id": "relation1001261735", "name": "sender", "type": "relation", "collectionId": "_pb_users_auth_", "cascadeDelete": false, "maxSelect": 1 },
      { "id": "autodate2990389176", "name": "created", "type": "autodate", "system": true, "onCreate": true, "onUpdate": false },
      { "id": "autodate3332085495", "name": "updated", "type": "autodate", "system": true, "onCreate": true, "onUpdate": true }
    ],
    "listRule": "@request.auth.role = \"admin\" || @request.auth.collectionName = \"_superusers\"",
    "viewRule": "@request.auth.role = \"admin\" || @request.auth.collectionName = \"_superusers\"",
    "createRule": "@request.auth.role = \"admin\" || @request.auth.collectionName = \"_superusers\"",
    "updateRule": "@request.auth.role = \"admin\" || @request.auth.collectionName = \"_superusers\"",
    "deleteRule": "@request.auth.role = \"admin\" || @request.auth.collectionName = \"_superusers\""
  });

  app.save(messages);
}, (app) => {
  const messages = app.findCollectionByNameOrId("pbc_messages_001");
  if (messages) app.delete(messages);
});
