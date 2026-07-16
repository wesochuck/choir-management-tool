/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Rename the public RSVP confirmation to 'Free Ticket RSVP Confirmation'
    try {
      const publicRsvp = app.findFirstRecordByFilter(
        'pbc_templates_001',
        "title = 'RSVP Confirmation' && subject = 'Your RSVP for {eventTitle}'"
      );
      if (publicRsvp) {
        publicRsvp.set('title', 'Free Ticket RSVP Confirmation');
        app.save(publicRsvp);
      }
    } catch (e) {
      console.log('Public RSVP Confirmation template not found for rename.');
    }

    // 2. Delete the old Rehearsal Reminder (the one without a systemRole)
    try {
      const oldRehearsalReminder = app.findFirstRecordByFilter(
        'pbc_templates_001',
        "title = 'Rehearsal Reminder' && (systemRole = '' || systemRole = null)"
      );
      if (oldRehearsalReminder) {
        app.delete(oldRehearsalReminder);
      }
    } catch (e) {
      console.log('Old Rehearsal Reminder template not found for deletion.');
    }
  },
  (app) => {
    // Revert the rename of the public RSVP confirmation
    try {
      const publicRsvp = app.findFirstRecordByFilter(
        'pbc_templates_001',
        "title = 'Free Ticket RSVP Confirmation'"
      );
      if (publicRsvp) {
        publicRsvp.set('title', 'RSVP Confirmation');
        app.save(publicRsvp);
      }
    } catch (e) {}

    // Revert deletion of old Rehearsal Reminder by recreating it
    try {
      const templates = app.findCollectionByNameOrId('pbc_templates_001');
      const oldRehearsalReminder = new Record(templates, {
        title: 'Rehearsal Reminder',
        subject: 'Reminder: Rehearsal for {eventTitle}',
        content:
          'Hi {singerName},\n\nThis is a friendly reminder for our rehearsal on {eventDate} at {eventLocation}.\n\nLooking forward to seeing you there!\n\n{{RSVP_LINKS}}',
        type: 'Email',
        isSystemTemplate: true,
      });
      app.save(oldRehearsalReminder);
    } catch (e) {}
  }
);
