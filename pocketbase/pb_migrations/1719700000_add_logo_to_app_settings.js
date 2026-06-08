/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_settings_001");

  if (!collection.fields.getByName("logo")) {
    collection.fields.push(new FileField({
      name: "logo",
      required: false,
      maxSelect: 1,
      maxSize: 5242880,
      mimeTypes: ["image/png", "image/jpeg", "image/svg+xml", "image/webp"]
    }));
  }

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_settings_001");
  const idx = collection.fields.findIndex(f => f.name === "logo");
  if (idx !== -1) {
    collection.fields.splice(idx, 1);
  }
  app.save(collection);
});
