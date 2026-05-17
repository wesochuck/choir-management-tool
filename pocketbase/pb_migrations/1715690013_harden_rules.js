migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  users.updateRule = [
    '@request.auth.role = "admin"',
    '||',
    '(',
    'id = @request.auth.id',
    '&& @request.body.role:isset = false',
    '&& @request.body.verified:isset = false',
    ')'
  ].join(' ');
  app.save(users);

  const profiles = app.findCollectionByNameOrId("profiles");
  profiles.updateRule = [
    '@request.auth.role = "admin"',
    '||',
    '(',
    'user = @request.auth.id',
    '&& @request.body.globalStatus:isset = false',
    '&& @request.body.voicePart:isset = false',
    '&& @request.body.notes:isset = false',
    ')'
  ].join(' ');
  app.save(profiles);

  const eventRosters = app.findCollectionByNameOrId("eventRosters");
  eventRosters.createRule = '@request.auth.role = "admin" || (profile.user = @request.auth.id && @request.body.attendance:isset = false && @request.body.folderNumber:isset = false && @request.body.folderReturned:isset = false)';
  eventRosters.updateRule = '@request.auth.role = "admin" || (profile.user = @request.auth.id && @request.body.attendance:isset = false && @request.body.folderNumber:isset = false && @request.body.folderReturned:isset = false)';
  app.save(eventRosters);

  const venues = app.findCollectionByNameOrId("pbc_venues_001") || app.findCollectionByNameOrId("venues");
  if (venues) {
      venues.createRule = '@request.auth.role = "admin"';
      venues.updateRule = '@request.auth.role = "admin"';
      venues.deleteRule = '@request.auth.role = "admin"';
      app.save(venues);
  }

  const seating = app.findCollectionByNameOrId("pbc_seating_001") || app.findCollectionByNameOrId("seatingCharts");
  if (seating) {
      seating.createRule = '@request.auth.role = "admin"';
      seating.updateRule = '@request.auth.role = "admin"';
      seating.deleteRule = '@request.auth.role = "admin"';
      app.save(seating);
  }

}, (app) => {
  return null;
});
