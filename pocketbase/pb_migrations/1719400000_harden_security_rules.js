/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // 1. Harden eventRosters (Collection ID: pbc_2357252437)
  const eventRosters = app.findCollectionByNameOrId("pbc_2357252437");
  eventRosters.listRule = "@request.auth.role = 'admin' || profile.user = @request.auth.id";
  eventRosters.viewRule = "@request.auth.role = 'admin' || profile.user = @request.auth.id";
  app.save(eventRosters);

  // 2. Harden messages (Collection ID: pbc_messages_001)
  const messages = app.findCollectionByNameOrId("pbc_messages_001");
  messages.listRule = "@request.auth.role = 'admin' || (status = 'Sent' && recipients.id ?~ @request.auth.profiles_via_user.id)";
  messages.viewRule = "@request.auth.role = 'admin' || (status = 'Sent' && recipients.id ?~ @request.auth.profiles_via_user.id)";
  app.save(messages);
}, (app) => {
  // Down migration
  const eventRosters = app.findCollectionByNameOrId("pbc_2357252437");
  eventRosters.listRule = "@request.auth.id != ''";
  eventRosters.viewRule = "@request.auth.id != ''";
  app.save(eventRosters);

  const messages = app.findCollectionByNameOrId("pbc_messages_001");
  messages.listRule = "@request.auth.id != '' && (@request.auth.role = 'admin' || status = 'Sent')";
  messages.viewRule = "@request.auth.id != '' && (@request.auth.role = 'admin' || status = 'Sent')";
  app.save(messages);
});
