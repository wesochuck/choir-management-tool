import { getSetting, upsertSetting } from './core';

export interface CommunicationSettings {
  emailSubject: string;
  emailBody: string;
  smsBody: string;
  mailingAddress: string;
  frontendUrl: string;
  reminderEnabled: boolean;
  reminderHoursBefore: number;
  reminderSubjectTemplate: string;
  reminderBodyTemplate: string;
  reportEnabled: boolean;
  reportHoursAfter: number;
  reportSubjectTemplate: string;
  reportBodyTemplate: string;
  defaultCountryCode: string;
}

export const DEFAULT_COMMUNICATION_SETTINGS: CommunicationSettings = {
  emailSubject: 'Choir reminder: {eventTitle}',
  emailBody: [
    'Reminder for {eventTitle}',
    '',
    'When: {eventDate}',
    'Where: {eventLocation}',
    '',
    '{eventDetails}',
  ].join('\n'),
  smsBody: 'Choir reminder: {eventTitle} on {eventDate} at {eventLocation}.',
  mailingAddress: '123 Choir St, Harmony City, HC 12345',
  frontendUrl: 'http://localhost:5173',
  reminderEnabled: false,
  reminderHoursBefore: 24,
  reminderSubjectTemplate: 'Choir Event Reminder: {eventTitle}',
  reminderBodyTemplate: [
    'Hello {singerName},',
    '',
    'This is an automatic reminder for the upcoming choir event:',
    '**{eventTitle}** ({eventType})',
    '',
    '**When:** {eventDate}',
    '**Where:** {eventLocation}',
    '',
    'Details: {eventDetails}',
    '',
    'Please make sure your RSVP is up to date: {rsvpLinks}',
    '',
    'See you there!',
    'Choir Management',
  ].join('\n'),
  reportEnabled: true,
  reportHoursAfter: 12,
  reportSubjectTemplate: 'Attendance Report: {eventTitle} ({eventDate})',
  reportBodyTemplate: [
    '<h2>Attendance Summary</h2>',
    '<p><strong>Event:</strong> {eventTitle}</p>',
    '<p><strong>Date:</strong> {eventDate}</p>',
    '<div style="background-color: #f8faf9; padding: 15px; border-radius: 6px; margin: 20px 0;">',
    '    <p style="margin: 0; font-size: 18px;"><strong>Attendance Rate:</strong> <span style="color: #1b4d3e;">{attendanceRate}%</span></p>',
    '    <p style="margin: 5px 0 0 0; color: #64748b;">{presentCount} present / {totalCount} total participants</p>',
    '</div>',
    '',
    '<h3 style="border-bottom: 2px solid #e9f0eb; padding-bottom: 8px;">Absentees</h3>',
    '<ul style="padding-left: 20px;">',
    '    {absenteesList}',
    '</ul>',
    '',
    '{thresholdWarningsSection}',
  ].join('\n'),
  defaultCountryCode: '1',
};

export async function getCommunicationSettings(): Promise<CommunicationSettings> {
  const setting = await getSetting<CommunicationSettings>('communications');
  const value = setting?.value;
  let resolvedUrl = value?.frontendUrl;
  if (
    (!resolvedUrl || resolvedUrl === 'http://localhost:5173') &&
    typeof window !== 'undefined' &&
    window.location?.origin
  ) {
    resolvedUrl = window.location.origin;
  }
  return {
    ...DEFAULT_COMMUNICATION_SETTINGS,
    ...value,
    frontendUrl: resolvedUrl || DEFAULT_COMMUNICATION_SETTINGS.frontendUrl,
  };
}

export async function saveCommunicationSettings(value: CommunicationSettings) {
  return await upsertSetting('communications', value, false);
}
