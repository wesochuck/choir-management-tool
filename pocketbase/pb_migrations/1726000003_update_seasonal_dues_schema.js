/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_seasonalDues_001');

    // Wipe existing records because the "season" field is changing type from Text to Relation
    const records = app.findAllRecords(collection);
    for (let record of records) {
      app.delete(record);
    }

    // Ensure profile is a properly registered RelationField pointing to profiles (pbc_3414089001)
    collection.fields.removeByName('profile');
    collection.fields.add(
      new RelationField({
        name: 'profile',
        required: true,
        presentable: false,
        collectionId: 'pbc_3414089001',
        cascadeDelete: true,
        minSelect: 0,
        maxSelect: 1,
      })
    );

    // Remove the old season text field
    collection.fields.removeByName('season');

    // Add the new season relation field and Stripe tracking fields
    collection.fields.add(
      new RelationField({
        name: 'season',
        required: true,
        presentable: false,
        collectionId: 'pbc_seasons_001000',
        cascadeDelete: true,
        minSelect: 0,
        maxSelect: 1,
      })
    );

    collection.fields.add(
      new TextField({
        name: 'stripeSessionId',
        required: false,
      })
    );

    collection.fields.add(
      new NumberField({
        name: 'amountPaidCents',
        required: false,
      })
    );

    collection.fields.add(
      new NumberField({
        name: 'feeCents',
        required: false,
      })
    );

    // Update API Rules for robust evaluation
    const readRule = "@request.auth.role = 'admin' || profile.user = @request.auth.id";
    const writeRule = "@request.auth.id != '' && @request.auth.role = 'admin'";
    collection.listRule = readRule;
    collection.viewRule = readRule;
    collection.createRule = writeRule;
    collection.updateRule = writeRule;
    collection.deleteRule = writeRule;

    app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_seasonalDues_001');

    const records = app.findAllRecords(collection);
    for (let record of records) {
      app.delete(record);
    }

    collection.fields.removeByName('season');
    collection.fields.removeByName('stripeSessionId');
    collection.fields.removeByName('amountPaidCents');
    collection.fields.removeByName('feeCents');

    collection.fields.add(
      new TextField({
        name: 'season',
        required: true,
      })
    );

    const oldRule = "@request.auth.role = 'admin'";
    collection.listRule = oldRule;
    collection.viewRule = oldRule;
    collection.createRule = oldRule;
    collection.updateRule = oldRule;
    collection.deleteRule = oldRule;

    app.save(collection);
  }
);
