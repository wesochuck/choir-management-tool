/// <reference path="../pb_data/types.d.ts" />

// Normalize legacy profile statuses that are no longer valid select options.
// Invalid existing profile values can otherwise make unrelated automated saves fail.

migrate((app) => {
  while (true) {
    const legacyProfiles = app.findRecordsByFilter(
      "profiles",
      "globalStatus = 'Active' || globalStatus = 'Auditionee' || globalStatus = ''",
      "",
      500,
      0
    );

    if (!legacyProfiles || legacyProfiles.length === 0) {
      break;
    }

    legacyProfiles.forEach((profile) => {
      profile.set("globalStatus", "Active (Current)");
      app.saveNoValidate(profile);
    });
  }
}, (app) => {
  // One-way data repair. The previous invalid values cannot be reconstructed safely.
});
