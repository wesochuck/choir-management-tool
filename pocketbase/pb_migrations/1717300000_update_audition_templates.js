/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const templates = app.findCollectionByNameOrId("pbc_templates_001");
  
  // 1. Update the existing 'Audition Confirmation' template to remove the calendar link
  try {
    const confirmationTemplate = app.findFirstRecordByFilter("messageTemplates", "title = 'Audition Confirmation'");
    confirmationTemplate.set("content", "Hello {singerName},\n\nThank you for your interest in joining the choir!\n\nWe have received your audition request for **{eventTitle}**.\n\n**Requested Time Slot:** {timeSlot}\n\nWe will review your request and get back to you shortly with more details.\n\nBest regards,\nChoir Management");
    app.save(confirmationTemplate);
  } catch (e) {}

  // 2. Add new 'Audition Scheduled' template
  const scheduledTemplate = new Record(templates, {
    "title": "Audition Scheduled",
    "subject": "Audition Confirmed: {eventTitle}",
    "content": "Hello {singerName},\n\nWe are pleased to confirm your audition for **{eventTitle}**.\n\n**Confirmed Time Slot:** {timeSlot}\n\n{eventCalendarLink}\n\nPlease arrive 10 minutes early to warm up. If you need to cancel or reschedule, please let us know as soon as possible.\n\nBest regards,\nChoir Management",
    "type": "Email",
    "isSystemTemplate": true
  });
  app.save(scheduledTemplate);

  // 3. Add new 'Audition Declined' template
  const declinedTemplate = new Record(templates, {
    "title": "Audition Declined",
    "subject": "Update on your Audition",
    "content": "Hello {singerName},\n\nThank you for your interest and for taking the time to request an audition for **{eventTitle}**.\n\nUnfortunately, we are not able to offer you an audition slot at this time, as our sections are currently full.\n\nWe appreciate your interest in singing with us and encourage you to reach out for future seasons.\n\nBest regards,\nChoir Management",
    "type": "Email",
    "isSystemTemplate": true
  });
  app.save(declinedTemplate);

}, (app) => {
  try {
    const sRecord = app.findFirstRecordByFilter("messageTemplates", "title = 'Audition Scheduled'");
    app.delete(sRecord);
  } catch (e) {}
  try {
    const dRecord = app.findFirstRecordByFilter("messageTemplates", "title = 'Audition Declined'");
    app.delete(dRecord);
  } catch (e) {}
});
