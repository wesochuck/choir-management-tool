/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_seasonalDues_001');

    // Ensure paid field is explicitly added to seasonalDues collection if missing
    const existing = collection.fields.getByName('paid');
    if (!existing || !existing.name) {
      collection.fields.add(
        new BoolField({
          name: 'paid',
          required: false,
        })
      );
    }

    app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_seasonalDues_001');
    collection.fields.removeByName('paid');
    app.save(collection);
  }
);
