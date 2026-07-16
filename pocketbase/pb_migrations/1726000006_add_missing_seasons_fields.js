/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_seasons_001000');

    // Ensure all fields are explicitly added to the seasons collection if missing
    const addIfMissing = (field) => {
      const existing = collection.fields.getByName(field.name);
      if (!existing || !existing.name) {
        collection.fields.add(field);
      }
    };

    addIfMissing(new TextField({ name: 'name', required: true }));
    addIfMissing(new DateField({ name: 'startDate' }));
    addIfMissing(new DateField({ name: 'endDate' }));
    addIfMissing(new NumberField({ name: 'duesAmountCents' }));
    addIfMissing(new BoolField({ name: 'isActive' }));
    addIfMissing(new AutodateField({ name: 'created', onCreate: true, onUpdate: false }));
    addIfMissing(new AutodateField({ name: 'updated', onCreate: true, onUpdate: true }));

    app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_seasons_001000');

    collection.fields.removeByName('name');
    collection.fields.removeByName('startDate');
    collection.fields.removeByName('endDate');
    collection.fields.removeByName('duesAmountCents');
    collection.fields.removeByName('isActive');
    collection.fields.removeByName('created');
    collection.fields.removeByName('updated');

    app.save(collection);
  }
);
