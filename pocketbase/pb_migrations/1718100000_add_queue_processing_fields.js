/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_email_queue_001");

  collection.fields.add(
    new TextField({
      name: "processingRunId",
      required: false,
    }),
    new DateField({
      name: "processingStartedAt",
      required: false,
    }),
    new DateField({
      name: "sentAt",
      required: false,
    })
  );
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_email_queue_001");
  try {
    collection.fields.removeByName("processingRunId");
    collection.fields.removeByName("processingStartedAt");
    collection.fields.removeByName("sentAt");
    app.save(collection);
  } catch (e) {}
});
