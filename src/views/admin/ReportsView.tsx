import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { reportService } from '../../services/reportService';
import { musicLibraryService, type MusicPiece } from '../../services/musicLibraryService';
import { useEvents } from '../../hooks/useEvents';
import { Button, Select, DataTable, type ColumnDef } from '../../components/ui';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';

type ReportTab = 'attendance' | 'repertoire';

interface SingerReport {
  profileId: string;
  name: string;
  voicePart: string;
  absences: number;
  presenceCount: number;
  totalEvents: number;
  attendanceRate: number;
}

interface RepertoireStats {
  piece: MusicPiece;
  totalPerformances: number;
  lastPerformed: Date | null;
  allDates: Date[];
}

export default function ReportsView() {
  const [tab, setTab] = useState<ReportTab>('attendance');
  const [selectedPerformanceId, setSelectedPerformanceId] = useState<string>('');

  // ── Attendance queries ──
  const performancesQuery = useQuery({
    queryKey: queryKeys.reports.performances,
    queryFn: reportService.getPerformances,
  });

  const concertSummaryQuery = useQuery({
    queryKey: queryKeys.reports.concertSummary(selectedPerformanceId),
    queryFn: () => reportService.getConcertSummary(selectedPerformanceId),
    enabled: !!selectedPerformanceId,
  });

  // ── Repertoire queries ──
  const { events: allEvents } = useEvents();

  const libraryQuery = useQuery({
    queryKey: queryKeys.reports.musicLibrary,
    queryFn: musicLibraryService.getLibrary,
    enabled: tab === 'repertoire',
  });

  const performances = performancesQuery.data ?? [];
  const concertSummary = concertSummaryQuery.data ?? null;
  const library = useMemo(() => libraryQuery.data ?? [], [libraryQuery.data]);
  const isAttendanceLoading = performancesQuery.isLoading;
  const isRepertoireLoading = libraryQuery.isLoading || performancesQuery.isLoading;
  const error = performancesQuery.error
    ? performancesQuery.error instanceof Error
      ? performancesQuery.error.message
      : 'Failed to load'
    : null;

  const repertoireStats = useMemo(() => {
    if (library.length === 0) return [];

    const stats: RepertoireStats[] = [];

    library.forEach((piece) => {
      const dates: Date[] = [];

      // 1. Add historical dates from the linked performances
      if (piece.expand?.performances) {
        piece.expand.performances.forEach((perf) => {
          if (perf.date) {
            const d = new Date(perf.date);
            if (!isNaN(d.getTime())) dates.push(d);
          }
        });
      }

      // 2. Add dynamic dates from events where this piece is in the set list
      allEvents.forEach((event) => {
        if (event.setList && event.setList.some((item) => item.pieceId === piece.id)) {
          const d = new Date(event.date);
          if (!isNaN(d.getTime())) dates.push(d);
        }
      });

      // Sort dates descending
      dates.sort((a, b) => b.getTime() - a.getTime());

      stats.push({
        piece,
        totalPerformances: dates.length,
        lastPerformed: dates.length > 0 ? dates[0] : null,
        allDates: dates,
      });
    });

    // Sort by most recently performed, then by title
    return stats.sort((a, b) => {
      if (a.lastPerformed && b.lastPerformed) {
        return b.lastPerformed.getTime() - a.lastPerformed.getTime();
      }
      if (a.lastPerformed) return -1;
      if (b.lastPerformed) return 1;
      return a.piece.title.localeCompare(b.piece.title);
    });
  }, [library, allEvents]);

  const attendanceColumns: ColumnDef<SingerReport>[] = [
    {
      id: 'singer',
      header: 'Singer',
      accessorKey: 'name',
      cardSection: 0,
      cardSide: 'left',
    },
    {
      id: 'part',
      header: 'Part',
      accessorKey: 'voicePart',
      cardSection: 1,
      cardSide: 'left',
      cardLabel: 'Part',
    },
    {
      id: 'absences',
      header: 'Absences',
      align: 'center',
      cell: (_, row) =>
        row.absences >= 2 ? (
          <span className="bg-danger-bg text-danger-text inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold tracking-wider uppercase">
            {row.absences}
          </span>
        ) : (
          row.absences
        ),
      cardSection: 0,
      cardSide: 'right',
    },
    {
      id: 'present',
      header: 'Present',
      align: 'center',
      cell: (_, row) => `${row.presenceCount} / ${row.totalEvents}`,
      cardSection: 1,
      cardSide: 'left',
      cardLabel: 'Present',
    },
    {
      id: 'rate',
      header: 'Rate',
      align: 'center',
      cell: (_, row) => `${row.attendanceRate.toFixed(1)}%`,
      cardSection: 1,
      cardSide: 'right',
      cardLabel: 'Rate',
    },
  ];

  const repertoireColumns: ColumnDef<RepertoireStats>[] = [
    {
      id: 'title',
      header: 'Title',
      cell: (_, row) => <strong>{row.piece.title}</strong>,
      cardSection: 0,
      cardSide: 'left',
    },
    {
      id: 'composer',
      header: 'Composer',
      cell: (_, row) => row.piece.composer || '-',
      cardSection: 1,
      cardSide: 'left',
      cardLabel: 'Composer',
    },
    {
      id: 'arranger',
      header: 'Arranger',
      cell: (_, row) => row.piece.arranger || '-',
      cardSection: 1,
      cardSide: 'left',
      cardLabel: 'Arranger',
    },
    {
      id: 'totalPerformances',
      header: 'Total Performances',
      align: 'center',
      cell: (_, row) => (
        <span className="bg-danger-bg text-danger-text inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold tracking-wider uppercase">
          {row.totalPerformances}
        </span>
      ),
      cardSection: 0,
      cardSide: 'right',
    },
    {
      id: 'lastPerformed',
      header: 'Last Performed',
      cell: (_, row) => (row.lastPerformed ? row.lastPerformed.toLocaleDateString() : '-'),
      cardSection: 1,
      cardSide: 'right',
      cardLabel: 'Last Performed',
    },
  ];

  const handleExportCSV = () => {
    if (tab === 'attendance') {
      if (!concertSummary) return;
      const headers = [
        'Singer',
        'Voice Part',
        'Absences',
        'Presence Count',
        'Total Rehearsals',
        'Attendance Rate %',
      ];
      const rows = concertSummary.singerReports.map((r) => [
        r.name,
        r.voicePart,
        r.absences,
        r.presenceCount,
        r.totalEvents,
        r.attendanceRate.toFixed(1),
      ]);

      const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
      downloadCSV(
        csvContent,
        `attendance_report_${concertSummary.performance.title.replace(/\s+/g, '_')}.csv`
      );
    } else {
      const headers = [
        'Title',
        'Composer',
        'Arranger',
        'Catalog ID',
        'Total Performances',
        'Last Performed',
      ];
      const rows = repertoireStats.map((s) => [
        `"${s.piece.title.replace(/"/g, '""')}"`,
        `"${(s.piece.composer || '').replace(/"/g, '""')}"`,
        `"${(s.piece.arranger || '').replace(/"/g, '""')}"`,
        `"${(s.piece.catalogId || '').replace(/"/g, '""')}"`,
        s.totalPerformances,
        s.lastPerformed ? s.lastPerformed.toLocaleDateString() : 'Never',
      ]);
      const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
      downloadCSV(csvContent, 'repertoire_history_report.csv');
    }
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => window.print();

  return (
    <div className="flex flex-col gap-8 py-8">
      <AdminPageHeader
        title="Reports & Insights"
        description="Review attendance, repertoire, and engagement reports."
        below={
          <div className="flex w-full border-b border-slate-200 pb-px">
            <div className="flex gap-3">
              <button
                type="button"
                className={`flex min-h-[44px] cursor-pointer items-center justify-center border-b-2 px-1 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  tab === 'attendance'
                    ? 'border-primary text-primary font-bold'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900'
                }`}
                onClick={() => setTab('attendance')}
              >
                Attendance
              </button>
              <button
                type="button"
                className={`flex min-h-[44px] cursor-pointer items-center justify-center border-b-2 px-1 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  tab === 'repertoire'
                    ? 'border-primary text-primary font-bold'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900'
                }`}
                onClick={() => setTab('repertoire')}
              >
                Repertoire History
              </button>
            </div>
          </div>
        }
      />

      {tab === 'attendance' && (
        <div className="flex flex-col gap-8">
          {/* Selection Header */}
          <div className="no-print border-border bg-surface rounded-xl border p-6 shadow-sm">
            <div className="flex flex-col justify-between md:flex-row">
              <div className="flex flex-col gap-1">
                <label className="text-label text-muted">Select Concert / Performance</label>
                <Select
                  value={selectedPerformanceId}
                  onChange={(e) => setSelectedPerformanceId(e.target.value)}
                >
                  <option value="">-- Choose a performance --</option>
                  {performances.map((p) => (
                    <option key={p.id} value={p.id}>
                      {new Date(p.date).toLocaleDateString()} - {p.title}
                    </option>
                  ))}
                </Select>
              </div>

              {concertSummary && (
                <div className="flex flex-row gap-2">
                  <Button onClick={handleExportCSV} variant="secondary" size="small">
                    <span aria-hidden="true">📥</span>
                    <span>Download CSV</span>
                  </Button>
                  <Button onClick={handlePrint} variant="outline" size="small">
                    <span aria-hidden="true">🖨️</span>
                    <span>Print Report</span>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-danger-bg text-danger-text w-full rounded p-4 text-xs font-semibold">
              {error}
            </div>
          )}

          {isAttendanceLoading && (
            <div className="p-8 text-center">
              <div className="text-muted">Calculating attendance insights...</div>
            </div>
          )}

          {!isAttendanceLoading && concertSummary && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6">
                <div className="border-border bg-surface rounded-xl border p-6 text-center shadow-sm">
                  <div className="text-muted mb-1 text-xs uppercase">Rehearsals</div>
                  <div className="text-display text-primary">{concertSummary.totalRehearsals}</div>
                </div>
                <div className="border-border bg-surface rounded-xl border p-6 text-center shadow-sm">
                  <div className="text-muted mb-1 text-xs uppercase">Avg Attendance</div>
                  <div className="text-display text-primary">
                    {concertSummary.avgAttendanceRate.toFixed(1)}%
                  </div>
                </div>
                <div className="border-border bg-surface rounded-xl border p-6 text-center shadow-sm">
                  <div className="text-muted mb-1 text-xs uppercase">Total Singers</div>
                  <div className="text-display text-primary">
                    {concertSummary.singerReports.length}
                  </div>
                </div>
                <div className="border-border bg-surface rounded-xl border p-6 text-center shadow-sm">
                  <div className="text-muted mb-1 text-xs uppercase">2+ Absences</div>
                  <div className="text-display text-danger-text">
                    {concertSummary.singerReports.filter((r) => r.absences >= 2).length}
                  </div>
                </div>
              </div>

              {/* Detailed Table */}
              <div className="border-border bg-surface overflow-hidden rounded-xl border p-0 shadow-sm">
                <div className="no-print border-border border-b p-6">
                  <h3>Singer Attendance Detail</h3>
                  <p className="text-muted">
                    Singers with 2 or more absences are highlighted in red.
                  </p>
                </div>
                <DataTable
                  columns={attendanceColumns}
                  data={concertSummary.singerReports}
                  isLoading={false}
                  emptyState={{
                    title: 'No attendance records found.',
                    icon: '📊',
                  }}
                  manualPagination
                  getRowId={(r) => r.profileId}
                  getRowClassName={(r) => (r.absences >= 2 ? 'bg-danger-bg text-danger-text' : '')}
                />
              </div>

              <div className="hidden print:block">
                <h2 className="text-center">
                  Attendance Report: {concertSummary.performance.title}
                </h2>
                <p className="text-center">
                  Date: {new Date(concertSummary.performance.date).toLocaleDateString()}
                </p>
              </div>
            </>
          )}

          {!selectedPerformanceId && !isAttendanceLoading && (
            <div className="border-border bg-surface flex flex-col items-center justify-center gap-2 rounded-xl border p-8 text-center shadow-sm">
              <div className="mb-4 text-5xl">📊</div>
              <h3>No Performance Selected</h3>
              <p className="text-muted">
                Choose a performance from the dropdown above to analyze attendance data for its
                associated rehearsals.
              </p>
            </div>
          )}
        </div>
      )}

      {tab === 'repertoire' && (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col justify-between md:flex-row">
            <div>
              <h3>Repertoire History</h3>
              <p className="text-muted">
                A consolidated view of all library pieces and their performance dates.
              </p>
            </div>
            <div className="flex flex-row gap-2">
              <Button
                onClick={handleExportCSV}
                variant="secondary"
                size="small"
                disabled={isRepertoireLoading || repertoireStats.length === 0}
              >
                📥 Download CSV
              </Button>
              <Button
                onClick={handlePrint}
                variant="outline"
                size="small"
                disabled={isRepertoireLoading || repertoireStats.length === 0}
              >
                <span aria-hidden="true">🖨️</span>
                <span>Print Report</span>
              </Button>
            </div>
          </div>

          <DataTable
            columns={repertoireColumns}
            data={repertoireStats}
            isLoading={isRepertoireLoading}
            emptyState={{
              title: 'No pieces in the music library.',
              icon: '🎵',
            }}
            manualPagination
            getRowId={(r) => r.piece.id}
          />
        </div>
      )}
    </div>
  );
}
