/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  // 1. Create donations collection
  const donations = new Collection({
    id: "pbc_donations_001",
    name: "donations",
    type: "base",
    system: false,
    indexes: [
      "CREATE UNIQUE INDEX `idx_donations_stripeSessionId` ON `donations` (`stripeSessionId`)"
    ],
    listRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
    viewRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
    createRule: null, 
    updateRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
    deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'"
  });

  donations.fields.add(
    new NumberField({ name: "amountPaidCents", required: true }),
    new TextField({ name: "donorName", required: true }),
    new TextField({ name: "donorEmail", required: true }),
    new SelectField({ 
      name: "tributeType", 
      values: ["none", "memory", "honor"],
      maxSelect: 1
    }),
    new TextField({ name: "tributeName" }),
    new BoolField({ name: "isAnonymous", defaultValue: false }),
    new SelectField({ 
      name: "status", 
      values: ["paid", "pending", "refunded"],
      maxSelect: 1
    }),
    new TextField({ name: "stripeSessionId" }),
    new TextField({ name: "stripePaymentIntentId" }),
    new AutodateField({ name: "created", onCreate: true, onUpdate: false }),
    new AutodateField({ name: "updated", onCreate: true, onUpdate: true })
  );

  app.save(donations);

  // 2. Create Donation Receipt template
  const templates = app.findCollectionByNameOrId("pbc_templates_001");
  const template = new Record(templates, {
    title: "Donation Receipt",
    subject: "Thank you for your donation to {choirName}!",
    content: "Dear {donorName},\n\nThank you so much for your generous donation of ${amountPaid} to {choirName}.\n\n{tributeSection}\n\nYour support helps us continue to share music with our community.\n\nWarmly,\n{choirName}",
    type: "Email",
    isSystemTemplate: true
  });
  app.save(template);

  // 3. Initialize donation settings
  const settings = app.findCollectionByNameOrId("pbc_settings_001");
  const donationSettings = new Record(settings, {
    key: "donation_settings",
    isPublic: true,

    value: {
      levels: [
        { id: "level-1", label: "Friend", amount: 25, benefit: "Mention in program" },
        { id: "level-2", label: "Supporter", amount: 50, benefit: "Mention in program" },
        { id: "level-3", label: "Patron", amount: 100, benefit: "Priority seating" },
        { id: "level-4", label: "Benefactor", amount: 250, benefit: "Invitation to VIP reception" }
      ]
    }
  });
  app.save(donationSettings);
}, (app) => {
  // Down migration
  try {
    const donations = app.findCollectionByNameOrId("pbc_donations_001");
    app.delete(donations);
  } catch (e) {}
  
  try {
    const template = app.findFirstRecordByFilter("pbc_templates_001", "title = 'Donation Receipt'");
    app.delete(template);
  } catch (e) {}

  try {
    const setting = app.findFirstRecordByFilter("appSettings", "key = 'donation_settings'");
    app.delete(setting);
  } catch (e) {}
});
