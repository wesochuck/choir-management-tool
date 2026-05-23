/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const templates = app.findCollectionByNameOrId("pbc_templates_001");
  
  const template = new Record(templates, {
    "title": "Audition Confirmation",
    "subject": "Audition Request Received",
    "content": "Hello {singerName},\n\nThank you for your interest in joining the choir!\n\nWe have received your audition request for **{eventTitle}**.\n\n**Requested Time Slot:** {timeSlot}\n\n{firstRehearsalCalendarLink}\n\nWe will review your request and get back to you shortly with more details.\n\nBest regards,\nChoir Management",
    "type": "Email",
    "isSystemTemplate": true
  });

  app.save(template);
}, (app) => {
  try {
    const record = app.findFirstRecordByFilter("messageTemplates", "title = 'Audition Confirmation'");
    app.delete(record);
  } catch (e) {}
});
