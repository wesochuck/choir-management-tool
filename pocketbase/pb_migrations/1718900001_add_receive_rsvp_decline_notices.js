/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const profiles = app.findCollectionByNameOrId("profiles");

  // 1. Add receiveRsvpDeclineNotices boolean field
  const existingField = profiles.fields.getByName("receiveRsvpDeclineNotices");
  if (!existingField) {
    profiles.fields.add(
      new BoolField({
        name: "receiveRsvpDeclineNotices",
        required: false,
        presentable: false,
        hidden: false,
        system: false,
        default: false,
      })
    );
    app.save(profiles);
  }

  // 2. Add RSVP Decline Notice template
  const templates = app.findCollectionByNameOrId("pbc_templates_001");
  const template = new Record(templates, {
    "title": "RSVP Decline Notice",
    "subject": "[Choir RSVP] {declinedSingerName} has declined {eventTitle}",
    "content": "Hello {adminName},\n\nThis is to notify you that {declinedSingerName} ({voicePart}) has declined the RSVP for:\n**{eventTitle}** on {eventDate}.\n\n**Reason/Note provided:**\n{rsvpNote}\n\nBest regards,\nChoir Management",
    "type": "Email",
    "isSystemTemplate": true
  });
  app.save(template);
}, (app) => {
  const profiles = app.findCollectionByNameOrId("profiles");
  const field = profiles.fields.getByName("receiveRsvpDeclineNotices");
  if (field) {
    profiles.fields.removeByName("receiveRsvpDeclineNotices");
    app.save(profiles);
  }

  try {
    const record = app.findFirstRecordByFilter("messageTemplates", "title = 'RSVP Decline Notice' && isSystemTemplate = true");
    app.delete(record);
  } catch (e) {}
});
