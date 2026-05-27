/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const polls = app.findCollectionByNameOrId("pbc_polls_001");
  const pollResponses = app.findCollectionByNameOrId("pbc_poll_responses_001");

  polls.listRule = "@request.auth.id != ''";
  polls.viewRule = "@request.auth.id != ''";
  
  pollResponses.listRule = "@request.auth.id != '' && profileId.user = @request.auth.id";
  pollResponses.viewRule = "@request.auth.id != '' && profileId.user = @request.auth.id";
  pollResponses.createRule = "@request.auth.id != '' && profileId.user = @request.auth.id";
  pollResponses.updateRule = "@request.auth.id != '' && profileId.user = @request.auth.id";

  app.save(polls);
  app.save(pollResponses);
}, (app) => {
  const polls = app.findCollectionByNameOrId("pbc_polls_001");
  const pollResponses = app.findCollectionByNameOrId("pbc_poll_responses_001");

  polls.listRule = "@request.auth.id != '' && @request.auth.role = 'admin'";
  polls.viewRule = "@request.auth.id != '' && @request.auth.role = 'admin'";
  
  pollResponses.listRule = "@request.auth.id != '' && @request.auth.role = 'admin'";
  pollResponses.viewRule = "@request.auth.id != '' && @request.auth.role = 'admin'";
  pollResponses.createRule = "@request.auth.id != '' && @request.auth.role = 'admin'";
  pollResponses.updateRule = "@request.auth.id != '' && @request.auth.role = 'admin'";

  app.save(polls);
  app.save(pollResponses);
});
