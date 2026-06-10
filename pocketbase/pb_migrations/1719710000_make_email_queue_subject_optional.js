/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const queue = app.findCollectionByNameOrId("emailQueue");
  const subjectField = queue.fields.getByName("subject");
  if (subjectField) {
    subjectField.required = false;
  }
  app.save(queue);
}, (app) => {
  const queue = app.findCollectionByNameOrId("emailQueue");
  const subjectField = queue.fields.getByName("subject");
  if (subjectField) {
    subjectField.required = true;
  }
  app.save(queue);
});
