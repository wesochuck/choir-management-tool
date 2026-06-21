import { useMemo } from 'react';
import type { Event } from '../services/eventService';

export interface PiecePerformanceEntry {
  count: number;
  dates: Date[];
  mostRecentDate: string | null;
}

export function buildPiecePerformanceMap(events: Event[]): Map<string, PiecePerformanceEntry> {
  const map = new Map<string, PiecePerformanceEntry>();

  for (const event of events) {
    if (!event.setList || !Array.isArray(event.setList)) continue;
    if (!event.date) continue;

    const eventDate = new Date(event.date);
    if (isNaN(eventDate.getTime())) continue;

    for (const item of event.setList) {
      if (!item.pieceId) continue;

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
  }

  return map;
}

export function usePiecePerformanceMap(events: Event[]): Map<string, PiecePerformanceEntry> {
  return useMemo(() => buildPiecePerformanceMap(events), [events]);
}
