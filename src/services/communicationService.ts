import { pb } from '../lib/pocketbase';
import { eventService, type Event } from './eventService';
import { profileService, type Profile } from './profileService';
import { rosterService } from './rosterService';
import {
  DEFAULT_COMMUNICATION_CONFIG,
  settingsService,
  type CommunicationConfig,
} from './settingsService';
import { communicationUtils } from '../lib/communicationUtils';
import type { RecordModel } from 'pocketbase';

export type { CommunicationConfig } from './settingsService';

export type MessageType = 'Email' | 'SMS' | 'Both';
export type RsvpFilter = 'All' | 'Yes' | 'No' | 'Pending';

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
  voicePart: string;
  globalStatus: string;
}

export interface MessageRecord extends RecordModel {
  subject: string;
  content: string;
  type: MessageType;
  recipients: CommunicationRecipient[];
  filters: CommunicationFilters;
  sender?: string;
  created: string;
}

export interface SendMessageInput {
  subject: string;
  content: string;
  type: MessageType;
  recipients: CommunicationRecipient[];
  filters: CommunicationFilters;
}

export interface SendMessageResult {
  message: MessageRecord;
  mailtoUrl: string;
  smsUrl: string;
}

const profileToRecipient = (profile: Profile): CommunicationRecipient => ({
  id: profile.id,
  name: profile.name,
  email: profile.expand?.user?.email || '',
  phone: profile.phone || '',
  voicePart: profile.voicePart,
  globalStatus: profile.globalStatus,
});

export const communicationService = {
  async getMessages() {
    return await pb.collection('messages').getFullList<MessageRecord>({
      sort: '-created',
    });
  },

  async getEvents() {
    return await eventService.getEvents();
  },

  async getConfig() {
    return await settingsService.getCommunicationConfig();
  },

  async saveConfig(value: CommunicationConfig) {
    return await settingsService.saveCommunicationConfig(value);
  },

  async resolveRecipients(filters: CommunicationFilters) {
    const profiles = await profileService.getProfiles();
    let allowedProfileIds: Set<string> | null = null;

    if (filters.eventId) {
      const roster = await rosterService.getEventRoster(filters.eventId);
      allowedProfileIds = new Set(
        roster
          .filter((item) => filters.rsvp === 'All' || item.rsvp === filters.rsvp)
          .map((item) => item.profile),
      );
    }

    return profiles
      .filter((profile) => !allowedProfileIds || allowedProfileIds.has(profile.id))
      .filter((profile) => !filters.voicePart || profile.voicePart === filters.voicePart)
      .filter((profile) => !filters.globalStatus || profile.globalStatus === filters.globalStatus)
      .map(profileToRecipient);
  },

  async saveMessage(data: SendMessageInput) {
    const currentUser = pb.authStore.model;
    const payload: Partial<MessageRecord> & { sender?: string } = {
      subject: data.subject,
      content: data.content,
      type: data.type,
      recipients: data.recipients,
      filters: data.filters,
    };

    if (currentUser?.collectionName === 'users') {
      payload.sender = currentUser.id;
    }

    return await pb.collection('messages').create<MessageRecord>(payload);
  },

  async sendBulkMessage(data: SendMessageInput): Promise<SendMessageResult> {
    const message = await this.saveMessage(data);
    const urls = communicationUtils.formatCommunicationUrls(data);
    return { message, ...urls };
  },

  defaultConfig: DEFAULT_COMMUNICATION_CONFIG,
  voiceParts: ['S1', 'S2', 'A1', 'A2', 'T1', 'T2', 'B1', 'B2'],
  statuses: ['Active (Current)', 'Active (Future)', 'Inactive'],
} satisfies {
  getMessages: () => Promise<MessageRecord[]>;
  getEvents: () => Promise<Event[]>;
  getConfig: () => Promise<CommunicationConfig>;
  saveConfig: (value: CommunicationConfig) => Promise<unknown>;
  resolveRecipients: (filters: CommunicationFilters) => Promise<CommunicationRecipient[]>;
  saveMessage: (data: SendMessageInput) => Promise<MessageRecord>;
  sendBulkMessage: (data: SendMessageInput) => Promise<SendMessageResult>;
  defaultConfig: CommunicationConfig;
  voiceParts: string[];
  statuses: string[];
};
