import type { PocketBaseRecord, PocketBaseApp } from '../email/emailTypes';
import { processEmailQueue } from '../email/queueProcessor';
import { parseJsonField } from '../email/hookJson';

declare const Record: new (collection: unknown, data?: unknown) => PocketBaseRecord;

interface FinancialAlertDetails {
  buyerName?: string;
  buyerEmail?: string;
  donorName?: string;
  donorEmail?: string;
  targetName?: string;
  quantity?: number;
  amountPaid?: number;
  amountRefunded?: number;
  tributeSection?: string;
}

export function notifyOfFinancialEvent(
  app: PocketBaseApp,
  type: 'Sale' | 'Donation' | 'Refund',
  details: FinancialAlertDetails
) {
  try {
    const adminUsers = app.findRecordsByFilter('users', "role = 'admin'", '');
    if (!adminUsers || adminUsers.length === 0) return;

    const adminUserIds = adminUsers.map((u: PocketBaseRecord) => u.id);

    const adminProfiles = app.findRecordsByFilter(
      'profiles',
      "globalStatus != 'Inactive' && receiveFinancialAlerts = true",
      ''
    );
    if (!adminProfiles || adminProfiles.length === 0) return;

    let templateTitle = '';
    if (type === 'Sale') {
      templateTitle = 'Admin Notice: Ticket Sale';
    } else if (type === 'Donation') {
      templateTitle = 'Admin Notice: Donation';
    } else if (type === 'Refund') {
      templateTitle = 'Admin Notice: Refund';
    }

    let template: PocketBaseRecord | null = null;
    try {
      template = app.findFirstRecordByFilter(
        'messageTemplates',
        'title = {:title} && isSystemTemplate = true',
        { title: templateTitle }
      );
    } catch (err) {
      console.log(
        '[Financial Alert Hook Error] Failed to find message template: ' +
          templateTitle +
          '. Error: ' +
          err
      );
      return;
    }

    if (!template) {
      console.log('[Financial Alert Hook Error] Message template is null: ' + templateTitle);
      return;
    }

    let choirName = 'Choir Management Tool';
    try {
      const choirRecord = app.findFirstRecordByFilter('appSettings', "key = 'choir_name'");
      const val = parseJsonField<string>(choirRecord.get('value'));
      if (val) choirName = val;
    } catch {
      // Use default
    }

    const queueCollection = app.findCollectionByNameOrId('emailQueue');
    const finalTemplate = template;

    adminProfiles.forEach((adminProf: PocketBaseRecord) => {
      const userId = adminProf.get('user') as string;
      if (!userId || adminUserIds.indexOf(userId) === -1) {
        return;
      }

      const adminUser = adminUsers.find((u: PocketBaseRecord) => u.id === userId);
      const recipientEmail = adminUser ? (adminUser.get('email') as string) : '';

      if (adminProf.get('doNotEmail') || !recipientEmail) {
        return;
      }

      const adminName = (adminProf.get('name') ||
        (adminUser ? adminUser.get('name') : '') ||
        'Administrator') as string;

      let subject = (finalTemplate.get('subject') as string) || '';
      let content = (finalTemplate.get('content') as string) || '';

      // Replace common placeholders
      subject = subject.replace(/{choirName}/g, choirName).replace(/{adminName}/g, adminName);
      content = content.replace(/{choirName}/g, choirName).replace(/{adminName}/g, adminName);

      if (type === 'Sale') {
        const buyerName = details.buyerName || 'Unknown Buyer';
        const buyerEmail = details.buyerEmail || '';
        const targetName = details.targetName || 'Event/Bundle';
        const quantity = String(details.quantity || 0);
        const amountPaid = (details.amountPaid || 0).toFixed(2);

        subject = subject.replace(/{buyerName}/g, buyerName);
        content = content
          .replace(/{buyerName}/g, buyerName)
          .replace(/{buyerEmail}/g, buyerEmail)
          .replace(/{targetName}/g, targetName)
          .replace(/{quantity}/g, quantity)
          .replace(/{amountPaid}/g, amountPaid);
      } else if (type === 'Donation') {
        const donorName = details.donorName || 'Anonymous Donor';
        const donorEmail = details.donorEmail || '';
        const amountPaid = (details.amountPaid || 0).toFixed(2);
        const tributeSection = details.tributeSection || '';

        subject = subject.replace(/{donorName}/g, donorName);
        content = content
          .replace(/{donorName}/g, donorName)
          .replace(/{donorEmail}/g, donorEmail)
          .replace(/{amountPaid}/g, amountPaid)
          .replace(/{tributeSection}/g, tributeSection);
      } else if (type === 'Refund') {
        const buyerName = details.buyerName || 'Unknown Customer';
        const buyerEmail = details.buyerEmail || '';
        const amountRefunded = (details.amountRefunded || 0).toFixed(2);
        const targetName = details.targetName || 'Refunded Item';

        subject = subject.replace(/{buyerName}/g, buyerName);
        content = content
          .replace(/{buyerName}/g, buyerName)
          .replace(/{buyerEmail}/g, buyerEmail)
          .replace(/{amountRefunded}/g, amountRefunded)
          .replace(/{targetName}/g, targetName);
      }

      const queueRecord = new Record(queueCollection, {
        recipientId: adminProf.id,
        recipientEmail: recipientEmail,
        recipientName: adminName,
        subject: subject,
        rawContent: content,
        status: 'Pending',
        attempts: 0,
        filters: JSON.stringify({
          type: 'Automated Financial Alert',
        }),
      });

      app.save(queueRecord);
    });

    // Trigger queue processor to dispatch emails immediately
    processEmailQueue(app);
  } catch (err) {
    console.log('[Financial Alert Hook Error] Failed to process financial notification: ' + err);
  }
}
