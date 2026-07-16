/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const collection = new Collection({
      id: 'pbc_seasons_001000',
      name: 'seasons',
      type: 'base',
      system: false,
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      updateRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
      fields: [
        new TextField({
          name: 'name',
          required: true,
        }),
        new DateField({
          name: 'startDate',
        }),
        new DateField({
          name: 'endDate',
        }),
        new NumberField({
          name: 'duesAmountCents',
        }),
        new BoolField({
          name: 'isActive',
        }),
        new AutodateField({
          name: 'created',
          onCreate: true,
          onUpdate: false,
        }),
        new AutodateField({
          name: 'updated',
          onCreate: true,
          onUpdate: true,
        }),
      ],
    });

    app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pbc_seasons_001000');
    app.delete(collection);
  }
);
