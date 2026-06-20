import type { EventRoster } from '../services/rosterService';

export function upsertRosterRow(
  rows: EventRoster[] | undefined,
  roster: EventRoster
): EventRoster[] {
  const existingRows = rows ?? [];

  const withoutDuplicate = existingRows.filter(
    (r) => r.id !== roster.id && r.profile !== roster.profile
  );

  return [...withoutDuplicate, roster];
}

export function removeRosterRow(
  rows: EventRoster[] | undefined,
  roster: EventRoster
): EventRoster[] {
  const existingRows = rows ?? [];

  return existingRows.filter((r) => r.id !== roster.id && r.profile !== roster.profile);
}
