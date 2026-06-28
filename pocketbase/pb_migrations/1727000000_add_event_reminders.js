/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Add fields to events collection (pbc_1687431684)
    const events = app.findCollectionByNameOrId('pbc_1687431684');

    if (!events.fields.getByName('enableAutomatedReminder')) {
      events.fields.add(
        new BoolField({
          name: 'enableAutomatedReminder',
          required: false,
        })
      );
    }

    if (!events.fields.getByName('reminderLeadTimeHours')) {
      events.fields.add(
        new NumberField({
          name: 'reminderLeadTimeHours',
          required: false,
          min: 0,
          onlyInt: true,
        })
      );
    }

    if (!events.fields.getByName('reminderSentAt')) {
      events.fields.add(
        new DateField({
          name: 'reminderSentAt',
          required: false,
        })
      );
    }

    app.save(events);

    // 2. Add systemRole to messageTemplates collection (pbc_templates_001)
    const templates = app.findCollectionByNameOrId('pbc_templates_001');

    if (!templates.fields.getByName('systemRole')) {
      templates.fields.add(
        new SelectField({
          name: 'systemRole',
          required: false,
          values: ['performance_reminder', 'rehearsal_reminder'],
          maxSelect: 1,
        })
      );
      app.save(templates);
    }

    // 3. Seed templates for Performance Reminder and Rehearsal Reminder
    // We check if they already exist first to prevent duplicates
    try {
      const existingPerf = app.findFirstRecordByFilter(
        'pbc_templates_001',
        "systemRole = 'performance_reminder'"
      );
    } catch (e) {
      const perfTemplate = new Record(templates, {
        title: 'Performance Reminder',
        subject: 'Reminder: Upcoming Performance - {eventTitle}',
        content:
          'Hi {singerName},\n\nThis is a friendly reminder for our upcoming performance: {eventTitle}.\n\nDate & Time: {eventDate}\nLocation: {eventLocation}\nCall Time: {eventCallTime}\n\nSet List:\n{setlist}\n\nPlease review your RSVP and details below.\n\nPractice Player:\n{{PLAYER_LINK}}\n\nRSVP buttons:\n{{RSVP_LINKS}}\n\nThank you,\n{choirName}',
        type: 'Email',
        isSystemTemplate: true,
        systemRole: 'performance_reminder',
      });
      app.save(perfTemplate);
    }

    try {
      const existingReh = app.findFirstRecordByFilter(
        'pbc_templates_001',
        "systemRole = 'rehearsal_reminder'"
      );
    } catch (e) {
      const rehTemplate = new Record(templates, {
        title: 'Rehearsal Reminder',
        subject: 'Reminder: Upcoming Rehearsal - {eventTitle}',
        content:
          'Hi {singerName},\n\nThis is a friendly reminder for our upcoming rehearsal: {eventTitle}.\n\nDate & Time: {eventDate}\nLocation: {eventLocation}\n\nPlease let us know if you will be attending.\n\nRSVP buttons:\n{{RSVP_LINKS}}\n\nThank you,\n{choirName}',
        type: 'Email',
        isSystemTemplate: true,
        systemRole: 'rehearsal_reminder',
      });
      app.save(rehTemplate);
    }
  },
  (app) => {
    // Down migration
    try {
      const perfTemplate = app.findFirstRecordByFilter(
        'pbc_templates_001',
        "systemRole = 'performance_reminder'"
      );
      if (perfTemplate) app.delete(perfTemplate);
    } catch (e) {}

    try {
      const rehTemplate = app.findFirstRecordByFilter(
        'pbc_templates_001',
        "systemRole = 'rehearsal_reminder'"
      );
      if (rehTemplate) app.delete(rehTemplate);
    } catch (e) {}

    try {
      const templates = app.findCollectionByNameOrId('pbc_templates_001');
      const systemRoleField = templates.fields.getByName('systemRole');
      if (systemRoleField) {
        templates.fields.removeById(systemRoleField.id);
        app.save(templates);
      }
    } catch (e) {}

    try {
      const events = app.findCollectionByNameOrId('pbc_1687431684');
      let changed = false;

      const enableAutomatedReminder = events.fields.getByName('enableAutomatedReminder');
      if (enableAutomatedReminder) {
        events.fields.removeById(enableAutomatedReminder.id);
        changed = true;
      }

      const reminderLeadTimeHours = events.fields.getByName('reminderLeadTimeHours');
      if (reminderLeadTimeHours) {
        events.fields.removeById(reminderLeadTimeHours.id);
        changed = true;
      }

      const reminderSentAt = events.fields.getByName('reminderSentAt');
      if (reminderSentAt) {
        events.fields.removeById(reminderSentAt.id);
        changed = true;
      }

      if (changed) {
        app.save(events);
      }
    } catch (e) {}
  }
);
