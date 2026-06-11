import { useState, useEffect, useMemo } from 'react';
import { reportService, type ConcertSummary } from '../../services/reportService';
import { eventService, type Event } from '../../services/eventService';
import { musicLibraryService, type MusicPiece } from '../../services/musicLibraryService';

type ReportTab = 'attendance' | 'repertoire';

interface RepertoireStats {
  piece: MusicPiece;
  totalPerformances: number;
  lastPerformed: Date | null;
  allDates: Date[];
}

export default function ReportsView() {
  const [tab, setTab] = useState<ReportTab>('attendance');

  // Attendance State
  const [performances, setPerformances] = useState<Event[]>([]);
  const [selectedPerformanceId, setSelectedPerformanceId] = useState<string>('');
  const [summary, setSummary] = useState<ConcertSummary | null>(null);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Repertoire State
  const [library, setLibrary] = useState<MusicPiece[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [isRepertoireLoading, setIsRepertoireLoading] = useState(false);

  useEffect(() => {
    reportService.getPerformances()
      .then(setPerformances)
      .catch(() => setError('Failed to load performances.'));
  }, []);

  useEffect(() => {
    if (!selectedPerformanceId) {
      setSummary(null);
      return;
    }

    setIsAttendanceLoading(true);
    setError(null);
    reportService.getConcertSummary(selectedPerformanceId)
      .then(setSummary)
      .catch(() => setError('Failed to load concert summary.'))
      .finally(() => setIsAttendanceLoading(false));
  }, [selectedPerformanceId]);

  useEffect(() => {
    if (tab === 'repertoire' && library.length === 0) {
      setIsRepertoireLoading(true);
      Promise.all([
        musicLibraryService.getLibrary(),
        eventService.getEvents()
      ])
      .then(([libData, eventData]) => {
        setLibrary(libData);
        setAllEvents(eventData.filter(e => e.type === 'Performance'));
      })
      .finally(() => setIsRepertoireLoading(false));
    }
  }, [tab, library.length]);

  const repertoireStats = useMemo(() => {
    if (library.length === 0) return [];

    const stats: RepertoireStats[] = [];

    library.forEach(piece => {
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
      allEvents.forEach(event => {
        if (event.setList && event.setList.some(item => item.pieceId === piece.id)) {
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
        allDates: dates
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


  const handleExportCSV = () => {
    if (tab === 'attendance') {
        if (!summary) return;
        const headers = ['Singer', 'Voice Part', 'Absences', 'Presence Count', 'Total Rehearsals', 'Attendance Rate %'];
        const rows = summary.singerReports.map(r => [
        r.name,
        r.voicePart,
        r.absences,
        r.presenceCount,
        r.totalEvents,
        r.attendanceRate.toFixed(1)
        ]);

        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        downloadCSV(csvContent, `attendance_report_${summary.performance.title.replace(/\s+/g, '_')}.csv`);
    } else {
        const headers = ['Title', 'Composer', 'Arranger', 'Catalog ID', 'Total Performances', 'Last Performed'];
        const rows = repertoireStats.map(s => [
            `"${s.piece.title.replace(/"/g, '""')}"`,
            `"${(s.piece.composer || '').replace(/"/g, '""')}"`,
            `"${(s.piece.arranger || '').replace(/"/g, '""')}"`,
            `"${(s.piece.catalogId || '').replace(/"/g, '""')}"`,
            s.totalPerformances,
            s.lastPerformed ? s.lastPerformed.toLocaleDateString() : 'Never'
        ]);
        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
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
  }

  const handlePrint = () => window.print();

  return (
    <div className="flex-col gap-8 py-8">
      <div className="flex flex-col items-center justify-between md:flex-row">
        <h1 className="text-display m-0">Reports & Insights</h1>
        <div className="flex-row gap-2">
            <button className={`btn ${tab === 'attendance' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('attendance')}>
                Attendance
            </button>
            <button className={`btn ${tab === 'repertoire' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('repertoire')}>
                Repertoire History
            </button>
        </div>
      </div>

      {tab === 'attendance' && (
        <div className="flex-col gap-8">
          {/* Selection Header */}
          <div className="no-print bg-surface border border-border rounded-xl shadow-sm p-6">
            <div className="flex flex-col justify-between md:flex-row">
              <div className="flex-col gap-1">
                <label className="text-label text-muted">Select Concert / Performance</label>
                <select 
                  className="bg-surface border border-border rounded-md outline-none transition-colors focus:border-primary h-10 w-[300px] px-3"
                  value={selectedPerformanceId}
                  onChange={(e) => setSelectedPerformanceId(e.target.value)}
                >
                  <option value="">-- Choose a performance --</option>
                  {performances.map(p => (
                    <option key={p.id} value={p.id}>
                      {new Date(p.date).toLocaleDateString()} - {p.title}
                    </option>
                  ))}
                </select>
              </div>

              {summary && (
                <div className="flex-row">
                  <button onClick={handleExportCSV} className="btn btn-secondary btn-sm">
                    <span>📥</span> Download CSV
                  </button>
                  <button onClick={handlePrint} className="btn btn-ghost btn-sm">
                    <span>🖨️</span> Print Report
                  </button>
                </div>
              )}
            </div>
          </div>

          {error && <div className="w-full rounded bg-danger-bg p-4 text-xs font-semibold text-danger-text">{error}</div>}

          {isAttendanceLoading && (
            <div className="p-8 text-center">
              <div className="text-muted">Calculating attendance insights...</div>
            </div>
          )}

          {!isAttendanceLoading && summary && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6">
                <div className="bg-surface border border-border rounded-xl shadow-sm p-6 text-center">
                  <div className="text-muted mb-1 text-xs uppercase">Rehearsals</div>
                  <div className="text-display text-primary">{summary.totalRehearsals}</div>
                </div>
                <div className="bg-surface border border-border rounded-xl shadow-sm p-6 text-center">
                  <div className="text-muted mb-1 text-xs uppercase">Avg Attendance</div>
                  <div className="text-display text-primary">{summary.avgAttendanceRate.toFixed(1)}%</div>
                </div>
                <div className="bg-surface border border-border rounded-xl shadow-sm p-6 text-center">
                  <div className="text-muted mb-1 text-xs uppercase">Total Singers</div>
                  <div className="text-display text-primary">{summary.singerReports.length}</div>
                </div>
                <div className="bg-surface border border-border rounded-xl shadow-sm p-6 text-center">
                  <div className="text-muted mb-1 text-xs uppercase">2+ Absences</div>
                  <div className="text-display text-danger-text">
                    {summary.singerReports.filter(r => r.absences >= 2).length}
                  </div>
                </div>
              </div>

              {/* Detailed Table */}
              <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden p-0">
                <div className="no-print border-b border-border p-6">
                  <h3>Singer Attendance Detail</h3>
                  <p className="text-muted">Singers with 2 or more absences are highlighted in red.</p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="table w-full border-collapse">
                    <thead>
                      <tr className="bg-primary-light text-left">
                        <th className="p-4">Singer</th>
                        <th className="p-4">Part</th>
                        <th className="p-4 text-center">Absences</th>
                        <th className="p-4 text-center">Present</th>
                        <th className="p-4 text-center">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.singerReports.map(report => (
                        <tr 
                          key={report.profileId} 
                          // @allow-inline-style - dynamic background and text color based on absence threshold
                          style={{ 
                            backgroundColor: report.absences >= 2 ? 'var(--color-danger-bg)' : 'transparent',
                            color: report.absences >= 2 ? 'var(--color-danger-text)' : 'inherit'
                          }}
                        >
                          <td className="border-b border-border p-4 font-semibold">{report.name}</td>
                          <td className="border-b border-border p-4">{report.voicePart}</td>
                          <td className="border-b border-border p-4 text-center">
                            <span className={report.absences >= 2 ? 'inline-flex items-center rounded bg-danger-bg px-2 py-0.5 text-xs font-semibold tracking-wider text-danger-text uppercase' : ''}>
                              {report.absences}
                            </span>
                          </td>
                          <td className="border-b border-border p-4 text-center">{report.presenceCount} / {report.totalEvents}</td>
                          <td className="border-b border-border p-4 text-center">{report.attendanceRate.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="hidden print:block">
                <h2 className="text-center">Attendance Report: {summary.performance.title}</h2>
                <p className="text-center">Date: {new Date(summary.performance.date).toLocaleDateString()}</p>
              </div>
            </>
          )}

          {!selectedPerformanceId && !isAttendanceLoading && (
            <div className="bg-surface border border-border rounded-xl shadow-sm p-8 text-center flex flex-col items-center justify-center gap-2">
              <div className="mb-4 text-5xl">📊</div>
              <h3>No Performance Selected</h3>
              <p className="text-muted">Choose a performance from the dropdown above to analyze attendance data for its associated rehearsals.</p>
            </div>
          )}
        </div>
      )}

      {tab === 'repertoire' && (
          <div className="flex-col gap-8">
            <div className="flex flex-col justify-between md:flex-row">
                <div>
                    <h3>Repertoire History</h3>
                    <p className="text-muted">A consolidated view of all library pieces and their performance dates.</p>
                </div>
                <div className="flex-row gap-2">
                    <button onClick={handleExportCSV} className="btn btn-secondary btn-sm" disabled={isRepertoireLoading || repertoireStats.length === 0}>
                        <span>📥</span> Download CSV
                    </button>
                    <button onClick={handlePrint} className="btn btn-ghost btn-sm" disabled={isRepertoireLoading || repertoireStats.length === 0}>
                        <span>🖨️</span> Print Report
                    </button>
                </div>
            </div>

            {isRepertoireLoading ? (
                 <div className="p-8 text-center">
                    <div className="text-muted">Loading repertoire data...</div>
                 </div>
            ) : repertoireStats.length === 0 ? (
                <div className="bg-surface border border-border rounded-xl shadow-sm p-8 text-center flex flex-col items-center justify-center gap-2">
                    <p className="text-muted">No pieces in the music library.</p>
                </div>
            ) : (
                <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden p-0">
                    <div className="overflow-x-auto">
                        <table className="table w-full border-collapse">
                            <thead>
                                <tr className="bg-primary-light text-left">
                                    <th className="p-4">Title</th>
                                    <th className="p-4">Composer</th>
                                    <th className="p-4">Arranger</th>
                                    <th className="p-4 text-center">Total Performances</th>
                                    <th className="p-4">Last Performed</th>
                                </tr>
                            </thead>
                            <tbody>
                                {repertoireStats.map(stat => (
                                    <tr key={stat.piece.id}>
                                        <td className="border-b border-border p-4"><strong>{stat.piece.title}</strong></td>
                                        <td className="border-b border-border p-4">{stat.piece.composer || '-'}</td>
                                        <td className="border-b border-border p-4">{stat.piece.arranger || '-'}</td>
                                        <td className="border-b border-border p-4 text-center">
                                            <span className="inline-flex items-center rounded bg-performance-bg px-2 py-0.5 text-xs font-semibold tracking-wider text-performance-text uppercase">{stat.totalPerformances}</span>
                                        </td>
                                        <td className="border-b border-border p-4">
                                            {stat.lastPerformed ? stat.lastPerformed.toLocaleDateString() : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
          </div>
      )}
    </div>
  );
}
