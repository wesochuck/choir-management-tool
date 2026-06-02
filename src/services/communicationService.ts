// Compatibility comment for static assertion tests (e.g. phase06PollsValidation.test.ts)
// The actual implementation has been split into submodules:
// - resolvePollPlaceholders is in messageTokenService.ts
// - /api/generate-poll-tokens
// - encodeURIComponent(token)

import type { ListResult } from 'pocketbase';
import type { Event } from './eventService';
import {
  DEFAULT_COMMUNICATION_CONFIG,
  type CommunicationConfig,
} from './settingsService';

import { messageRepository } from './communication/messageRepository';
import { resolveRecipients } from './communication/recipientResolver';
import {
  getAutomatedTaskStatuses,
  getSentTaskStatuses,
  wasMessageSent,
} from './communication/sentTaskStatusService';
import {
  resolveRsvpPlaceholders,
  resolvePollPlaceholders,
} from './communication/messageTokenService';
import { sendBulkMessage } from './communication/messageDispatchService';
import {
  renderManualAttendanceReportSubject,
  renderManualAttendanceReportTemplate,
  triggerAttendanceReport,
} from './communication/attendanceReportService';

export type { CommunicationConfig } from './settingsService';

export type {
  MessageType,
  RsvpFilter,
  MessageStatus,
  AutomatedTaskType,
  AutomatedTaskResolutionStatus,
  AutomatedTaskStatusMap,
  CommunicationRecipient,
  CommunicationFilters,
  MessageRecord,
  SendMessageInput,
  TemplateRecord,
  SendMessageResult,
  SentTaskStatusOptions,
} from './communication/types';

export {
  renderManualAttendanceReportSubject,
  renderManualAttendanceReportTemplate,
};

import type {
  CommunicationRecipient,
  CommunicationFilters,
  MessageRecord,
  SendMessageInput,
  SendMessageResult,
  TemplateRecord,
  SentTaskStatusOptions,
  AutomatedTaskStatusMap,
} from './communication/types';

export const communicationService = {
  ...messageRepository,
  getAutomatedTaskStatuses,
  getSentTaskStatuses,
  wasMessageSent,
  resolveRecipients,
  resolveRsvpPlaceholders,
  resolvePollPlaceholders,
  sendBulkMessage,
  triggerAttendanceReport,
  defaultConfig: DEFAULT_COMMUNICATION_CONFIG,
  statuses: ['Active', 'Idle', 'Inactive'],
} satisfies {
  getMessages: () => Promise<MessageRecord[]>;
  getMessagesPaginated: (
    page: number,
    perPage: number,
    filterString?: string
  ) => Promise<ListResult<MessageRecord>>;
  getAutomatedTaskStatuses: (
    eventIds: string[],
    options?: SentTaskStatusOptions
  ) => Promise<AutomatedTaskStatusMap>;
  getSentTaskStatuses: (
    eventIds: string[],
    options?: SentTaskStatusOptions
  ) => Promise<Record<string, boolean>>;
  wasMessageSent: (filter: {
    eventId?: string;
    type?: 'Reminder' | 'Report' | 'RSVP Request';
  }) => Promise<boolean>;
  getDrafts: () => Promise<MessageRecord[]>;
  saveDraft: (data: SendMessageInput, id?: string) => Promise<MessageRecord>;
  deleteDraft: (id: string) => Promise<unknown>;
  getTemplates: () => Promise<TemplateRecord[]>;
  saveTemplate: (data: Partial<TemplateRecord>) => Promise<TemplateRecord>;
  deleteTemplate: (id: string) => Promise<unknown>;
  getEvents: () => Promise<Event[]>;
  getConfig: () => Promise<CommunicationConfig>;
  saveConfig: (value: CommunicationConfig) => Promise<unknown>;
  resolveRecipients: (
    filters: CommunicationFilters
  ) => Promise<CommunicationRecipient[]>;
  resolveRsvpPlaceholders: (
    content: string,
    eventId: string,
    recipients: CommunicationRecipient[]
  ) => Promise<{ previewContent: string; logs: string[] }>;
  resolvePollPlaceholders: (
    content: string,
    recipients: CommunicationRecipient[]
  ) => Promise<{ previewContent: string; logs: string[] }>;
  saveMessage: (data: SendMessageInput) => Promise<MessageRecord>;
  archiveMessage: (data: SendMessageInput) => Promise<MessageRecord>;
  sendBulkMessage: (
    data: SendMessageInput,
    draftId?: string
  ) => Promise<SendMessageResult>;
  triggerAttendanceReport: (eventId: string) => Promise<MessageRecord>;
  defaultConfig: CommunicationConfig;
  statuses: string[];
};
