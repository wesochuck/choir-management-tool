/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_donations_001');
    const existingField = collection.fields.getByName('marketingOptIn');
    if (!existingField) {
      collection.fields.add(
        new BoolField({
          name: 'marketingOptIn',
          required: false,
          defaultValue: false,
        })
      );
      app.save(collection);
    }
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_donations_001');
    const field = collection.fields.getByName('marketingOptIn');
    if (field) {
      collection.fields.removeByName('marketingOptIn');
      app.save(collection);
    }
  }
);
