migrate((app) => {
  const snapshot = [
    {
      "name": "users",
      "type": "auth",
      "id": "_pb_users_auth_",
      "fields": [
        { "name": "id", "id": "u_id", "type": "text", "primaryKey": true, "required": true, "system": true },
        { "name": "password", "id": "u_pw", "type": "password", "required": true, "system": true, "min": 8 },
        { "name": "tokenKey", "id": "u_tk", "type": "text", "required": true, "system": true },
        { "name": "email", "id": "u_em", "type": "email", "required": true, "system": true },
        { "name": "emailVisibility", "id": "u_ev", "type": "bool", "system": true },
        { "name": "verified", "id": "u_vf", "type": "bool", "system": true },
        { "name": "name", "id": "u_nm", "type": "text" },
        { "name": "role", "id": "u_rl", "type": "select", "required": true, "values": ["admin", "singer"] },
        { "name": "created", "id": "u_cr", "type": "autodate", "system": true, "onCreate": true, "onUpdate": false },
        { "name": "updated", "id": "u_up", "type": "autodate", "system": true, "onCreate": true, "onUpdate": true }
      ],
      "passwordAuth": { "enabled": true }
    },
    {
      "name": "profiles",
      "type": "base",
      "id": "profiles_coll",
      "fields": [
        { "name": "id", "id": "p_id", "type": "text", "primaryKey": true, "required": true, "system": true },
        { "name": "user", "id": "p_ur", "type": "relation", "required": true, "collectionId": "_pb_users_auth_", "cascadeDelete": true, "maxSelect": 1 },
        { "name": "name", "id": "p_nm", "type": "text", "required": true },
        { "name": "phone", "id": "p_ph", "type": "text" },
        { "name": "voicePart", "id": "p_vp", "type": "select", "values": ["S1", "S2", "A1", "A2", "T1", "T2", "B1", "B2"] },
        { "name": "globalStatus", "id": "p_gs", "type": "select", "required": true, "values": ["Active (Current)", "Active (Future)", "Inactive"] },
        { "name": "notes", "id": "p_nt", "type": "text" },
        { "name": "created", "id": "p_cr", "type": "autodate", "system": true, "onCreate": true, "onUpdate": false },
        { "name": "updated", "id": "p_up", "type": "autodate", "system": true, "onCreate": true, "onUpdate": true }
      ],
      "listRule": "@request.auth.role = 'admin' || @request.auth.id = user",
      "viewRule": "@request.auth.role = 'admin' || @request.auth.id = user",
      "createRule": "@request.auth.role = 'admin'",
      "updateRule": "@request.auth.role = 'admin' || @request.auth.id = user",
      "deleteRule": "@request.auth.role = 'admin'"
    },
    {
      "name": "events",
      "type": "base",
      "id": "events_coll",
      "fields": [
        { "name": "id", "id": "e_id", "type": "text", "primaryKey": true, "required": true, "system": true },
        { "name": "date", "id": "e_dt", "type": "date", "required": true },
        { "name": "location", "id": "e_lc", "type": "text", "required": true },
        { "name": "type", "id": "e_tp", "type": "select", "required": true, "values": ["Performance", "Rehearsal"] },
        { "name": "details", "id": "e_dl", "type": "text" },
        { "name": "parentPerformanceId", "id": "e_pp", "type": "relation", "collectionId": "events_coll", "cascadeDelete": false, "maxSelect": 1 },
        { "name": "created", "id": "e_cr", "type": "autodate", "system": true, "onCreate": true, "onUpdate": false },
        { "name": "updated", "id": "e_up", "type": "autodate", "system": true, "onCreate": true, "onUpdate": true }
      ],
      "listRule": "@request.auth.id != ''",
      "viewRule": "@request.auth.id != ''",
      "createRule": "@request.auth.role = 'admin'",
      "updateRule": "@request.auth.role = 'admin'",
      "deleteRule": "@request.auth.role = 'admin'"
    },
    {
      "name": "eventRosters",
      "type": "base",
      "id": "eventRosters_coll",
      "fields": [
        { "name": "id", "id": "er_id", "type": "text", "primaryKey": true, "required": true, "system": true },
        { "name": "profile", "id": "er_pr", "type": "relation", "required": true, "collectionId": "profiles_coll", "cascadeDelete": true, "maxSelect": 1 },
        { "name": "event", "id": "er_ev", "type": "relation", "required": true, "collectionId": "events_coll", "cascadeDelete": true, "maxSelect": 1 },
        { "name": "rsvp", "id": "er_rs", "type": "select", "required": true, "values": ["Yes", "No", "Pending"] },
        { "name": "attendance", "id": "er_at", "type": "select", "required": true, "values": ["Present", "Absent", "Pending"] },
        { "name": "seatId", "id": "er_si", "type": "text" },
        { "name": "created", "id": "er_cr", "type": "autodate", "system": true, "onCreate": true, "onUpdate": false },
        { "name": "updated", "id": "er_up", "type": "autodate", "system": true, "onCreate": true, "onUpdate": true }
      ],
      "listRule": "@request.auth.id != ''",
      "viewRule": "@request.auth.id != ''",
      "createRule": "@request.auth.role = 'admin'",
      "updateRule": "@request.auth.role = 'admin' || @request.auth.id = profile.user",
      "deleteRule": "@request.auth.role = 'admin'"
    }
  ];

  return app.importCollections(snapshot, false);
}, (app) => {
  return null;
});
