/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const templates = app.findCollectionByNameOrId("pbc_templates_001");

  templates.fields.add(
    new TextField({
      name: "title",
      required: true,
      presentable: true,
      unique: true
    }),
    new TextField({
      name: "subject",
      required: false,
    }),
    new TextField({
      name: "content",
      required: true,
    }),
    new SelectField({
      name: "type",
      required: true,
      values: ["Email", "SMS", "Both"],
      maxSelect: 1
    }),
    new BoolField({
      name: "isSystemTemplate",
      required: false,
    })
  );

  templates.listRule = "@request.auth.id != '' && @request.auth.role = 'admin'";
  templates.viewRule = "@request.auth.id != '' && @request.auth.role = 'admin'";
  templates.createRule = "@request.auth.id != '' && @request.auth.role = 'admin'";
  templates.updateRule = "@request.auth.id != '' && @request.auth.role = 'admin'";
  templates.deleteRule = "@request.auth.id != '' && @request.auth.role = 'admin'";
  app.save(templates);

  try {
    const records = app.findRecordsByFilter("messageTemplates", "title = '' || title = null", "", 10000, 0);
    records.forEach((record) => {
      app.delete(record);
    });
  } catch (e) {
    console.log("Failed to remove incomplete message template records:", e);
  }

  const seeds = [
    {
      "title": "General Announcement",
      "subject": "Choir Announcement: {title}",
      "content": "Hello everyone,\n\nI have an important announcement regarding our upcoming schedule.\n\n[Your message here]\n\nBest regards,\nChoir Management",
      "type": "Email",
      "isSystemTemplate": true
    },
    {
      "title": "Event RSVP Invitation",
      "subject": "Invitation: {eventTitle}",
      "content": "Hello {singerName},\n\nRSVP is now open for our upcoming {eventType}: {eventTitle}.\n\nDate: {eventDate}\nLocation: {eventLocation}\n\nPlease let us know if you can attend using the links below:\n\n{{RSVP_LINKS}}\n\nDetails:\n{eventDetails}",
      "type": "Email",
      "isSystemTemplate": true
    },
    {
      "title": "Rehearsal Reminder",
      "subject": "Reminder: Rehearsal for {eventTitle}",
      "content": "Hi {singerName},\n\nThis is a friendly reminder for our rehearsal on {eventDate} at {eventLocation}.\n\nLooking forward to seeing you there!\n\n{{RSVP_LINKS}}",
      "type": "Email",
      "isSystemTemplate": true
    },
    {
      "title": "Dues Payment Notice",
      "subject": "Choir Dues Payment Reminder",
      "content": "Hello {singerName},\n\nOur seasonal dues for the current term are now being collected. If you haven't had a chance to pay yet, please do so at your earliest convenience.\n\nIf you've already paid, please ignore this message.\n\nThank you for your support!",
      "type": "Email",
      "isSystemTemplate": true
    },
    {
      "title": "Weather / Schedule Delay Alert",
      "subject": "IMPORTANT: Schedule Change for {eventTitle}",
      "content": "Attention Choir Members,\n\nDue to inclement weather, today's rehearsal/performance for {eventTitle} has been delayed or cancelled.\n\nNew Time/Status: [Details here]\n\nPlease stay safe!",
      "type": "Both",
      "isSystemTemplate": true
    }
  ];

  seeds.forEach(seed => {
    try {
      app.findFirstRecordByFilter("messageTemplates", "title = {:title}", { title: seed.title });
    } catch (e) {
      const record = new Record(templates, {
        "title": seed.title,
        "subject": seed.subject,
        "content": seed.content,
        "type": seed.type,
        "isSystemTemplate": seed.isSystemTemplate
      });
      app.save(record);
    }
  });

  templates.deleteRule = "@request.auth.id != '' && @request.auth.role = 'admin' && isSystemTemplate = false";
  app.save(templates);
}, (app) => {
  const templates = app.findCollectionByNameOrId("pbc_templates_001");
  templates.deleteRule = "@request.auth.id != '' && @request.auth.role = 'admin'";
  app.save(templates);
});
