/// <reference path="../pb_data/types.d.ts" />

// Fix: Set manageRule on users collection so admins can view/update
// other users' hidden auth fields (email, password).
// Without this, the email field is invisible in API responses and
// PATCH requests that include email/password for other users fail with 400.

migrate((app) => {
  const users = app.findCollectionByNameOrId("_pb_users_auth_");
  users.manageRule = '@request.auth.role = "admin"';
  app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId("_pb_users_auth_");
  users.manageRule = null;
  app.save(users);
});
