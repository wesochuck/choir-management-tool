/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const messages = app.findCollectionByNameOrId("messages");
  const statusField = messages.fields.getByName("status");

  if (
    statusField &&
    statusField.options &&
    Array.isArray(statusField.options.values) &&
    !statusField.options.values.includes("Archived")
  ) {
    statusField.options.values.push("Archived");
  }

  app.save(messages);
}, (app) => {
  const messages = app.findCollectionByNameOrId("messages");
  const statusField = messages.fields.getByName("status");

  if (
    statusField &&
    statusField.options &&
    Array.isArray(statusField.options.values)
  ) {
    statusField.options.values = statusField.options.values.filter(
      (value) => value !== "Archived"
    );
  }

  app.save(messages);
});
