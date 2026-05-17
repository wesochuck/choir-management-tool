import type { SendMessageInput } from '../services/communicationService';

export const communicationUtils = {
  formatCommunicationUrls(data: SendMessageInput): { mailtoUrl: string, smsUrl: string } {
    const emailRecipients = data.recipients.map((recipient) => recipient.email).filter(Boolean);
    const phoneRecipients = data.recipients.map((recipient) => recipient.phone.replace(/[^\d+]/g, '')).filter(Boolean);

    const encodeSmsBody = (content: string) => encodeURIComponent(content.slice(0, 1500));

    const mailtoUrl = emailRecipients.length
      ? `mailto:?bcc=${encodeURIComponent(emailRecipients.join(','))}&subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(data.content)}`
      : '';
    const smsUrl = phoneRecipients.length
      ? `sms:${encodeURIComponent(phoneRecipients.join(','))}?&body=${encodeSmsBody(data.content)}`
      : '';

    return { mailtoUrl, smsUrl };
  }
};
