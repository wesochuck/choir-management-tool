import { pb } from '../lib/pocketbase';
import { eventService, type Event } from './eventService';
import { profileService, type Profile } from './profileService';
import { rosterService } from './rosterService';
import { settingsService, getVoicePartsAndSections } from './settingsService';
import { COMPLIANT_FOOTER_HTML } from '../lib/communicationUtils';
import {
  DEFAULT_COMMUNICATION_CONFIG,
  type CommunicationConfig,
} from './settingsService';
import type { RecordModel } from 'pocketbase';

export type { CommunicationConfig } from './settingsService';

export type MessageType = 'Email' | 'SMS' | 'Both';
export type RsvpFilter = 'All' | 'Yes' | 'No' | 'Pending';
export type MessageStatus = 'Draft' | 'Sent' | 'Failed';

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
}

export interface MessageRecord extends RecordModel {
  subject: string;
  content: string;
  type: MessageType;
  recipients: CommunicationRecipient[];
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
      filter: 'status = "Sent"',
    });
  },

  async getDrafts() {
    return await pb.collection('messages').getFullList<MessageRecord>({
      sort: '-created',
      filter: 'status = "Draft"',
    });
  },

  async saveDraft(data: SendMessageInput, id?: string) {
    const payload = { ...data, status: 'Draft' as const };
    if (id) {
      return await pb.collection('messages').update<MessageRecord>(id, payload);
    }
    return await pb.collection('messages').create<MessageRecord>(payload);
  },

  async deleteDraft(id: string) {
    return await pb.collection('messages').delete(id);
  },

  async getTemplates() {
    return await pb.collection('messageTemplates').getFullList<TemplateRecord>({
      sort: 'title',
    });
  },

  async saveTemplate(data: Partial<TemplateRecord>) {
    if (data.id) {
      return await pb.collection('messageTemplates').update<TemplateRecord>(data.id, data);
    }
    return await pb.collection('messageTemplates').create<TemplateRecord>(data as TemplateRecord);
  },

  async deleteTemplate(id: string) {
    return await pb.collection('messageTemplates').delete(id);
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
    const [profiles, voiceData] = await Promise.all([
      profileService.getProfiles(),
      getVoicePartsAndSections(),
    ]);

    let allowedProfileIds: Set<string> | null = null;

    if (filters.eventId) {
      const roster = await rosterService.getEventRoster(filters.eventId);
      if (filters.rsvp === 'Pending') {
        // "Pending" includes profiles without an eventRosters row; those are implicitly pending.
        const rosterByProfileId = new Map<string, 'Yes' | 'No' | 'Pending'>(
          roster.map((item) => [item.profile, item.rsvp]),
        );
        allowedProfileIds = new Set(
          profiles
            .filter((profile) => (rosterByProfileId.get(profile.id) ?? 'Pending') === 'Pending')
            .map((profile) => profile.id),
        );
      } else {
        allowedProfileIds = new Set(
          roster
            .filter((item) => filters.rsvp === 'All' || item.rsvp === filters.rsvp)
            .map((item) => item.profile),
        );
      }
    }

    // Resolve voiceParts filter: Expand any section codes to their constituent parts
    let targetParts: Set<string> | null = null;
    if (filters.voiceParts && filters.voiceParts.length > 0) {
      targetParts = new Set();
      const sections = new Set(voiceData.sections.map((s) => s.code));
      
      filters.voiceParts.forEach(token => {
        if (sections.has(token)) {
          // It's a bucket/section code, add all parts in this section
          voiceData.voiceParts
            .filter((vp) => vp.sectionCode === token)
            .forEach((vp) => targetParts?.add(vp.label));
        } else {
          // It's an individual part label
          targetParts?.add(token);
        }
      });
    }

    return profiles
      .filter((profile: Profile) => !allowedProfileIds || allowedProfileIds.has(profile.id))
      .filter((profile: Profile) => !targetParts || targetParts.has(profile.voicePart))
      .filter((profile: Profile) => !filters.globalStatus || profile.globalStatus === filters.globalStatus)
      .map(profileToRecipient);
  },

  async resolveRsvpPlaceholders(content: string, eventId: string, recipients: CommunicationRecipient[]): Promise<{ previewContent: string; logs: string[] }> {
    if (!content.includes('{{RSVP_LINKS}}') || !eventId || recipients.length === 0) {
      return { previewContent: content, logs: [] };
    }

    try {
      const { tokens } = await pb.send('/api/generate-rsvp-tokens', {
        method: 'POST',
        body: { eventId, profileIds: recipients.map(r => r.id) }
      });

      const commSettings = await settingsService.getCommunicationSettings();
      const baseUrl = commSettings.frontendUrl || window.location.origin;

      const firstRecipient = recipients[0];
      const token = tokens[firstRecipient.id];
      const yesLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}&rsvp=Yes`;
      const noLink = `${baseUrl}/rsvp?token=${encodeURIComponent(token)}&rsvp=No`;

      const previewContent = content.replace('{{RSVP_LINKS}}', `(RSVP Links for ${firstRecipient.name})\nYes: ${yesLink}\nNo: ${noLink}`);
      
      const logs = recipients.map(r => {
        const t = tokens[r.id];
        return `Personalized Link for ${r.name}: ${baseUrl}/rsvp?token=${encodeURIComponent(t)}`;
      });

      return { previewContent, logs };
    } catch (err) {
      console.error('Failed to generate RSVP tokens', err);
      return { previewContent: content.replace('{{RSVP_LINKS}}', '(Error generating RSVP links)'), logs: [] };
    }
  },

  async saveMessage(data: SendMessageInput) {
    return await pb.collection('messages').create<MessageRecord>(data);
  },

  async sendBulkMessage(data: SendMessageInput, draftId?: string): Promise<SendMessageResult> {
    // Decision: For now, I will append a GENERIC footer to the message record,
    // and if the backend hook sees an email, it will wrap the content with the compliant footer.
    const payload = { 
      ...data, 
      content: data.content + COMPLIANT_FOOTER_HTML,
      status: 'Sent' as const
    };

    let message: MessageRecord;
    if (draftId) {
      message = await pb.collection('messages').update<MessageRecord>(draftId, payload);
    } else {
      message = await pb.collection('messages').create<MessageRecord>(payload);
    }

    const phoneRecipients = data.recipients.map((recipient) => recipient.phone.replace(/[^\d+]/g, '')).filter(Boolean);

    const mailtoUrl = ''; // Intentionally left blank. Email is dispatched securely on the server side.
    const smsUrl = phoneRecipients.length
      ? `sms:${encodeURIComponent(phoneRecipients.join(','))}?&body=${encodeSmsBody(data.content)}`
      : '';

    return { message, mailtoUrl, smsUrl };
  },

  async triggerAttendanceReport(eventId: string) {
    const event = await pb.collection('events').getOne<Event>(eventId, { expand: 'venue' });
    const commSettings = await settingsService.getCommunicationSettings();
    const admins = await pb.collection('users').getFullList({ filter: 'role = "admin"' });
    
    if (admins.length === 0) throw new Error('No admins found to receive the report.');

    // Aggregate Attendance
    const rosters = await rosterService.getEventRoster(eventId);
    if (rosters.length === 0) throw new Error('No roster data found for this event.');

    const total = rosters.length;
    const present = rosters.filter(r => r.attendance === 'Present').length;
    const absentees = rosters.filter(r => r.attendance === 'Absent');
    
    // Fetch profile names for absentees
    const profiles = await profileService.getProfiles();
    const profileMap = new Map(profiles.map(p => [p.id, p]));
    
    const absenteeNames = absentees.map(r => profileMap.get(r.profile)?.name || 'Unknown Singer');
    const attendanceRate = total > 0 ? ((present / total) * 100).toFixed(1) : '0';

    // Build Email Content
    const eventDateStr = new Date(event.date).toLocaleDateString();
    const subject = commSettings.reportSubjectTemplate
        .replace(/{eventTitle}/g, event.title || event.type)
        .replace(/{eventDate}/g, eventDateStr);

    const templateBody = commSettings.reportBodyTemplate
        .replace(/{eventTitle}/g, event.title || event.type)
        .replace(/{eventDate}/g, eventDateStr)
        .replace(/{attendanceRate}/g, attendanceRate)
        .replace(/{presentCount}/g, String(present))
        .replace(/{totalCount}/g, String(total))
        .replace(/{absenteesList}/g, absenteeNames.length > 0 ? absenteeNames.map(name => `<li style="margin-bottom: 4px;">${name}</li>`).join('') : '<li>None</li>')
        .replace(/{thresholdWarningsSection}/g, ''); // Simplified for manual trigger

    const body = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9f0eb; border-radius: 8px;">
            ${templateBody}
            <hr style="border: 0; border-top: 1px solid #e9f0eb; margin: 30px 0;" />
            <div style="font-size: 12px; color: #94a3b8; text-align: center;">
                <p style="margin: 0 0 10px 0;">{{MAILING_ADDRESS}}</p>
                <p style="margin: 0;">
                    This is a manually triggered attendance report.
                    <br />
                    Choir Management Tool
                </p>
            </div>
        </div>
    `;

    const recipients = admins.map(admin => {
        const adminData = admin as RecordModel;
        return {
            id: admin.id,
            name: adminData.name || admin.email || 'Admin',
            email: admin.email,
            phone: '',
            voicePart: '',
            globalStatus: 'Admin'
        };
    });

    return await this.saveMessage({
        subject,
        content: body,
        type: 'Email',
        recipients,
        filters: { alreadySent: false, type: 'Attendance Report', eventId: event.id },
        status: 'Sent' as const
    });
  },

  defaultConfig: DEFAULT_COMMUNICATION_CONFIG,
  statuses: ['Active (Current)', 'Active (Future)', 'Inactive'],
} satisfies {
  getMessages: () => Promise<MessageRecord[]>;
  getDrafts: () => Promise<MessageRecord[]>;
  saveDraft: (data: SendMessageInput, id?: string) => Promise<MessageRecord>;
  deleteDraft: (id: string) => Promise<unknown>;
  getTemplates: () => Promise<TemplateRecord[]>;
  saveTemplate: (data: Partial<TemplateRecord>) => Promise<TemplateRecord>;
  deleteTemplate: (id: string) => Promise<unknown>;
  getEvents: () => Promise<Event[]>;
  getConfig: () => Promise<CommunicationConfig>;
  saveConfig: (value: CommunicationConfig) => Promise<unknown>;
  resolveRecipients: (filters: CommunicationFilters) => Promise<CommunicationRecipient[]>;
  resolveRsvpPlaceholders: (content: string, eventId: string, recipients: CommunicationRecipient[]) => Promise<{ previewContent: string; logs: string[] }>;
  saveMessage: (data: SendMessageInput) => Promise<MessageRecord>;
  sendBulkMessage: (data: SendMessageInput, draftId?: string) => Promise<SendMessageResult>;
  triggerAttendanceReport: (eventId: string) => Promise<MessageRecord>;
  defaultConfig: CommunicationConfig;
  statuses: string[];
};
