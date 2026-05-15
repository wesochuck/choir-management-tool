migrate((app) => {
  const snapshot = [
    {
      "id": "_pb_users_auth_",
      "name": "users",
      "type": "auth",
      "fields": [
        { "id": "text3208210256", "name": "id", "type": "text", "primaryKey": true, "required": true, "system": true, "autogeneratePattern": "[a-z0-9]{15}" },
        { "id": "password901924565", "name": "password", "type": "password", "required": true, "system": true, "min": 8 },
        { "id": "text2504183744", "name": "tokenKey", "type": "text", "required": true, "system": true, "autogeneratePattern": "[a-zA-Z0-9]{50}" },
        { "id": "email3885137012", "name": "email", "type": "email", "required": true, "system": true },
        { "id": "bool1547992806", "name": "emailVisibility", "type": "bool", "system": true },
        { "id": "bool256245529", "name": "verified", "type": "bool", "system": true },
        { "id": "text1579384326", "name": "name", "type": "text" },
        { "id": "select1466534506", "name": "role", "type": "select", "required": true, "values": ["admin", "singer"] },
        { "id": "autodate2990389176", "name": "created", "type": "autodate", "system": true, "onCreate": true, "onUpdate": false },
        { "id": "autodate3332085495", "name": "updated", "type": "autodate", "system": true, "onCreate": true, "onUpdate": true }
      ],
      "createRule": "",
      "updateRule": "id = @request.auth.id",
      "deleteRule": "id = @request.auth.id",
      "viewRule": "id = @request.auth.id",
      "listRule": "id = @request.auth.id",
      "passwordAuth": { "enabled": true }
    },
    {
      "id": "pbc_3414089001",
      "name": "profiles",
      "type": "base",
      "fields": [
        { "id": "text3208210256", "name": "id", "type": "text", "primaryKey": true, "required": true, "system": true, "autogeneratePattern": "[a-z0-9]{15}" },
        { "id": "relation2375276105", "name": "user", "type": "relation", "required": false, "collectionId": "_pb_users_auth_", "cascadeDelete": true, "maxSelect": 1 },
        { "id": "text1579384326", "name": "name", "type": "text", "required": true },
        { "id": "text1146066909", "name": "phone", "type": "text" },
        { "id": "select1704890621", "name": "voicePart", "type": "select", "values": ["S1", "S2", "A1", "A2", "T1", "T2", "B1", "B2"] },
        { "id": "select2995910389", "name": "globalStatus", "type": "select", "required": true, "values": ["Active (Current)", "Active (Future)", "Inactive"] },
        { "id": "text18589324", "name": "notes", "type": "text" }
      ],
      "listRule": "@request.auth.id != \"\"",
      "viewRule": "@request.auth.id != \"\"",
      "createRule": "@request.auth.id != \"\"",
      "updateRule": "@request.auth.id != \"\"",
      "deleteRule": "@request.auth.id != \"\""
    },
    {
      "id": "pbc_1687431684",
      "name": "events",
      "type": "base",
      "fields": [
        { "id": "text3208210256", "name": "id", "type": "text", "primaryKey": true, "required": true, "system": true, "autogeneratePattern": "[a-z0-9]{15}" },
        { "id": "text1579384327", "name": "title", "type": "text" },
        { "id": "date2862495610", "name": "date", "type": "date", "required": true },
        { "id": "text1587448267", "name": "location", "type": "text", "required": true },
        { "id": "select2363381545", "name": "type", "type": "select", "required": true, "values": ["Performance", "Rehearsal"] },
        { "id": "text1915095946", "name": "details", "type": "text" },
        { "id": "relation2818714156", "name": "parentPerformanceId", "type": "relation", "collectionId": "pbc_1687431684", "cascadeDelete": false, "maxSelect": 1 }
      ],
      "listRule": "@request.auth.id != \"\"",
      "viewRule": "@request.auth.id != \"\"",
      "createRule": "@request.auth.id != \"\"",
      "updateRule": "@request.auth.id != \"\"",
      "deleteRule": "@request.auth.id != \"\""
    },
    {
      "id": "pbc_2357252437",
      "name": "eventRosters",
      "type": "base",
      "fields": [
        { "id": "text3208210256", "name": "id", "type": "text", "primaryKey": true, "required": true, "system": true, "autogeneratePattern": "[a-z0-9]{15}" },
        { "id": "relation2170006031", "name": "profile", "type": "relation", "required": true, "collectionId": "pbc_3414089001", "cascadeDelete": true, "maxSelect": 1 },
        { "id": "relation1001261735", "name": "event", "type": "relation", "required": true, "collectionId": "pbc_1687431684", "cascadeDelete": true, "maxSelect": 1 },
        { "id": "select2678443598", "name": "rsvp", "type": "select", "required": true, "values": ["Yes", "No", "Pending"] },
        { "id": "select1843596689", "name": "attendance", "type": "select", "required": true, "values": ["Present", "Absent", "Pending"] },
        { "id": "text3600819990", "name": "seatId", "type": "text" }
      ],
      "listRule": "@request.auth.id != \"\"",
      "viewRule": "@request.auth.id != \"\"",
      "createRule": "@request.auth.id != \"\"",
      "updateRule": "@request.auth.id != \"\"",
      "deleteRule": "@request.auth.id != \"\""
    }
  ];

  return app.importCollections(snapshot, false);
}, (app) => {
  return null;
});
