migrate((app) => {
  const events = app.findCollectionByNameOrId("pbc_1687431684");

  // Remove the location text field
  const locationField = events.fields.getByName("location");
  if (locationField) {
    events.fields.removeByName("location");
  }

  // Update venue field to be required
  const venueField = events.fields.getByName("venue");
  if (venueField) {
    venueField.required = true;
  }

  app.save(events);
}, (app) => {
  const events = app.findCollectionByNameOrId("pbc_1687431684");

  // Restore the location field on rollback
  const locationField = events.fields.getByName("location");
  if (!locationField) {
    events.fields.add(new TextField({
      id: "text1587448267",
      name: "location",
      type: "text",
      required: true,
    }));
  }

  // Make the venue field optional on rollback
  const venueField = events.fields.getByName("venue");
  if (venueField) {
    venueField.required = false;
  }

  app.save(events);
});
