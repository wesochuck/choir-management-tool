/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // Add 'expired' to ticketPurchases.status enum
    const ticketPurchases = app.findCollectionByNameOrId('pbc_ticketPurchases_001');
    if (ticketPurchases) {
      const statusField = ticketPurchases.fields.getByName('status');
      if (statusField) {
        const values = statusField.options?.values ?? statusField.values;
        if (Array.isArray(values) && !values.includes('expired')) {
          if (statusField.options) {
            statusField.options.values.push('expired');
          } else {
            values.push('expired');
          }
        }
      }
      ticketPurchases.fields.add(new DateField({ name: 'expiredAt', required: false }));
      app.save(ticketPurchases);
    }

    // Add 'expired' to donations.status enum
    const donations = app.findCollectionByNameOrId('pbc_donations_001');
    if (donations) {
      const statusField = donations.fields.getByName('status');
      if (statusField) {
        const values = statusField.options?.values ?? statusField.values;
        if (Array.isArray(values) && !values.includes('expired')) {
          if (statusField.options) {
            statusField.options.values.push('expired');
          } else {
            values.push('expired');
          }
        }
      }
      donations.fields.add(new DateField({ name: 'expiredAt', required: false }));
      app.save(donations);
    }
  },
  (app) => {
    // Down migration: remove 'expired' from both enums and drop expiredAt.
    // CAVEAT: this will FAIL if any existing row has status = 'expired'
    // because PocketBase will reject the truncated enum. Clear or
    // status='paid' such rows before running the down migration.
    const removeExpired = (collection) => {
      if (!collection) return;
      const statusField = collection.fields.getByName('status');
      if (statusField) {
        const values = statusField.options?.values ?? statusField.values;
        if (Array.isArray(values)) {
          const filtered = values.filter((v) => v !== 'expired');
          if (statusField.options) {
            statusField.options.values = filtered;
          } else {
            statusField.values = filtered;
          }
        }
      }
      const expiredAt = collection.fields.getByName('expiredAt');
      if (expiredAt) {
        collection.fields.removeById(expiredAt.id);
      }
      app.save(collection);
    };

    removeExpired(app.findCollectionByNameOrId('pbc_ticketPurchases_001'));
    removeExpired(app.findCollectionByNameOrId('pbc_donations_001'));
  }
);
