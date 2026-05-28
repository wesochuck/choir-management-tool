/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // --- polls ---
  const polls = app.findCollectionByNameOrId("pbc_polls_001");

  polls.fields.add(
    new AutodateField({
      name: "created",
      onCreate: true,
      onUpdate: false,
    }),
    new AutodateField({
      name: "updated",
      onCreate: true,
      onUpdate: true,
    })
  );

  app.save(polls);

  // --- pollResponses ---
  const pollResponses = app.findCollectionByNameOrId("pbc_poll_responses_001");

  pollResponses.fields.add(
    new AutodateField({
      name: "created",
      onCreate: true,
      onUpdate: false,
    }),
    new AutodateField({
      name: "updated",
      onCreate: true,
      onUpdate: true,
    })
  );

  app.save(pollResponses);
}, (app) => {
  // Down: remove the autodate fields from both collections
  const polls = app.findCollectionByNameOrId("pbc_polls_001");
  try {
    polls.fields.removeByName("created");
    polls.fields.removeByName("updated");
    app.save(polls);
  } catch (e) {}

  const pollResponses = app.findCollectionByNameOrId("pbc_poll_responses_001");
  try {
    pollResponses.fields.removeByName("created");
    pollResponses.fields.removeByName("updated");
    app.save(pollResponses);
  } catch (e) {}
});
