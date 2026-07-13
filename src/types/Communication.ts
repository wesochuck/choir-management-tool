export type CommunicationTab =
  | 'compose'
  | 'drafts'
  | 'history'
  | 'templates'
  | 'automated'
  | 'settings';

export const COMMUNICATION_SECTIONS: ReadonlyArray<{
  value: CommunicationTab;
  label: string;
}> = [
  { value: 'compose', label: 'Compose' },
  { value: 'drafts', label: 'Drafts' },
  { value: 'history', label: 'History' },
  { value: 'templates', label: 'Templates' },
  { value: 'automated', label: 'Upcoming Sends' },
  { value: 'settings', label: 'Settings' },
];

export interface MessageTemplate {
  id: string;
  title: string;
  description: string;
  category: 'rehearsal' | 'dues' | 'attendance' | 'weather' | 'general' | 'blank';
  channel: 'email' | 'sms' | 'both';
  origin: 'system' | 'custom';
  subjectLine?: string;
  content?: string;
  updated?: string;
}
