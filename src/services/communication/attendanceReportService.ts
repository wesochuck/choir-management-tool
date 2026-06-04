import { pb } from '../../lib/pocketbase';
import type { Event } from '../eventService';
import { profileService, type Profile } from '../profileService';
import { rosterService } from '../rosterService';
import { settingsService } from '../settingsService';
import { escapeHtml, sanitizeEmailSubject } from '../../lib/textSafety';
import { messageRepository } from './messageRepository';
import type { MessageRecord, CommunicationRecipient } from './types';

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
  thresholdWarningsSection?: string;
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
    .replace(/{thresholdWarningsSection}/g, () => params.thresholdWarningsSection || '');
}

export async function resolveAttendanceReportRecipients(): Promise<CommunicationRecipient[]> {
  // Avoid filtering on expanded relation fields here; in production PocketBase returned
  // zero rows for user.role/user.email relation filters even when expand=user succeeded.
  const profiles = await pb.collection('profiles').getFullList<Profile>({
    expand: 'user',
    sort: 'name',
  });

  return profiles
    .filter((profile) => {
      const user = profile.expand?.user;
      return (
        user?.role === 'admin' &&
        !!user.email &&
        profile.globalStatus !== 'Inactive' &&
        profile.receiveAttendanceReports !== false &&
        profile.doNotEmail !== true
      );
    })
    .flatMap((profile) => {
      const user = profile.expand?.user;
      if (!user?.email) return [];
      return {
        id: profile.user || profile.id,
        name:
          profile.name ||
          user.name ||
          user.email ||
          'Admin',
        email: user.email,
        phone: profile.phone || '',
        voicePart: 'Admin',
        globalStatus: 'Admin',
      };
    });
}

export async function finalizeUnmarkedAttendanceForEvent(eventId: string): Promise<void> {
  const event = await pb.collection('events').getOne<Event>(eventId);
  const isPerformance = event.type === 'Performance';
  const linkedPerfId = isPerformance ? event.id : event.parentPerformanceId;

  if (!linkedPerfId) return;

  const activeProfiles = await pb.collection('profiles').getFullList<Profile>({
    filter: 'voicePart != "" && globalStatus != "Inactive"',
    sort: 'name',
  });

  const perfRosters = await rosterService.getEventRoster(linkedPerfId);
  const performingProfileIds = new Set(
    perfRosters.filter(r => r.rsvp === 'Yes').map(r => r.profile)
  );

  const eventRosters = await rosterService.getEventRoster(eventId);
  const eventRosterMap = new Map(eventRosters.map(r => [r.profile, r]));

  await Promise.all(
    activeProfiles.map(async (profile) => {
      if (performingProfileIds.has(profile.id)) {
        const roster = eventRosterMap.get(profile.id);
        if (!roster) {
          await pb.collection('eventRosters').create({
            event: eventId,
            profile: profile.id,
            rsvp: 'Pending',
            attendance: 'Absent'
          });
        } else if (roster.attendance === 'Pending') {
          await pb.collection('eventRosters').update(roster.id, {
            attendance: 'Absent'
          });
        }
      }
    })
  );
}

export async function triggerAttendanceReport(eventId: string): Promise<MessageRecord> {
  const event = await pb.collection('events').getOne<Event>(eventId, { expand: 'venue' });
  const commSettings = await settingsService.getCommunicationSettings();
  const rosterSettings = await settingsService.getRosterSettings();
  const maxRehearsalMisses = rosterSettings?.maxRehearsalMisses ?? 3;
  const recipients = await resolveAttendanceReportRecipients();

  if (recipients.length === 0) {
    throw new Error(
      'No admins are configured to receive attendance reports. Enable attendance reports on at least one admin profile.'
    );
  }

  const isPerformance = event.type === 'Performance';
  const linkedPerfId = isPerformance ? event.id : event.parentPerformanceId;

  // 1. Auto-finalize unmarked attendance to 'Absent' for performing singers
  await finalizeUnmarkedAttendanceForEvent(eventId);

  // Aggregate Attendance (re-fetched after auto-finalization)
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

  // Calculate threshold warnings section (only past rehearsals)
  let thresholdWarningsSection = '';
  if (linkedPerfId) {
    const cycleRehearsals = await pb.collection('events').getFullList<Event>({
      filter: pb.filter('parentPerformanceId = {:perfId} && type = "Rehearsal"', { perfId: linkedPerfId }),
      sort: 'date'
    });

    if (cycleRehearsals.length > 0) {
      const now = new Date();
      const pastRehearsals = cycleRehearsals.filter(r => new Date(r.date) <= now);

      if (pastRehearsals.length > 0) {
        const pastRehearsalIds = pastRehearsals.map(r => r.id);
        const activeProfiles = await pb.collection('profiles').getFullList<Profile>({
          filter: 'voicePart != "" && globalStatus != "Inactive"',
          sort: 'name',
        });
        const perfRosters = await rosterService.getEventRoster(linkedPerfId);
        const performingProfileIds = new Set(
          perfRosters.filter(r => r.rsvp === 'Yes').map(r => r.profile)
        );

        const exceededSingers: { name: string; missCount: number }[] = [];

        const pastRehearsalsRosters = await Promise.all(
          pastRehearsalIds.map(rehId => rosterService.getEventRoster(rehId))
        );

        for (const profile of activeProfiles) {
          if (performingProfileIds.has(profile.id)) {
            let missCount = 0;
            pastRehearsals.forEach((_, index) => {
              const rehRosters = pastRehearsalsRosters[index];
              const r = rehRosters.find(x => x.profile === profile.id);
              
              const wasDeclined = r?.rsvp === 'No';
              const wasAbsent = r?.attendance === 'Absent';
              const notMarkedPresent = r?.attendance !== 'Present';

              if (wasDeclined || wasAbsent || notMarkedPresent) {
                missCount++;
              }
            });

            if (missCount > maxRehearsalMisses) {
              exceededSingers.push({ name: profile.name, missCount });
            }
          }
        }

        if (exceededSingers.length > 0) {
          thresholdWarningsSection = `
            <div style="margin-top: 20px; padding: 15px; background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; color: #b45309;">
              <h4 style="margin: 0 0 10px 0; font-size: 16px; color: #b45309;">Singers Exceeding Rehearsal Miss Limit</h4>
              <ul style="padding-left: 20px; margin: 0;">
                ${exceededSingers.map(s => `<li style="margin-bottom: 4px;"><strong>${escapeHtml(s.name)}</strong>: ${s.missCount} missed rehearsals (Limit: ${maxRehearsalMisses})</li>`).join('')}
              </ul>
            </div>
          `;
        }
      }
    }
  }

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
    thresholdWarningsSection,
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

  return await messageRepository.saveMessage({
    subject,
    content: body,
    type: 'Email',
    recipients,
    filters: { alreadySent: false, type: 'Attendance Report', eventId: event.id },
    status: 'Sent' as const,
  });
}
