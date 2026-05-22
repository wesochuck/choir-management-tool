/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_");

  const preferencesIndex = collection.fields.findIndex((f) => f.name === "preferences");
  if (preferencesIndex === -1) {
    collection.fields.push(new JSONField({
      name: "preferences",
      id: "json_user_preferences_001",
      required: false,
      presentable: false
    }));
    app.save(collection);
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_");
  const field = collection.fields.getByName("preferences");
  if (field) {
    collection.fields.removeById(field.id);
    app.save(collection);
  }
});
