/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3414089001");

  const existingIndex = collection.fields.findIndex((field) => field.name === "photo");
  if (existingIndex === -1) {
    collection.fields.push(new FileField({
      name: "photo",
      id: "file2043706811",
      hidden: false,
      presentable: false,
      required: false,
      system: false,
      maxSelect: 1,
      maxSize: 5242880,
      mimeTypes: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif"
      ]
    }));

    app.save(collection);
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3414089001");
  const index = collection.fields.findIndex((field) => field.name === "photo");

  if (index !== -1) {
    collection.fields.splice(index, 1);
    app.save(collection);
  }
});
