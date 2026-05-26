/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  // 1. Update profiles collection globalStatus select options
  const profilesCollection = app.findCollectionByNameOrId("profiles");
  const statusField = profilesCollection.fields.getByName("globalStatus");
  if (statusField) {
    statusField.values = ["Active", "Idle", "Inactive"];
    app.save(profilesCollection);
  }

  // Backfill profiles records
  // Active (Current) -> Active
  // Active (Future) -> Idle
  // Inactive -> Inactive
  try {
    const activeCurrentProfiles = app.findRecordsByFilter("profiles", "globalStatus = 'Active (Current)'", "", 10000, 0);
    activeCurrentProfiles.forEach((profile) => {
      profile.set("globalStatus", "Active");
      app.saveNoValidate(profile);
    });
  } catch (e) {
    console.log("Failed to backfill Active (Current) profiles:", e);
  }

  try {
    const activeFutureProfiles = app.findRecordsByFilter("profiles", "globalStatus = 'Active (Future)'", "", 10000, 0);
    activeFutureProfiles.forEach((profile) => {
      profile.set("globalStatus", "Idle");
      app.saveNoValidate(profile);
    });
  } catch (e) {
    console.log("Failed to backfill Active (Future) profiles:", e);
  }

  // 2. Add status select field to venues collection
  const venuesCollection = app.findCollectionByNameOrId("venues");
  const existingVenueStatus = venuesCollection.fields.getByName("status");
  if (!existingVenueStatus) {
    venuesCollection.fields.push(new SelectField({
      name: "status",
      required: true,
      presentable: false,
      values: ["Active", "Inactive"],
      maxSelect: 1
    }));
    app.save(venuesCollection);
  }

  // Backfill existing venues to Active
  try {
    const venues = app.findRecordsByFilter("venues", "status = '' || status = null", "", 1000, 0);
    venues.forEach((venue) => {
      venue.set("status", "Active");
      app.saveNoValidate(venue);
    });
  } catch (e) {
    console.log("Failed to backfill venue status:", e);
  }

  // 3. Add recipientIds JSON field to messages collection
  const messagesCollection = app.findCollectionByNameOrId("messages");
  const existingRecipientIds = messagesCollection.fields.getByName("recipientIds");
  if (!existingRecipientIds) {
    messagesCollection.fields.push(new JSONField({
      name: "recipientIds",
      required: false,
      presentable: false
    }));
    app.save(messagesCollection);
  }

  // Backfill message recipientIds
  try {
    const messages = app.findRecordsByFilter("messages", "recipientIds = null || recipientIds = '' || recipientIds = '[]'", "", 10000, 0);
    messages.forEach((message) => {
      const rawRecipients = message.get("recipients");
      let recipientsList = [];
      if (rawRecipients) {
        try {
          let str = "";
          if (Array.isArray(rawRecipients)) {
            // Decodes raw uint8 byte array if represented as such in Goja
            str = rawRecipients.map(b => String.fromCharCode(Number(b))).join('');
          } else if (typeof rawRecipients === 'string') {
            str = rawRecipients;
          } else {
            str = JSON.stringify(rawRecipients);
          }
          recipientsList = JSON.parse(str);
        } catch (err) {
          console.log("Failed to parse recipients for backfill:", err);
        }
      }

      const ids = [];
      if (Array.isArray(recipientsList)) {
        recipientsList.forEach((recipient) => {
          if (recipient && recipient.id) {
            ids.push(recipient.id);
          }
        });
      }
      message.set("recipientIds", ids);
      app.saveNoValidate(message);
    });
  } catch (e) {
    console.log("Failed to backfill message recipientIds:", e);
  }

}, (app) => {
  // Down migration
  // 1. Restore globalStatus select options and backfill records
  try {
    const profilesCollection = app.findCollectionByNameOrId("profiles");
    const statusField = profilesCollection.fields.getByName("globalStatus");
    if (statusField) {
      statusField.values = ["Active (Current)", "Active (Future)", "Inactive"];
      app.save(profilesCollection);
    }
  } catch (e) {}

  try {
    const activeProfiles = app.findRecordsByFilter("profiles", "globalStatus = 'Active'", "", 10000, 0);
    activeProfiles.forEach((profile) => {
      profile.set("globalStatus", "Active (Current)");
      app.saveNoValidate(profile);
    });
  } catch (e) {}

  try {
    const idleProfiles = app.findRecordsByFilter("profiles", "globalStatus = 'Idle'", "", 10000, 0);
    idleProfiles.forEach((profile) => {
      profile.set("globalStatus", "Active (Future)");
      app.saveNoValidate(profile);
    });
  } catch (e) {}

  // 2. Remove status select field from venues collection
  try {
    const venuesCollection = app.findCollectionByNameOrId("venues");
    const statusField = venuesCollection.fields.getByName("status");
    if (statusField) {
      venuesCollection.fields.removeById(statusField.id);
      app.save(venuesCollection);
    }
  } catch (e) {}

  // 3. Remove recipientIds JSON field from messages collection
  try {
    const messagesCollection = app.findCollectionByNameOrId("messages");
    const recipientIdsField = messagesCollection.fields.getByName("recipientIds");
    if (recipientIdsField) {
      messagesCollection.fields.removeById(recipientIdsField.id);
      app.save(messagesCollection);
    }
  } catch (e) {}
});
