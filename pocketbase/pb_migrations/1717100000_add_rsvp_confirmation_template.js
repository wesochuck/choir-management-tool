/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const templates = app.findCollectionByNameOrId("pbc_templates_001");
  
  const template = new Record(templates, {
    "title": "RSVP Confirmation",
    "subject": "Confirmed: {eventTitle}",
    "content": "Hello {singerName},\n\nYour RSVP for **{eventTitle}** has been recorded successfully.\n\nWe're so glad you'll be joining us! Please save the date and we'll see you at the first rehearsal.\n\n**Event Details:**\n{{EVENT_INFO}}\n\nIf your plans change, you can update your RSVP anytime through the member portal.\n\nBest regards,\nChoir Management",
    "type": "Email",
    "isSystemTemplate": true
  });

  app.save(template);
}, (app) => {
  try {
    const record = app.findFirstRecordByFilter("messageTemplates", "title = 'RSVP Confirmation'");
    app.delete(record);
  } catch (e) {}
});
