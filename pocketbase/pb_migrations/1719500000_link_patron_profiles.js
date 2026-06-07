/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const ticketPurchases = app.findCollectionByNameOrId("pbc_ticketPurchases_001");
  const donations = app.findCollectionByNameOrId("pbc_donations_001");
  const profiles = app.findCollectionByNameOrId("pbc_3414089001"); // profiles

  // 1. Add profile relation to ticketPurchases
  ticketPurchases.fields.add(new RelationField({
    name: "profile",
    collectionId: profiles.id,
    maxSelect: 1,
  }));
  app.save(ticketPurchases);

  // 2. Add profile relation to donations
  donations.fields.add(new RelationField({
    name: "profile",
    collectionId: profiles.id,
    maxSelect: 1,
  }));
  app.save(donations);

  // 3. Backfill profiles
  const emails = new Set();
  
  // Collect unique emails and names
  app.db().newQuery("SELECT buyerEmail as email, buyerName as name FROM ticketPurchases").all().forEach(r => emails.add(JSON.stringify({email: r.email, name: r.name})));
  app.db().newQuery("SELECT donorEmail as email, donorName as name FROM donations").all().forEach(r => emails.add(JSON.stringify({email: r.email, name: r.name})));

  emails.forEach(json => {
    const data = JSON.parse(json);
    let profile;
    try {
      // Find profile by email (via linked user)
      profile = app.findFirstRecordByFilter("profiles", "user.email = {:email}", { email: data.email });
    } catch (e) {
       // Search by name if email relation check is complex or fails
       try {
         profile = app.findFirstRecordByFilter("profiles", "name = {:name}", { name: data.name });
       } catch (e2) {
         // Create new patron profile
         profile = new Record(profiles, {
           name: data.name,
           globalStatus: 'Active'
         });
         app.save(profile);
       }
    }

    // Link transactions to the identified profile
    app.db().newQuery("UPDATE ticketPurchases SET profile = {:pid} WHERE buyerEmail = {:email}").bind({ pid: profile.id, email: data.email }).execute();
    app.db().newQuery("UPDATE donations SET profile = {:pid} WHERE donorEmail = {:email}").bind({ pid: profile.id, email: data.email }).execute();
  });
}, (app) => {
  // Rollback fields
  const ticketPurchases = app.findCollectionByNameOrId("pbc_ticketPurchases_001");
  const donations = app.findCollectionByNameOrId("pbc_donations_001");
  
  ticketPurchases.fields.removeByName("profile");
  app.save(ticketPurchases);
  
  donations.fields.removeByName("profile");
  app.save(donations);
});
