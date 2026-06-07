/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const ticketPurchases = app.findCollectionByNameOrId("pbc_ticketPurchases_001");
  const donations = app.findCollectionByNameOrId("pbc_donations_001");
  const profiles = app.findCollectionByNameOrId("pbc_3414089001"); // profiles

  // 1. Add profile relation to ticketPurchases if not exists
  if (!ticketPurchases.fields.getByName("profile")) {
    ticketPurchases.fields.add(new RelationField({
      name: "profile",
      collectionId: profiles.id,
      maxSelect: 1,
    }));
    app.save(ticketPurchases);
  }

  // 2. Add profile relation to donations if not exists
  if (!donations.fields.getByName("profile")) {
    donations.fields.add(new RelationField({
      name: "profile",
      collectionId: profiles.id,
      maxSelect: 1,
    }));
    app.save(donations);
  }

  // 3. Backfill profiles
  const processedEmails = new Set();
  
  const backfill = (collectionName, emailField, nameField) => {
    const records = app.findRecordsByFilter(collectionName, emailField + " != ''", "-created", 10000, 0);
    records.forEach(record => {
      const email = record.get(emailField);
      const name = record.get(nameField);
      
      if (!email || processedEmails.has(email)) return;
      processedEmails.add(email);

      let profile;
      try {
        // Find profile by email (via linked user relation)
        profile = app.findFirstRecordByFilter("profiles", "user.email = {:email}", { email: email });
      } catch (e) {
        try {
          profile = app.findFirstRecordByFilter("profiles", "name = {:name}", { name: name });
        } catch (e2) {
          // Create new patron profile
          profile = new Record(profiles);
          profile.set("name", name);
          profile.set("globalStatus", "Active");
          profile.set("voicePart", "");
          app.save(profile);
        }
      }

      if (profile) {
         // Update current record and all others with same email in this collection
         app.db().newQuery("UPDATE " + collectionName + " SET profile = {:pid} WHERE " + emailField + " = {:email}")
           .bind({ pid: profile.id, email: email })
           .execute();
      }
    });
  };

  backfill("ticketPurchases", "buyerEmail", "buyerName");
  backfill("donations", "donorEmail", "donorName");

}, (app) => {
  // Rollback fields
  try {
    const ticketPurchases = app.findCollectionByNameOrId("pbc_ticketPurchases_001");
    const f1 = ticketPurchases.fields.getByName("profile");
    if (f1) {
      ticketPurchases.fields.removeById(f1.id);
      app.save(ticketPurchases);
    }
  } catch (e) {}

  try {
    const donations = app.findCollectionByNameOrId("pbc_donations_001");
    const f2 = donations.fields.getByName("profile");
    if (f2) {
      donations.fields.removeById(f2.id);
      app.save(donations);
    }
  } catch (e) {}
});
