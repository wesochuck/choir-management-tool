/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const music = app.findCollectionByNameOrId("pbc_music_library_001");
  const events = app.findCollectionByNameOrId("pbc_1687431684");

  // Allow unauthenticated viewing of specific records if the ID is known.
  // The playlist hook will provide the IDs.
  music.viewRule = ""; 
  events.viewRule = "";

  app.save(music);
  app.save(events);
}, (app) => {
  const music = app.findCollectionByNameOrId("pbc_music_library_001");
  const events = app.findCollectionByNameOrId("pbc_1687431684");
  
  music.viewRule = "@request.auth.role = \"admin\"";
  events.viewRule = ""; // Fallback to initial state
  
  app.save(music);
  app.save(events);
})
