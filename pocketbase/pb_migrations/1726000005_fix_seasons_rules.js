/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_seasons_001000');

    collection.listRule = "@request.auth.id != ''";
    collection.viewRule = "@request.auth.id != ''";
    collection.createRule = "@request.auth.id != '' && @request.auth.role = 'admin'";
    collection.updateRule = "@request.auth.id != '' && @request.auth.role = 'admin'";
    collection.deleteRule = "@request.auth.id != '' && @request.auth.role = 'admin'";

    // Ensure all fields are explicitly added to the seasons collection if missing
    const addIfMissing = (field) => {
      if (!collection.fields.getByName(field.name)) {
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

    collection.listRule = null;
    collection.viewRule = null;
    collection.createRule = null;
    collection.updateRule = null;
    collection.deleteRule = null;

    app.save(collection);
  }
);
