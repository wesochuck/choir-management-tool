/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const profiles = app.findCollectionByNameOrId('profiles');

    // 1. Add receiveFinancialAlerts boolean field to profiles
    const existingField = profiles.fields.getByName('receiveFinancialAlerts');
    if (!existingField) {
      profiles.fields.add(
        new BoolField({
          name: 'receiveFinancialAlerts',
          required: false,
          presentable: false,
          hidden: false,
          system: false,
          default: false,
        })
      );
      app.save(profiles);
    }

    // 2. Create messageTemplates
    const templates = app.findCollectionByNameOrId('messageTemplates');

    const seeds = [
      {
        title: 'Admin Notice: Ticket Sale',
        subject: 'Financial Notice: Ticket Sale - {buyerName}',
        content:
          'Hello {adminName},\n\nA ticket purchase has been made by {buyerName} ({buyerEmail}).\n\nDetails:\nEvent/Bundle: {targetName}\nQuantity: {quantity}\nAmount Paid: ${amountPaid}\n\nThank you,\n{choirName}',
        type: 'Email',
        isSystemTemplate: true,
      },
      {
        title: 'Admin Notice: Donation',
        subject: 'Financial Notice: Donation - {donorName}',
        content:
          'Hello {adminName},\n\nA donation of ${amountPaid} has been made by {donorName} ({donorEmail}).\n\n{tributeSection}\n\nThank you,\n{choirName}',
        type: 'Email',
        isSystemTemplate: true,
      },
      {
        title: 'Admin Notice: Refund',
        subject: 'Financial Notice: Refund - {buyerName}',
        content:
          'Hello {adminName},\n\nA refund has been processed for {buyerName} ({buyerEmail}).\n\nDetails:\nAmount Refunded: ${amountRefunded}\nRefunded Item: {targetName}\n\nThank you,\n{choirName}',
        type: 'Email',
        isSystemTemplate: true,
      },
    ];

    seeds.forEach((seed) => {
      try {
        // Check if template already exists
        app.findFirstRecordByFilter(
          'messageTemplates',
          'title = {:title} && isSystemTemplate = true',
          { title: seed.title }
        );
      } catch (e) {
        const record = new Record(templates, {
          title: seed.title,
          subject: seed.subject,
          content: seed.content,
          type: seed.type,
          isSystemTemplate: seed.isSystemTemplate,
        });
        app.save(record);
      }
    });
  },
  (app) => {
    const templates = app.findCollectionByNameOrId('messageTemplates');

    const templateTitles = [
      'Admin Notice: Ticket Sale',
      'Admin Notice: Donation',
      'Admin Notice: Refund',
    ];

    templateTitles.forEach((title) => {
      try {
        const record = app.findFirstRecordByFilter(
          'messageTemplates',
          'title = {:title} && isSystemTemplate = true',
          { title }
        );
        if (record) {
          app.delete(record);
        }
      } catch (e) {}
    });

    const profiles = app.findCollectionByNameOrId('profiles');
    const field = profiles.fields.getByName('receiveFinancialAlerts');
    if (field) {
      profiles.fields.removeByName('receiveFinancialAlerts');
      app.save(profiles);
    }
  }
);
