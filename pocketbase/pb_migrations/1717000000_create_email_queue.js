/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const queue = new Collection({
    id: "pbc_email_queue_001",
    name: "emailQueue",
    type: "base",
    system: false,
    indexes: [],
    listRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
    viewRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
    createRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
    updateRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
    deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
  });

  queue.fields.add(
    new RelationField({
      name: "messageRef",
      collectionId: "pbc_messages_001",
      maxSelect: 1,
      cascadeDelete: true,
      required: false
    }),
    new TextField({
      name: "recipientId",
      required: true
    }),
    new TextField({
      name: "recipientEmail",
      required: true
    }),
    new TextField({
      name: "recipientName",
      required: false
    }),
    new TextField({
      name: "subject",
      required: true
    }),
    new TextField({
      name: "rawContent",
      required: true
    }),
    new TextField({
      name: "htmlBody",
      required: false
    }),
    new SelectField({
      name: "status",
      required: true,
      values: ["Pending", "Processing", "Sent", "Failed"],
      maxSelect: 1
    }),
    new NumberField({
      name: "attempts",
      required: true,
      onlyInt: true
    }),
    new TextField({
      name: "errorMessage",
      required: false
    }),
    new JSONField({
      name: "filters",
      required: false
    })
  );

  app.save(queue);
}, (app) => {
  try {
    const queue = app.findCollectionByNameOrId("pbc_email_queue_001");
    app.delete(queue);
  } catch (e) {}
});
