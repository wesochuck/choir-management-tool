migrate((db) => {
  const dao = new Dao(db);

  // 1. Update messages collection with status field
  const messages = dao.findCollectionByNameOrId("pbc_messages_001");
  messages.schema.addField(new SchemaField({
    "name": "status",
    "type": "select",
    "required": true,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": ["Draft", "Sent", "Failed"]
    }
  }));

  // Update existing messages to "Sent"
  db.newQuery("UPDATE messages SET status = 'Sent' WHERE status = '' OR status IS NULL").execute();

  dao.saveCollection(messages);

  // 2. Create messageTemplates collection
  const templates = new Collection({
    "id": "pbc_templates_001",
    "name": "messageTemplates",
    "type": "base",
    "system": false,
    "schema": [
      {
        "name": "title",
        "type": "text",
        "required": true,
        "presentable": true,
        "unique": true,
        "options": { "min": null, "max": null, "pattern": "" }
      },
      {
        "name": "subject",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": { "min": null, "max": null, "pattern": "" }
      },
      {
        "name": "content",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": { "min": null, "max": null, "pattern": "" }
      },
      {
        "name": "type",
        "type": "select",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": ["Email", "SMS", "Both"]
        }
      },
      {
        "name": "isSystem",
        "type": "bool",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      }
    ],
    "indexes": [],
    "listRule": "@request.auth.id != '' && @request.auth.role = 'admin'",
    "viewRule": "@request.auth.id != '' && @request.auth.role = 'admin'",
    "createRule": "@request.auth.id != '' && @request.auth.role = 'admin'",
    "updateRule": "@request.auth.id != '' && @request.auth.role = 'admin'",
    "deleteRule": "@request.auth.id != '' && @request.auth.role = 'admin' && isSystem = false",
    "options": {}
  });

  dao.saveCollection(templates);

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
    const record = new Record(templates);
    record.set("title", seed.title);
    record.set("subject", seed.subject);
    record.set("content", seed.content);
    record.set("type", seed.type);
    record.set("isSystem", seed.isSystem);
    dao.saveRecord(record);
  });

}, (db) => {
  const dao = new Dao(db);
  
  // Down migration
  try {
    const templates = dao.findCollectionByNameOrId("pbc_templates_001");
    dao.deleteCollection(templates);
  } catch (e) {}

  try {
    const messages = dao.findCollectionByNameOrId("pbc_messages_001");
    messages.schema.removeField("status");
    dao.saveCollection(messages);
  } catch (e) {}
});
