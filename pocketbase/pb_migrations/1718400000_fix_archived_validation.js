/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const messages = app.findCollectionByNameOrId("messages");
  
  // 1. Update status field to definitely include "Archived"
  const statusField = messages.fields.getByName("status");
  if (statusField) {
    statusField.values = ["Draft", "Sent", "Failed", "Archived"];
  }

  // 2. Relax recipients field requirement to allow empty arrays for archived messages
  const recipientsField = messages.fields.getByName("recipients");
  if (recipientsField) {
    recipientsField.required = false;
  }

  app.save(messages);
}, (app) => {
  const messages = app.findCollectionByNameOrId("messages");
  
  const statusField = messages.fields.getByName("status");
  if (statusField) {
    statusField.values = ["Draft", "Sent", "Failed"];
  }

  const recipientsField = messages.fields.getByName("recipients");
  if (recipientsField) {
    recipientsField.required = true;
  }

  app.save(messages);
});
