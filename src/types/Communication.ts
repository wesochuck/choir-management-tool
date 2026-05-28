export type CommunicationTab = 'compose' | 'automated' | 'drafts' | 'history' | 'settings';

export interface MessageTemplate {
  id: string;
  title: string;
  description: string;
  category: 'rehearsal' | 'dues' | 'attendance' | 'weather' | 'general' | 'blank';
  channel: 'email' | 'sms' | 'both';
  origin: 'system' | 'custom';
  subjectLine?: string;
  content?: string;
}
