import { pb } from '../lib/pocketbase';
import { eventService, type Event } from './eventService';
import { profileService, type Profile } from './profileService';
import { rosterService } from './rosterService';
import {
  DEFAULT_COMMUNICATION_CONFIG,
  settingsService,
  type CommunicationConfig,
} from './settingsService';
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

const encodeSmsBody = (content: string) => encodeURIComponent(content.slice(0, 1500));

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

  async resolveRsvpPlaceholders(content: string, eventId: string, recipients: CommunicationRecipient[]): Promise<{ previewContent: string; logs: string[] }> {
    if (!content.includes('{{RSVP_LINKS}}') || !eventId || recipients.length === 0) {
      return { previewContent: content, logs: [] };
    }

    const profileIds = recipients.map(r => r.id);
    const response = await pb.send('/api/generate-rsvp-tokens', {
      method: 'POST',
      body: { eventId, profileIds }
    });

    const tokens = response.tokens;
    const baseUrl = window.location.origin;
    const logs: string[] = [];

    let previewLink = '';
    
    recipients.forEach(r => {
      const token = tokens[r.id];
      if (token) {
        const yesLink = `${baseUrl}/rsvp?token=${token}&rsvp=Yes`;
        const noLink = `${baseUrl}/rsvp?token=${token}&rsvp=No`;
        const text = `Yes: ${yesLink}\nNo: ${noLink}`;
        logs.push(`RSVP Links for ${r.name}:\n${text}`);
        
        if (!previewLink) previewLink = text;
      }
    });

    const previewContent = content.replace(/{{RSVP_LINKS}}/g, previewLink || '[RSVP Links will appear here]');
    return { previewContent, logs };
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
    let finalContent = data.content;
    
    if (data.content.includes('{{RSVP_LINKS}}') && data.filters.eventId) {
      const resolved = await this.resolveRsvpPlaceholders(data.content, data.filters.eventId, data.recipients);
      finalContent = resolved.previewContent;
      console.log('--- RSVP Links Generated ---');
      resolved.logs.forEach(log => console.log(log));
      console.log('----------------------------');
    }

    const message = await this.saveMessage({ ...data, content: finalContent });
    const emailRecipients = data.recipients.map((recipient) => recipient.email).filter(Boolean);
    const phoneRecipients = data.recipients.map((recipient) => recipient.phone.replace(/[^\d+]/g, '')).filter(Boolean);

    const mailtoUrl = emailRecipients.length
      ? `mailto:?bcc=${encodeURIComponent(emailRecipients.join(','))}&subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(finalContent)}`
      : '';
    const smsUrl = phoneRecipients.length
      ? `sms:${encodeURIComponent(phoneRecipients.join(','))}?&body=${encodeSmsBody(finalContent)}`
      : '';

    return { message, mailtoUrl, smsUrl };
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
  resolveRsvpPlaceholders: (content: string, eventId: string, recipients: CommunicationRecipient[]) => Promise<{ previewContent: string; logs: string[] }>;
  saveMessage: (data: SendMessageInput) => Promise<MessageRecord>;
  sendBulkMessage: (data: SendMessageInput) => Promise<SendMessageResult>;
  defaultConfig: CommunicationConfig;
  voiceParts: string[];
  statuses: string[];
};
