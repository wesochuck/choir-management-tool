/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Modify events collection
    const eventsCollection = app.findCollectionByNameOrId('pbc_1687431684');

    const fieldsToAdd = [
      new BoolField({ name: 'isFreeRSVP', required: false }),
      new NumberField({ name: 'maxPerRSVP', required: false }),
    ];

    fieldsToAdd.forEach((field) => {
      if (!eventsCollection.fields.getByName(field.name)) {
        eventsCollection.fields.push(field);
      }
    });
    app.save(eventsCollection);

    // 2. Create RSVP Confirmation Message Template
    const templatesCollection = app.findCollectionByNameOrId('pbc_templates_001');
    const templateObj = new Record(templatesCollection, {
      title: 'RSVP Confirmation',
      subject: 'Your RSVP for {eventTitle}',
      content:
        'Hi {buyerName},\n\nThank you for your RSVP! Your spot is confirmed and your tickets will be held under your name.\n\nEvent: {eventTitle}\nDate: {eventDate}\nDoors Open: {doorsOpenTime}\nParty Size: {quantity}\n\nWe look forward to seeing you!\n{choirName}',
      type: 'Email',
      isSystemTemplate: true,
    });
    app.save(templateObj);
  },
  (app) => {
    // Rollback logic
    try {
      const template = app.findFirstRecordByFilter(
        'pbc_templates_001',
        "title = 'RSVP Confirmation'"
      );
      app.delete(template);
    } catch (e) {}

    try {
      const eventsCollection = app.findCollectionByNameOrId('pbc_1687431684');
      eventsCollection.fields.removeByName('isFreeRSVP');
      eventsCollection.fields.removeByName('maxPerRSVP');
      app.save(eventsCollection);
    } catch (e) {}
  }
);
