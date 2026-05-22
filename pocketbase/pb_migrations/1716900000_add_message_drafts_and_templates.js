/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // 1. Update messages collection with status field
  const messages = app.findCollectionByNameOrId("pbc_messages_001");
  messages.fields.push(new SelectField({
    name: "status",
    id: "select_messages_status_001",
    required: true,
    presentable: false,
    unique: false,
    values: ["Draft", "Sent", "Failed"],
    maxSelect: 1
  }));
  app.save(messages);

  // Update existing messages to "Sent"
  try {
    const records = app.findRecordsByFilter("messages", "status = '' || status = null", "", 10000, 0);
    records.forEach((record) => {
      record.set("status", "Sent");
      app.saveNoValidate(record);
    });
  } catch (e) {
    console.log("Failed to backfill message status:", e);
  }

  // 2. Create messageTemplates collection
  const templates = new Collection({
    id: "pbc_templates_001",
    name: "messageTemplates",
    type: "base",
    system: false,
    fields: [
      new TextField({
        name: "id",
        primaryKey: true,
        required: true,
        system: true,
        pattern: "^[a-z0-9]+$"
      }),
      new TextField({
        name: "title",
        id: "text_templates_title_001",
        required: true,
        presentable: true,
        unique: true
      }),
      new TextField({
        name: "subject",
        id: "text_templates_subject_001",
        required: false,
      }),
      new TextField({
        name: "content",
        id: "text_templates_content_001",
        required: true,
      }),
      new SelectField({
        name: "type",
        id: "select_templates_type_001",
        required: true,
        values: ["Email", "SMS", "Both"],
        maxSelect: 1
      }),
      new BoolField({
        name: "isSystem",
        id: "bool_templates_isSystem_001",
        required: false,
      })
    ],
    indexes: [],
    listRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
    viewRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
    createRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
    updateRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
    deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin' && isSystem = false",
  });

  app.save(templates);

  // 3. Seed core templates
  const seeds = [
    {
      "title": "General Announcement",
      "subject": "Choir Announcement: {title}",
      "content": "Hello everyone,\n\nI have an important announcement regarding our upcoming schedule.\n\n[Your message here]\n\nBest regards,\nChoir Management",
      "type": "Email",
      "isSystem": true
    },
    {
      "title": "Event RSVP Invitation",
      "subject": "Invitation: {eventTitle}",
      "content": "Hello {singerName},\n\nRSVP is now open for our upcoming {eventType}: {eventTitle}.\n\nDate: {eventDate}\nLocation: {eventLocation}\n\nPlease let us know if you can attend using the links below:\n\n{{RSVP_LINKS}}\n\nDetails:\n{eventDetails}",
      "type": "Email",
      "isSystem": true
    },
    {
      "title": "Rehearsal Reminder",
      "subject": "Reminder: Rehearsal for {eventTitle}",
      "content": "Hi {singerName},\n\nThis is a friendly reminder for our rehearsal on {eventDate} at {eventLocation}.\n\nLooking forward to seeing you there!\n\n{{RSVP_LINKS}}",
      "type": "Email",
      "isSystem": true
    },
    {
      "title": "Dues Payment Notice",
      "subject": "Choir Dues Payment Reminder",
      "content": "Hello {singerName},\n\nOur seasonal dues for the current term are now being collected. If you haven't had a chance to pay yet, please do so at your earliest convenience.\n\nIf you've already paid, please ignore this message.\n\nThank you for your support!",
      "type": "Email",
      "isSystem": true
    },
    {
      "title": "Weather / Schedule Delay Alert",
      "subject": "IMPORTANT: Schedule Change for {eventTitle}",
      "content": "Attention Choir Members,\n\nDue to inclement weather, today's rehearsal/performance for {eventTitle} has been delayed or cancelled.\n\nNew Time/Status: [Details here]\n\nPlease stay safe!",
      "type": "Both",
      "isSystem": true
    }
  ];

  seeds.forEach(seed => {
    const record = new Record(templates, {
      "title": seed.title,
      "subject": seed.subject,
      "content": seed.content,
      "type": seed.type,
      "isSystem": seed.isSystem
    });
    app.save(record);
  });

}, (app) => {
  // Down migration
  try {
    const templates = app.findCollectionByNameOrId("pbc_templates_001");
    app.delete(templates);
  } catch (e) {}

  try {
    const messages = app.findCollectionByNameOrId("pbc_messages_001");
    const index = messages.fields.findIndex(f => f.name === "status");
    if (index !== -1) {
      messages.fields.splice(index, 1);
    }
    app.save(messages);
  } catch (e) {}
});
