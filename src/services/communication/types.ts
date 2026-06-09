import type { RecordModel } from 'pocketbase';
import type { Retry429Options } from '../../lib/networkSafety';

export type MessageType = 'Email' | 'SMS' | 'Both';
export type RsvpFilter = 'All' | 'Yes' | 'No' | 'Pending';
export type MessageStatus = 'Draft' | 'Sent' | 'Failed' | 'Archived';
export type AutomatedTaskType = 'Reminder' | 'Report' | 'RSVP Request' | 'Ticket Buyer Reminder';

export type AutomatedTaskResolutionStatus = 'pending' | 'sent' | 'archived';
export type AutomatedTaskStatusMap = Record<string, AutomatedTaskResolutionStatus>;

export interface CommunicationRecipient {
  id: string;
  name: string;
  email: string;
  phone: string;
  voicePart: string;
  globalStatus: string;
}

export interface CommunicationFilters {
  eventId: string;
  rsvp: RsvpFilter;
  voiceParts: string[]; // Supports both individual part labels and section codes
  globalStatus: string;
  profileIds?: string[]; // New field
}

export interface MessageRecord extends RecordModel {
  subject: string;
  content: string;
  type: MessageType;
  recipients: CommunicationRecipient[];
  recipientIds?: string[];
  filters: Record<string, unknown>; // Allow flexible structure for automated messages
  status: MessageStatus;
  sender?: string;
  created: string;
}

export interface SendMessageInput {
  subject: string;
  content: string;
  type: MessageType;
  recipients: CommunicationRecipient[];
  recipientIds?: string[];
  filters: Record<string, unknown>;
  status?: MessageStatus;
}

export interface TemplateRecord extends RecordModel {
  title: string;
  subject: string;
  content: string;
  type: MessageType;
  isSystemTemplate: boolean;
}

export interface SendMessageResult {
  message: MessageRecord;
  mailtoUrl: string;
}

export interface SentTaskStatusOptions {
  onRetry?: Retry429Options['onRetry'];
}
