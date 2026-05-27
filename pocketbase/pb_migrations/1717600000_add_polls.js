/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const polls = new Collection({
    id: "pbc_polls_001",
    name: "polls",
    type: "base",
    system: false,
    indexes: [],
    listRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
    viewRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
    createRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
    updateRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
    deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
  });

  polls.fields.add(
    new TextField({
      name: "question",
      required: true
    }),
    new RelationField({
      name: "eventId",
      collectionId: "pbc_1687431684", // events
      maxSelect: 1,
      required: false
    }),
    new RelationField({
      name: "creatorId",
      collectionId: "_pb_users_auth_",
      maxSelect: 1,
      required: false
    })
  );

  app.save(polls);

  const pollResponses = new Collection({
    id: "pbc_poll_responses_001",
    name: "pollResponses",
    type: "base",
    system: false,
    indexes: [
      "CREATE UNIQUE INDEX `idx_poll_profile` ON `pollResponses` (`pollId`, `profileId`)"
    ],
    listRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
    viewRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
    createRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
    updateRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
    deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
  });

  pollResponses.fields.add(
    new RelationField({
      name: "pollId",
      collectionId: "pbc_polls_001",
      maxSelect: 1,
      required: true,
      cascadeDelete: true
    }),
    new RelationField({
      name: "profileId",
      collectionId: "pbc_3414089001", // profiles
      maxSelect: 1,
      required: true,
      cascadeDelete: true
    }),
    new SelectField({
      name: "status",
      values: ["Yes", "No"],
      required: true,
      maxSelect: 1
    })
  );

  app.save(pollResponses);
}, (app) => {
  try {
    const pollResponses = app.findCollectionByNameOrId("pbc_poll_responses_001");
    app.delete(pollResponses);
  } catch (e) {}
  try {
    const polls = app.findCollectionByNameOrId("pbc_polls_001");
    app.delete(polls);
  } catch (e) {}
});
