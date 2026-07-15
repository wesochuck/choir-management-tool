import type { RecordModel } from 'pocketbase';
import type { Retry429Options } from '../../lib/networkSafety';

export type MessageType = 'Email' | 'SMS' | 'Both';
type RsvpFilter = 'All' | 'Yes' | 'No' | 'Pending';
type MessageStatus = 'Draft' | 'Sent' | 'Failed' | 'Archived';
export type AutomatedTaskType = 'Reminder' | 'Report' | 'RSVP Request' | 'Ticket Buyer Reminder';

type AutomatedTaskResolutionStatus = 'pending' | 'sent' | 'archived';
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
  targetAudiences?: ('Members' | 'Ticket Buyers' | 'Donors')[];
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

// ---------------------------------------------------------------------------
// Delivery visibility contracts (Phase 3)
// ---------------------------------------------------------------------------

export type DeliveryState =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'partial'
  | 'failed'
  | 'tracking-unavailable';

export type FailureCategory =
  | 'authentication'
  | 'rate-limit'
  | 'invalid-destination'
  | 'provider-rejected'
  | 'timeout'
  | 'unknown';

interface DeliveryCounts {
  total: number;
  pending: number;
  processing: number;
  sent: number;
  failed: number;
}

interface DeliveryFailureDetail {
  maskedDestination: string;
  channel: 'email' | 'sms';
  attempts: number;
  category: FailureCategory;
  lastSeen: string;
}

export interface DeliverySummary {
  messageId: string;
  state: DeliveryState;
  total: DeliveryCounts;
  email: DeliveryCounts;
  sms: DeliveryCounts;
  failures: DeliveryFailureDetail[];
  hasMoreFailures: boolean;
  lastActivity: string | null;
  truncated: boolean;
}

export interface DeliverySummaryResponse {
  summaries: Record<string, DeliverySummary>;
}

export interface RetryFailedResponse {
  retriedCount: number;
}
