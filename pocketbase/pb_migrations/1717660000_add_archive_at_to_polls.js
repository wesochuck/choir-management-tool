/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const polls = app.findCollectionByNameOrId("pbc_polls_001");

  polls.fields.add(
    new DateField({
      name: "archiveAt",
      required: false,
    })
  );

  app.save(polls);
}, (app) => {
  const polls = app.findCollectionByNameOrId("pbc_polls_001");
  try {
    polls.fields.removeByName("archiveAt");
    app.save(polls);
  } catch (e) {}
});
