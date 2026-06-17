import { pb } from '../lib/pocketbase';
import { type Event } from './eventService';
import { rosterService } from './rosterService';
import { profileService } from './profileService';

interface SingerReport {
  profileId: string;
  name: string;
  voicePart: string;
  absences: number;
  presenceCount: number;
  totalEvents: number;
  attendanceRate: number;
}

export interface ConcertSummary {
  performance: Event;
  rehearsals: Event[];
  totalRehearsals: number;
  avgAttendanceRate: number;
  singerReports: SingerReport[];
}

export const reportService = {
  async getPerformances(): Promise<Event[]> {
    return await pb.collection('events').getFullList<Event>({
      filter: 'type = "Performance" && isArchived != true',
      sort: '-date',
    });
  },

  async getConcertSummary(performanceId: string): Promise<ConcertSummary> {
    // 1. Get the performance itself
    const performance = await pb.collection('events').getOne<Event>(performanceId);

    // 2. Get all rehearsals for this performance
    const rehearsals = await pb.collection('events').getFullList<Event>({
      filter: pb.filter('parentPerformanceId = {:performanceId} && type = "Rehearsal"', {
        performanceId,
      }),
      sort: 'date',
    });

    // 3. Get all rosters for these rehearsals
    const rehearsalIds = rehearsals.map((r) => r.id);
    if (rehearsalIds.length === 0) {
      return {
        performance,
        rehearsals: [],
        totalRehearsals: 0,
        avgAttendanceRate: 0,
        singerReports: [],
      };
    }

    // Fetch all rosters in a single batched query
    const allRostersFlat = await rosterService.getEventRostersBatch(rehearsalIds);

    // 4. Get all profiles for name/voicePart mapping
    const profiles = await profileService.getProfiles();
    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    // 5. Aggregate data by singer
    const singerStats = new Map<
      string,
      { absences: number; presenceCount: number; total: number }
    >();

    for (const item of allRostersFlat) {
      const stats = singerStats.get(item.profile) || { absences: 0, presenceCount: 0, total: 0 };
      stats.total++;
      if (item.attendance === 'Absent') {
        stats.absences++;
      } else if (item.attendance === 'Present') {
        stats.presenceCount++;
      }
      singerStats.set(item.profile, stats);
    }

    const singerReports: SingerReport[] = Array.from(singerStats.entries())
      .map(([profileId, stats]) => {
        const profile = profileMap.get(profileId);
        return {
          profileId,
          name: profile?.name || 'Unknown',
          voicePart: profile?.voicePart || 'Unknown',
          absences: stats.absences,
          presenceCount: stats.presenceCount,
          totalEvents: stats.total,
          attendanceRate: stats.total > 0 ? (stats.presenceCount / stats.total) * 100 : 0,
        };
      })
      .sort((a, b) => b.absences - a.absences || a.name.localeCompare(b.name));

    // 6. Calculate summary metrics
    const totalAttendanceRates = singerReports.map((r) => r.attendanceRate);
    const avgAttendanceRate =
      totalAttendanceRates.length > 0
        ? totalAttendanceRates.reduce((a, b) => a + b, 0) / totalAttendanceRates.length
        : 0;

    return {
      performance,
      rehearsals,
      totalRehearsals: rehearsals.length,
      avgAttendanceRate,
      singerReports,
    };
  },
};
