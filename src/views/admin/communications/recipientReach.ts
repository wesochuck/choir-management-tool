import type { CommunicationRecipient, MessageType } from '../../../services/communicationService';

export interface RecipientReachSummary {
  totalSelected: number;
  reachablePeople: number;
  excludedPeople: number;
  emailDeliveries: number;
  smsDeliveries: number;
}

function hasEmail(recipient: CommunicationRecipient): boolean {
  return Boolean(recipient.email?.trim());
}

function hasSms(recipient: CommunicationRecipient): boolean {
  return Boolean(recipient.phone?.trim());
}

export function getReachableRecipients(
  recipients: CommunicationRecipient[],
  messageType: MessageType
): CommunicationRecipient[] {
  return recipients.filter((recipient) => {
    if (messageType === 'Email') return hasEmail(recipient);
    if (messageType === 'SMS') return hasSms(recipient);
    return hasEmail(recipient) || hasSms(recipient);
  });
}

export function summarizeRecipientReach(
  recipients: CommunicationRecipient[],
  messageType: MessageType
): RecipientReachSummary {
  const emailDeliveries = recipients.filter(hasEmail).length;
  const smsDeliveries = recipients.filter(hasSms).length;
  const reachablePeople = getReachableRecipients(recipients, messageType).length;

  return {
    totalSelected: recipients.length,
    reachablePeople,
    excludedPeople: recipients.length - reachablePeople,
    emailDeliveries: messageType === 'SMS' ? 0 : emailDeliveries,
    smsDeliveries: messageType === 'Email' ? 0 : smsDeliveries,
  };
}

function recipientWord(count: number): string {
  return count === 1 ? 'recipient' : 'recipients';
}

export function buildSendConfirmation(
  subject: string,
  messageType: MessageType,
  summary: RecipientReachSummary
): string {
  const displaySubject = subject.trim() || 'SMS message';
  const channel =
    messageType === 'Both' ? 'email and SMS' : messageType === 'Email' ? 'email' : 'SMS';
  const lines = [
    `Send “${displaySubject}” by ${channel} to ${summary.reachablePeople} ${recipientWord(summary.reachablePeople)}?`,
  ];

  if (messageType === 'Both') {
    lines.push(
      `${summary.emailDeliveries} email deliveries · ${summary.smsDeliveries} SMS deliveries.`
    );
  }

  if (summary.excludedPeople > 0) {
    lines.push(
      `${summary.excludedPeople} selected ${recipientWord(summary.excludedPeople)} will be excluded because ${messageType === 'Both' ? 'neither channel is' : `${channel} is`} available.`
    );
  }

  return lines.join('\n');
}
