import { getLastName } from '../stringUtils';
import { getSectionFromVoicePart } from '../voicePartUtils';
import {
  getRsvpExportGroupLabel,
  type RsvpStatus,
} from './rsvpLabels';

export type RsvpExportSort = 'lastName' | 'section';

export interface EventRosterExportEvent {
  title?: string;
  type?: string;
}

interface EventRosterExportProfile {
  name: string;
  voicePart?: string;
  isSectionLeader?: boolean;
}

export interface EventRosterExportSinger {
  profile: EventRosterExportProfile;
  rsvp: RsvpStatus;
}

interface EventRosterExportVoicePart {
  label: string;
  sectionCode: string;
}

interface EventRosterExportSection {
  code: string;
  name: string;
}

export interface BuildEventRosterCsvArgs {
  event: EventRosterExportEvent;
  singers: EventRosterExportSinger[];
  voiceParts: EventRosterExportVoicePart[];
  sections: EventRosterExportSection[];
  sort: RsvpExportSort;
}

export function quoteCsvValue(value: string): string {
  let val = (value || '').replace(/"/g, '""');
  if (val.match(/^[=+\-@]/)) {
    val = "'" + val;
  }
  return `"${val}"`;
}

export function buildEventRosterExportFilename(
  event: EventRosterExportEvent
): string {
  const sanitizedTitle = (event.title || event.type || 'event')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_');

  return `${sanitizedTitle}_rsvp_export.csv`;
}

export function buildEventRosterCsv(args: BuildEventRosterCsvArgs): string {
  const { event, singers, voiceParts, sections, sort } = args;

  const getSectionIndex = (voicePart?: string) => {
    if (!voicePart) return 999;
    const vpDef = voiceParts.find(vp => vp.label === voicePart);
    const secCode = vpDef ? vpDef.sectionCode : getSectionFromVoicePart(voicePart);
    const idx = sections.findIndex(s => s.code === secCode);
    return idx === -1 ? 999 : idx;
  };

  const getSingerSectionName = (voicePart?: string) => {
    if (!voicePart) return 'Unassigned';
    const vpDef = voiceParts.find(vp => vp.label === voicePart);
    const secCode = vpDef ? vpDef.sectionCode : getSectionFromVoicePart(voicePart);
    const secDef = sections.find(s => s.code === secCode);
    return secDef ? secDef.name : secCode;
  };

  const sortGroup = (items: EventRosterExportSinger[]) =>
    [...items].sort((a, b) => {
      if (sort === 'section') {
        const idxA = getSectionIndex(a.profile.voicePart);
        const idxB = getSectionIndex(b.profile.voicePart);
        if (idxA !== idxB) return idxA - idxB;
      }
      const lastA = getLastName(a.profile.name);
      const lastB = getLastName(b.profile.name);
      const cmp = lastA.localeCompare(lastB);
      if (cmp !== 0) return cmp;
      return a.profile.name.localeCompare(b.profile.name);
    });

  const rsvpGroups: Array<{ label: string; status: RsvpStatus }> = [
    { label: getRsvpExportGroupLabel('Yes'), status: 'Yes' },
    { label: getRsvpExportGroupLabel('No'), status: 'No' },
    { label: getRsvpExportGroupLabel('Pending'), status: 'Pending' },
  ];

  const csvLines: string[] = [];
  const header = ['Name', 'Section', 'Voice Part', 'Event Title', 'RSVP Status'].join(',');
  csvLines.push(header);

  let firstGroup = true;
  rsvpGroups.forEach((group) => {
    const groupSingers = singers.filter(s => s.rsvp === group.status);
    if (groupSingers.length === 0) return;

    if (!firstGroup) csvLines.push('');
    firstGroup = false;
    csvLines.push([quoteCsvValue(group.label), '', '', '', ''].join(','));

    sortGroup(groupSingers).forEach(s => {
      csvLines.push([
        quoteCsvValue(s.profile.name),
        quoteCsvValue(getSingerSectionName(s.profile.voicePart)),
        quoteCsvValue(s.profile.voicePart || 'Not sure'),
        quoteCsvValue(event.title || event.type || 'Event'),
        quoteCsvValue(s.rsvp),
      ].join(','));
    });
  });

  const sectionLeaders = singers.filter(s => s.profile.isSectionLeader === true);
  if (sectionLeaders.length > 0) {
    csvLines.push('');
    csvLines.push('Section Leaders');
    csvLines.push(header);
    sortGroup(sectionLeaders).forEach(s => {
      csvLines.push([
        quoteCsvValue(s.profile.name),
        quoteCsvValue(getSingerSectionName(s.profile.voicePart)),
        quoteCsvValue(s.profile.voicePart || 'Not sure'),
        quoteCsvValue(event.title || event.type || 'Event'),
        quoteCsvValue(s.rsvp),
      ].join(','));
    });
  }

  return csvLines.join('\n');
}
