/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('musicLibrary');
    const field = collection.fields.find((f) => f.name === 'performances');
    if (field) {
      collection.fields.remove(field);
      app.save(collection);
    }
  },
  (app) => {
    // Revert: add the field back
    const collection = app.findCollectionByNameOrId('musicLibrary');
    collection.fields.add(
      new RelationField({
        name: 'performances',
        collectionId: 'pbc_1687431684',
        maxSelect: 999,
        minSelect: 0,
        required: false,
        cascadeDelete: false,
      })
    );
    app.save(collection);
  }
);
