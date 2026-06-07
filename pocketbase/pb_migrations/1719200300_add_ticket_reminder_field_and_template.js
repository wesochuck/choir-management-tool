/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  // 1. Add reminderSent field to ticketPurchases (pbc_ticketPurchases_001)
  const ticketPurchases = app.findCollectionByNameOrId("pbc_ticketPurchases_001");
  
  if (!ticketPurchases.fields.getByName("reminderSent")) {
    ticketPurchases.fields.add(new BoolField({
      name: "reminderSent",
      required: false
    }));
    app.save(ticketPurchases);
  }

  // 2. Create "Ticket Concert Reminder" system template in messageTemplates (pbc_templates_001)
  const templates = app.findCollectionByNameOrId("pbc_templates_001");
  
  const template = new Record(templates, {
    title: "Ticket Concert Reminder",
    subject: "Reminder: {eventTitle} is tomorrow!",
    content: "Hi {buyerName},\n\nThis is a friendly reminder that you have tickets for {eventTitle} tomorrow!\n\nEvent: {eventTitle}\nDate: {eventDate}\nDoors Open: {doorsOpenTime}\nQuantity: {quantity}\n\nYour tickets will be available at Will Call under your name ({buyerName}).\n\nWe look forward to seeing you!\n\n{choirName}",
    type: "Email",
    isSystemTemplate: true
  });
  
  app.save(template);
}, (app) => {
  // Rollback logic
  try {
    const template = app.findFirstRecordByFilter("pbc_templates_001", "title = 'Ticket Concert Reminder'");
    if (template) {
      app.delete(template);
    }
  } catch (e) {}

  try {
    const ticketPurchases = app.findCollectionByNameOrId("pbc_ticketPurchases_001");
    const field = ticketPurchases.fields.getByName("reminderSent");
    if (field) {
      ticketPurchases.fields.removeById(field.id);
      app.save(ticketPurchases);
    }
  } catch (e) {}
});
