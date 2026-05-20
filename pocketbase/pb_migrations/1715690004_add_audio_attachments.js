/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_music_library_001");
  
  // Relax read permissions: allow any authenticated user to view the music library
  collection.listRule = "@request.auth.id != \"\"";
  collection.viewRule = "@request.auth.id != \"\"";

  // Create and add the dynamic multi-file field
  collection.fields.push(new FileField({
    name: "audioFiles",
    id: "file3101992200",
    hidden: false,
    presentable: false,
    required: false,
    system: false,
    maxSelect: 20,
    maxSize: 20971520, // 20MB limit
    mimeTypes: [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/x-m4a",
      "audio/m4a"
    ]
  }));

  // Create and add the track mapping JSON field
  collection.fields.push(new JSONField({
    name: "audioTrackMapping",
    id: "json3101992201",
    hidden: false,
    presentable: false,
    required: false,
    system: false
  }));

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_music_library_001");
  
  // Revert permissions to admin-only
  collection.listRule = "@request.auth.role = \"admin\"";
  collection.viewRule = "@request.auth.role = \"admin\"";

  // Remove the newly created fields
  const fieldsToRemove = ["audioFiles", "audioTrackMapping"];
  fieldsToRemove.forEach(fieldName => {
    const index = collection.fields.findIndex(f => f.name === fieldName);
    if (index !== -1) {
      collection.fields.splice(index, 1);
    }
  });

  app.save(collection);
});
