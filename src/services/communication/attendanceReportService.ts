import { pb } from '../../lib/pocketbase';
import type { RecordModel } from 'pocketbase';
import type { Event } from '../eventService';
import { profileService } from '../profileService';
import { rosterService } from '../rosterService';
import { settingsService } from '../settingsService';
import { escapeHtml, sanitizeEmailSubject } from '../../lib/textSafety';
import { messageRepository } from './messageRepository';
import type { MessageRecord } from './types';

export function renderManualAttendanceReportSubject(params: {
  template: string;
  eventTitle: string;
  eventDate: string;
}): string {
  return params.template
    .replace(/{eventTitle}/g, () => sanitizeEmailSubject(params.eventTitle))
    .replace(/{eventDate}/g, () => sanitizeEmailSubject(params.eventDate));
}

export function renderManualAttendanceReportTemplate(params: {
  template: string;
  eventTitle: string;
  eventDate: string;
  attendanceRate: string;
  presentCount: number;
  totalCount: number;
  absenteeNames: string[];
}): string {
  const escapedAbsentees = params.absenteeNames.map(escapeHtml);
  const safeAbsenteesList =
    escapedAbsentees.length > 0
      ? escapedAbsentees.map((name) => `<li style="margin-bottom: 4px;">${name}</li>`).join('')
      : '<li>None</li>';

  return params.template
    .replace(/{eventTitle}/g, () => escapeHtml(params.eventTitle))
    .replace(/{eventDate}/g, () => escapeHtml(params.eventDate))
    .replace(/{attendanceRate}/g, () => escapeHtml(params.attendanceRate))
    .replace(/{presentCount}/g, () => escapeHtml(String(params.presentCount)))
    .replace(/{totalCount}/g, () => escapeHtml(String(params.totalCount)))
    .replace(/{absenteesList}/g, () => safeAbsenteesList)
    .replace(/{thresholdWarningsSection}/g, () => '');
}

export async function triggerAttendanceReport(eventId: string): Promise<MessageRecord> {
  const event = await pb.collection('events').getOne<Event>(eventId, { expand: 'venue' });
  const commSettings = await settingsService.getCommunicationSettings();
  const admins = await pb.collection('users').getFullList({ filter: 'role = "admin"' });

  if (admins.length === 0) throw new Error('No admins found to receive the report.');

  // Aggregate Attendance
  const rosters = await rosterService.getEventRoster(eventId);
  if (rosters.length === 0) throw new Error('No roster data found for this event.');

  const total = rosters.length;
  const present = rosters.filter((r) => r.attendance === 'Present').length;
  const absentees = rosters.filter((r) => r.attendance === 'Absent');

  // Fetch profile names for absentees
  const profiles = await profileService.getProfiles();
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const absenteeNames = absentees.map((r) => profileMap.get(r.profile)?.name || 'Unknown Singer');
  const attendanceRate = total > 0 ? ((present / total) * 100).toFixed(1) : '0';

  // Build Email Content
  const eventDateStr = new Date(event.date).toLocaleDateString();

  const subject = renderManualAttendanceReportSubject({
    template: commSettings.reportSubjectTemplate,
    eventTitle: event.title || event.type,
    eventDate: eventDateStr,
  });

  const templateBody = renderManualAttendanceReportTemplate({
    template: commSettings.reportBodyTemplate,
    eventTitle: event.title || event.type,
    eventDate: eventDateStr,
    attendanceRate,
    presentCount: present,
    totalCount: total,
    absenteeNames,
  });

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

  const recipients = admins.map((admin) => {
    const adminData = admin as RecordModel;
    return {
      id: admin.id,
      name: adminData.name || admin.email || 'Admin',
      email: admin.email,
      phone: '',
      voicePart: '',
      globalStatus: 'Admin',
    };
  });

  return await messageRepository.saveMessage({
    subject,
    content: body,
    type: 'Email',
    recipients,
    filters: { alreadySent: false, type: 'Attendance Report', eventId: event.id },
    status: 'Sent' as const,
  });
}
