/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  // 1. Create ticketBundles collection
  const ticketBundlesCollection = new Collection({
    id: "pbc_ticketBundles_001",
    name: "ticketBundles",
    type: "base",
    system: false,
    indexes: [],
    listRule: "", // Public list rule
    viewRule: "", // Public view rule
    createRule: null, // Api-locked
    updateRule: "@request.auth.role = 'admin'",
    deleteRule: "@request.auth.role = 'admin'"
  });

  ticketBundlesCollection.fields.add(
    new TextField({ name: "title", required: true }),
    new NumberField({ name: "priceCents", required: true }),
    new NumberField({ name: "capacity", required: true }),
    new RelationField({
      name: "events",
      required: true,
      collectionId: "pbc_1687431684", // events
      cascadeDelete: false,
      minSelect: 1,
      maxSelect: 999
    }),
    new DateField({ name: "saleEndDate", required: true }),
    new BoolField({ name: "isActive", required: false }),
    new AutodateField({ name: "created", onCreate: true, onUpdate: false }),
    new AutodateField({ name: "updated", onCreate: true, onUpdate: true })
  );

  app.save(ticketBundlesCollection);

  // 2. Add bundle relation to ticketPurchases collection
  const ticketPurchasesCollection = app.findCollectionByNameOrId("pbc_ticketPurchases_001");
  ticketPurchasesCollection.fields.add(
    new RelationField({
      name: "bundle",
      required: false,
      collectionId: "pbc_ticketBundles_001",
      cascadeDelete: false,
      minSelect: 0,
      maxSelect: 1
    })
  );
  app.save(ticketPurchasesCollection);

  // 3. Create Bundle Ticket Confirmation Message Template
  const templatesCollection = app.findCollectionByNameOrId("pbc_templates_001");
  const templateObj = new Record(templatesCollection, {
    title: "Bundle Ticket Confirmation",
    subject: "Your Season Tickets - {bundleTitle}",
    content: "Hi {buyerName},\n\nThank you for your purchase! Your season tickets will be at Will Call under your name.\n\nBundle: {bundleTitle}\nQuantity: {quantity}\nAmount Paid: ${amountPaid}\n\nIncluded Performances:\n{eventDetails}\n\nWe look forward to seeing you!\n{choirName}",
    type: "Email",
    isSystemTemplate: true
  });
  app.save(templateObj);
}, (app) => {
  // rollback
  try {
    const template = app.findFirstRecordByFilter("pbc_templates_001", "title = 'Bundle Ticket Confirmation'");
    app.delete(template);
  } catch (e) {}

  try {
    const ticketPurchasesCollection = app.findCollectionByNameOrId("pbc_ticketPurchases_001");
    const idx = ticketPurchasesCollection.fields.findIndex(f => f.name === "bundle");
    if (idx !== -1) {
      ticketPurchasesCollection.fields.splice(idx, 1);
      app.save(ticketPurchasesCollection);
    }
  } catch (e) {}

  try {
    const ticketBundlesCollection = app.findCollectionByNameOrId("pbc_ticketBundles_001");
    app.delete(ticketBundlesCollection);
  } catch (e) {}
});
