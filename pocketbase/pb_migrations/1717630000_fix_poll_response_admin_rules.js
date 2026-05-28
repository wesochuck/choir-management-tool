/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const pollResponses = app.findCollectionByNameOrId("pbc_poll_responses_001");
  pollResponses.listRule = "@request.auth.id != '' && (@request.auth.role = 'admin' || profileId.user = @request.auth.id)";
  pollResponses.viewRule = "@request.auth.id != '' && (@request.auth.role = 'admin' || profileId.user = @request.auth.id)";
  app.save(pollResponses);
}, (app) => {
  const pollResponses = app.findCollectionByNameOrId("pbc_poll_responses_001");
  pollResponses.listRule = "@request.auth.id != '' && profileId.user = @request.auth.id";
  pollResponses.viewRule = "@request.auth.id != '' && profileId.user = @request.auth.id";
  app.save(pollResponses);
});
