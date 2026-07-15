import type { PocketBaseApp, PocketBaseRecord } from '../email/emailTypes';
import type { MaintenanceState, MaintenanceTaskResult } from './maintenanceTypes';
import { finalizeUnmarkedAttendanceForEvent } from '../attendanceFinalizer';
import { parseJsonField } from '../email/hookJson';
import { coercePocketBaseDate } from '../pocketbaseDate';
import { sanitizeEmailSubject, escapeHtml } from '../email/hookText';
import { renderAttendanceReportBody } from '../email/attendanceReport';
import { parsePocketBaseDate } from '../rsvpValidation';

declare const Record: new (
  collection: unknown,
  data?: unknown
) => { id: string; set(field: string, value: unknown): void; get(field: string): unknown };

export function runPostEventReportTask(
  app: PocketBaseApp,
  state: MaintenanceState,
  now: Date
): MaintenanceTaskResult {
  const hoursAfter = 12;
  const end = new Date(now.getTime() - hoursAfter * 60 * 60 * 1000);
  const start = new Date(end.getTime() - 1 * 60 * 60 * 1000);

  const events = app.findRecordsByFilter(
    'events',
    'date >= {:start} && date < {:end} && isArchived != true',
    '-date',
    100,
    0,
    { start, end }
  );
  if (!events || events.length === 0) {
    return { task: 'postEventReport', status: 'ran', processed: 0, updated: 0, errors: 0 };
  }

  const admins = app.findRecordsByFilter('users', "role = 'admin'");
  if (!admins || admins.length === 0) {
    return {
      task: 'postEventReport',
      status: 'ran',
      processed: events.length,
      updated: 0,
      errors: 0,
    };
  }

  let commSettings = {
    mailingAddress: '123 Choir St, Harmony City, HC 12345',
    reportSubjectTemplate: 'Attendance Report: {eventTitle}',
    reportBodyTemplate: 'Report for {eventTitle}...',
  };
  try {
    const setting = app.findFirstRecordByFilter('appSettings', "key = 'communications'");
    const parsed = parseJsonField<{
      mailingAddress?: string;
      reportSubjectTemplate?: string;
      reportBodyTemplate?: string;
    }>(setting.get('value'));
    if (parsed) {
      if (parsed.mailingAddress) commSettings.mailingAddress = parsed.mailingAddress;
      if (parsed.reportSubjectTemplate)
        commSettings.reportSubjectTemplate = parsed.reportSubjectTemplate;
      if (parsed.reportBodyTemplate) commSettings.reportBodyTemplate = parsed.reportBodyTemplate;
    }
  } catch (e) {
    console.log('Warning: Failed to parse communications settings', e);
  }

  let updated = 0;
  let errors = 0;

  events.forEach((event) => {
    finalizeUnmarkedAttendanceForEvent(app, event);

    const isPerformance = event.get('type') === 'Performance';
    const linkedPerfId = isPerformance ? event.id : event.get('parentPerformanceId');

    let maxRehearsalMisses = 3;
    try {
      const rosterSettingRecord = app.findFirstRecordByFilter('appSettings', "key = 'roster'");
      const parsed = parseJsonField<{ maxRehearsalMisses?: string | number }>(
        rosterSettingRecord.get('value')
      );
      if (parsed && parsed.maxRehearsalMisses !== undefined) {
        maxRehearsalMisses = Number(parsed.maxRehearsalMisses);
      }
    } catch (e) {}

    const rosters = app.findRecordsByFilter(
      'eventRosters',
      'event = {:eventId}',
      'profile.name',
      500,
      0,
      { eventId: event.id }
    );
    if (!rosters || rosters.length === 0) return;

    const total = rosters.length;
    const present = rosters.filter((r) => r.get('attendance') === 'Present').length;
    const attendanceRate = total > 0 ? ((present / total) * 100).toFixed(1) : '0';
    const eventDateObj = coercePocketBaseDate(event.get('date'));
    const eventDateStr = eventDateObj
      ? eventDateObj.getMonth() +
        1 +
        '/' +
        eventDateObj.getDate() +
        '/' +
        eventDateObj.getFullYear()
      : '';
    const eventTitle = String(event.get('title') || '');
    const subject = sanitizeEmailSubject(
      commSettings.reportSubjectTemplate
        .replace(/{eventTitle}/g, () => eventTitle)
        .replace(/{eventDate}/g, () => eventDateStr)
    );

    let exceededLimitListHtml = '';
    if (linkedPerfId) {
      const cycleRehearsals = app.findRecordsByFilter(
        'events',
        "parentPerformanceId = {:perfId} && type = 'Rehearsal'",
        'date',
        200,
        0,
        { perfId: linkedPerfId }
      );

      if (cycleRehearsals && cycleRehearsals.length > 0) {
        const pastRehearsals = cycleRehearsals.filter(
          (r) => (parsePocketBaseDate(r.get('date')) || new Date(0)) <= now
        );

        if (pastRehearsals.length > 0) {
          const pastRehearsalIds = pastRehearsals.map((r) => r.id);
          const activeProfiles = app.findRecordsByFilter(
            'profiles',
            "voicePart != '' && globalStatus != 'Inactive'",
            'name',
            1000,
            0
          );
          const exceededSingers: { name: string; missCount: number }[] = [];

          const pastRehearsalRosters: PocketBaseRecord[] = [];
          const filterParts = pastRehearsalIds
            .map((_, i) => 'event = {:rid' + i + '}')
            .join(' || ');
          const filterParams: Record<string, string> = {};
          pastRehearsalIds.forEach((id, i) => {
            filterParams['rid' + i] = id;
          });
          try {
            const allRosters = app.findRecordsByFilter(
              'eventRosters',
              filterParts,
              '',
              5000,
              0,
              filterParams
            );
            pastRehearsalRosters.push(...(allRosters || []));
          } catch (e) {}

          const performingProfileIds: Record<string, boolean> = {};
          try {
            const perfRosters = app.findRecordsByFilter(
              'eventRosters',
              'event = {:perfId}',
              '',
              1000,
              0,
              { perfId: linkedPerfId }
            );
            if (perfRosters) {
              perfRosters.forEach((r) => {
                if (r.get('rsvp') === 'Yes') {
                  performingProfileIds[r.get('profile') as string] = true;
                }
              });
            }
          } catch (e) {}

          const pastRostersByProfile: Record<string, PocketBaseRecord[]> = {};
          pastRehearsalRosters.forEach((r) => {
            const profileId = r.get('profile') as string;
            if (!pastRostersByProfile[profileId]) {
              pastRostersByProfile[profileId] = [];
            }
            pastRostersByProfile[profileId].push(r);
          });

          activeProfiles.forEach((profile) => {
            if (!performingProfileIds[profile.id]) return;
            const profileRosters = pastRostersByProfile[profile.id] || [];
            let missCount = 0;
            pastRehearsals.forEach((reh) => {
              const r = profileRosters.find((x: PocketBaseRecord) => x.get('event') === reh.id);

              const wasDeclined = r ? r.get('rsvp') === 'No' : false;
              const wasAbsent = r ? r.get('attendance') === 'Absent' : false;
              const notMarkedPresent = r ? r.get('attendance') !== 'Present' : true;

              if (wasDeclined || wasAbsent || notMarkedPresent) {
                missCount++;
              }
            });

            if (missCount > maxRehearsalMisses) {
              exceededSingers.push({
                name: (profile.get('name') as string) || 'Unknown',
                missCount: missCount,
              });
            }
          });

          if (exceededSingers.length > 0) {
            exceededLimitListHtml = exceededSingers
              .map(
                (s) =>
                  '* **' +
                  s.name +
                  '**: ' +
                  s.missCount +
                  ' missed rehearsals (Limit: ' +
                  maxRehearsalMisses +
                  ')'
              )
              .join('\n');
          }
        }
      }
    }

    const performerLabel = (() => {
      try {
        const r = app.findFirstRecordByFilter('appSettings', "key = 'performer_label'");
        const v = r?.get('value');
        return typeof v === 'string' && v.trim() ? v.trim() : 'Performer';
      } catch {
        return 'Performer';
      }
    })();
    const performerLabelPlural = `${performerLabel}s`;

    const body = renderAttendanceReportBody({
      eventTitle: String(event.get('title') || ''),
      eventDate: eventDateStr,
      attendanceRate: attendanceRate,
      presentCount: present,
      totalCount: total,
      mailingAddress: commSettings.mailingAddress,
      exceededLimitListHtml: exceededLimitListHtml || undefined,
      performerLabelPlural,
    });

    try {
      const messageCollection = app.findCollectionByNameOrId('messages');
      const record = new Record(messageCollection, {
        subject,
        content: body,
        type: 'Email',
        status: 'Sent',
        recipients: admins.map((a) => ({
          id: a.id,
          name: a.get('name') || 'Admin',
          email: a.get('email'),
        })),
        filters: { type: 'Automated Report', eventId: event.id },
      });
      app.save(record);
      updated++;
    } catch (e) {
      console.log('[Cron Error] Failed to create attendance report message: ' + e);
      errors++;
    }
  });

  return {
    task: 'postEventReport',
    status: errors > 0 ? 'failed' : 'ran',
    processed: events.length,
    updated,
    errors,
  };
}
