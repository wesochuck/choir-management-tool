/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const updates = [
      {
        title: 'Ticket Confirmation',
        qrSuffix: '\n\n{{TICKET_QR}}\n\nShow this QR at the door for verification.\n',
        buttonSuffix:
          '\n\n{{TICKET_BUTTON}}\n\nYour tickets will be held at Will Call under your name. Please bring a photo ID matching the buyer name.\n',
      },
      {
        title: 'Bundle Ticket Confirmation',
        qrSuffix: '\n\n{{TICKET_QR}}\n\nValid for any of the included performances.\n',
        buttonSuffix:
          '\n\n{{TICKET_BUTTON}}\n\nYour season pass will be held at Will Call under your name. Please bring a photo ID matching the buyer name.\n',
      },
    ];
    for (const upd of updates) {
      try {
        const template = app.findFirstRecordByFilter(
          'messageTemplates',
          'title = {:title} && isSystemTemplate = true',
          { title: upd.title }
        );
        let content = template.get('content') || '';
        content = content.replace(upd.qrSuffix, '');
        if (!content.includes('{{TICKET_BUTTON}}')) {
          content += upd.buttonSuffix;
        }
        template.set('content', content);
        app.save(template);
      } catch (e) {
        console.log(`Migration: template '${upd.title}' not found, skipping`);
      }
    }
  },
  (app) => {
    const rollbacks = [
      {
        title: 'Ticket Confirmation',
        qrSuffix: '\n\n{{TICKET_QR}}\n\nShow this QR at the door for verification.\n',
        buttonSuffix:
          '\n\n{{TICKET_BUTTON}}\n\nYour tickets will be held at Will Call under your name. Please bring a photo ID matching the buyer name.\n',
      },
      {
        title: 'Bundle Ticket Confirmation',
        qrSuffix: '\n\n{{TICKET_QR}}\n\nValid for any of the included performances.\n',
        buttonSuffix:
          '\n\n{{TICKET_BUTTON}}\n\nYour season pass will be held at Will Call under your name. Please bring a photo ID matching the buyer name.\n',
      },
    ];
    for (const upd of rollbacks) {
      try {
        const template = app.findFirstRecordByFilter(
          'messageTemplates',
          'title = {:title} && isSystemTemplate = true',
          { title: upd.title }
        );
        let content = template.get('content') || '';
        content = content.replace(upd.buttonSuffix, '');
        if (!content.includes('{{TICKET_QR}}')) {
          content += upd.qrSuffix;
        }
        template.set('content', content);
        app.save(template);
      } catch (e) {
        // ignore
      }
    }
  }
);
