import { useMemo } from 'react';
import type { Event, SetListItem } from '../services/eventService';

export interface PiecePerformanceEntry {
  count: number;
  dates: Date[];
  mostRecentDate: string | null;
}

function updatePiecePerformanceEntry(
  map: Map<string, PiecePerformanceEntry>,
  item: SetListItem,
  eventDate: Date
) {
  if (!item.pieceId) return;

  let entry = map.get(item.pieceId);
  if (!entry) {
    entry = { count: 0, dates: [], mostRecentDate: null };
    map.set(item.pieceId, entry);
  }

  entry.count++;
  entry.dates.push(eventDate);

  const dateStr = eventDate.toISOString().split('T')[0];
  if (!entry.mostRecentDate || dateStr > entry.mostRecentDate) {
    entry.mostRecentDate = dateStr;
  }
}

export function buildPiecePerformanceMap(events: Event[]): Map<string, PiecePerformanceEntry> {
  const map = new Map<string, PiecePerformanceEntry>();

  for (const event of events) {
    if (!event.setList || !Array.isArray(event.setList)) continue;
    if (!event.date) continue;

    const eventDate = new Date(event.date);
    if (isNaN(eventDate.getTime())) continue;

    for (const item of event.setList) {
      updatePiecePerformanceEntry(map, item, eventDate);
    }
  }

  return map;
}

export function usePiecePerformanceMap(events: Event[]): Map<string, PiecePerformanceEntry> {
  return useMemo(() => buildPiecePerformanceMap(events), [events]);
}
