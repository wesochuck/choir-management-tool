/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  // 1. Modify events collection
  const eventsCollection = app.findCollectionByNameOrId("pbc_1687431684");
  
  const fieldsToAdd = [
    new BoolField({ name: "isTicketingEnabled", required: false }),
    new NumberField({ name: "advancePriceCents", required: false }),
    new NumberField({ name: "dayOfPriceCents", required: false }),
    new NumberField({ name: "ticketCapacity", required: false }),
    new TextField({ name: "doorsOpenTime", required: false }),
    new TextField({ name: "publicDetails", required: false }),
    new FileField({
      name: "eventGraphic",
      required: false,
      maxSelect: 1,
      maxSize: 5242880,
      mimeTypes: ["image/jpeg", "image/png", "image/webp"]
    })
  ];

  fieldsToAdd.forEach(field => {
    if (!eventsCollection.fields.getByName(field.name)) {
      eventsCollection.fields.push(field);
    }
  });
  app.save(eventsCollection);

  // 2. Create ticketPurchases collection
  const ticketPurchasesCollection = new Collection({
    id: "pbc_ticketPurchases_001",
    name: "ticketPurchases",
    type: "base",
    system: false,
    indexes: [
      "CREATE UNIQUE INDEX `idx_ticketPurchases_stripeSessionId` ON `ticketPurchases` (`stripeSessionId`)"
    ],
    listRule: "", // Public list rule to poll by session ID
    viewRule: "",
    createRule: null, // Api-locked
    updateRule: "@request.auth.role = 'admin'",
    deleteRule: "@request.auth.role = 'admin'"
  });

  ticketPurchasesCollection.fields.add(
    new RelationField({
      name: "event",
      required: true,
      collectionId: "pbc_1687431684", // events
      cascadeDelete: true,
      minSelect: 0,
      maxSelect: 1
    }),
    new TextField({ name: "buyerName", required: true }),
    new TextField({ name: "buyerEmail", required: true }),
    new NumberField({ name: "quantity", required: true }),
    new NumberField({ name: "unitPriceCents", required: true }),
    new NumberField({ name: "feeCents", required: true }),
    new NumberField({ name: "amountPaidCents", required: true }),
    new TextField({ name: "currency", required: true }),
    new TextField({ name: "stripeSessionId", required: true }),
    new TextField({ name: "stripePaymentIntentId", required: false }),
    new TextField({ name: "stripeCustomerId", required: false }),
    new SelectField({
      name: "status",
      required: true,
      values: ["paid", "refunded", "pending"],
      maxSelect: 1
    }),
    new BoolField({ name: "marketingOptIn", required: false }),
    new DateField({ name: "fulfilledAt", required: false }),
    new AutodateField({ name: "created", onCreate: true, onUpdate: false }),
    new AutodateField({ name: "updated", onCreate: true, onUpdate: true })
  );
  
  app.save(ticketPurchasesCollection);

  // 3. Create Ticket Confirmation Message Template
  const templatesCollection = app.findCollectionByNameOrId("pbc_templates_001");
  const templateObj = new Record(templatesCollection, {
    title: "Ticket Confirmation",
    subject: "Your tickets for {eventTitle}",
    content: "Hi {buyerName},\n\nThank you for your purchase! Your tickets will be at Will Call under your name.\n\nEvent: {eventTitle}\nDate: {eventDate}\nDoors Open: {doorsOpenTime}\nQuantity: {quantity}\nAmount Paid: ${amountPaid}\n\nWe look forward to seeing you!\n{choirName}",
    type: "Email",
    isSystemTemplate: true
  });
  app.save(templateObj);
}, (app) => {
  // Rollback logic
  try {
    const template = app.findFirstRecordByFilter("pbc_templates_001", "title = 'Ticket Confirmation'");
    app.delete(template);
  } catch (e) {}

  try {
    const ticketPurchases = app.findCollectionByNameOrId("pbc_ticketPurchases_001");
    app.delete(ticketPurchases);
  } catch (e) {}

  const eventsCollection = app.findCollectionByNameOrId("pbc_1687431684");
  const fieldNames = ["isTicketingEnabled", "advancePriceCents", "dayOfPriceCents", "ticketCapacity", "doorsOpenTime", "publicDetails", "eventGraphic"];
  fieldNames.forEach(name => {
    const idx = eventsCollection.fields.findIndex(f => f.name === name);
    if (idx !== -1) {
      eventsCollection.fields.splice(idx, 1);
    }
  });
  app.save(eventsCollection);
});
