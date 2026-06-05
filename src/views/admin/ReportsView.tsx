import { useState, useEffect, useMemo } from 'react';
import { reportService, type ConcertSummary } from '../../services/reportService';
import { eventService, type Event } from '../../services/eventService';
import { musicLibraryService, type MusicPiece } from '../../services/musicLibraryService';
import './Reports.css';

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
    <div className="flex-col report-container">
      <div className="flex-responsive report-header">
        <h1 className="text-display report-title">Reports & Insights</h1>
        <div className="flex-row report-tabs">
            <button className={`btn ${tab === 'attendance' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('attendance')}>
                Attendance
            </button>
            <button className={`btn ${tab === 'repertoire' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('repertoire')}>
                Repertoire History
            </button>
        </div>
      </div>

      {tab === 'attendance' && (
        <div className="flex-col report-section">
          {/* Selection Header */}
          <div className="card no-print">
            <div className="flex-responsive report-selection-header">
              <div className="flex-col report-select-group">
                <label className="text-label text-muted">Select Concert / Performance</label>
                <select 
                  className="card report-select"
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

          {error && <div className="badge badge-danger report-error">{error}</div>}

          {isAttendanceLoading && (
            <div className="report-loading">
              <div className="text-muted">Calculating attendance insights...</div>
            </div>
          )}

          {!isAttendanceLoading && summary && (
            <>
              {/* KPI Cards */}
              <div className="report-kpi-grid">
                <div className="card report-kpi-card">
                  <div className="text-muted text-xs report-kpi-label">Rehearsals</div>
                  <div className="text-display report-kpi-value">{summary.totalRehearsals}</div>
                </div>
                <div className="card report-kpi-card">
                  <div className="text-muted text-xs report-kpi-label">Avg Attendance</div>
                  <div className="text-display report-kpi-value">{summary.avgAttendanceRate.toFixed(1)}%</div>
                </div>
                <div className="card report-kpi-card">
                  <div className="text-muted text-xs report-kpi-label">Total Singers</div>
                  <div className="text-display report-kpi-value">{summary.singerReports.length}</div>
                </div>
                <div className="card report-kpi-card">
                  <div className="text-muted text-xs report-kpi-label">2+ Absences</div>
                  <div className="text-display report-kpi-value-danger">
                    {summary.singerReports.filter(r => r.absences >= 2).length}
                  </div>
                </div>
              </div>

              {/* Detailed Table */}
              <div className="card report-table-card">
                <div className="report-table-header no-print">
                  <h3>Singer Attendance Detail</h3>
                  <p className="text-muted">Singers with 2 or more absences are highlighted in red.</p>
                </div>
                
                <div className="report-table-scroll">
                  <table className="table report-table">
                    <thead>
                      <tr>
                        <th>Singer</th>
                        <th>Part</th>
                        <th className="text-center">Absences</th>
                        <th className="text-center">Present</th>
                        <th className="text-center">Rate</th>
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
                          <td className="font-bold">{report.name}</td>
                          <td>{report.voicePart}</td>
                          <td className="text-center">
                            <span className={report.absences >= 2 ? 'badge badge-danger' : ''}>
                              {report.absences}
                            </span>
                          </td>
                          <td className="text-center">{report.presenceCount} / {report.totalEvents}</td>
                          <td className="text-center">{report.attendanceRate.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="report-print-hide print-only">
                <style>{`
                  @media print {
                    .print-only { display: block !important; }
                    table { border: 1px solid black !important; }
                    th, td { border: 1px solid black !important; padding: 4px !important; }
                    .badge-danger { color: red !important; font-weight: bold !important; }
                  }
                `}</style>
                <h2 className="report-print-title">Attendance Report: {summary.performance.title}</h2>
                <p className="report-print-subtitle">Date: {new Date(summary.performance.date).toLocaleDateString()}</p>
              </div>
            </>
          )}

          {!selectedPerformanceId && !isAttendanceLoading && (
            <div className="card report-empty-state">
              <div className="report-empty-icon">📊</div>
              <h3>No Performance Selected</h3>
              <p className="text-muted">Choose a performance from the dropdown above to analyze attendance data for its associated rehearsals.</p>
            </div>
          )}
        </div>
      )}

      {tab === 'repertoire' && (
          <div className="flex-col report-section">
            <div className="flex-responsive report-repertoire-header">
                <div>
                    <h3>Repertoire History</h3>
                    <p className="text-muted">A consolidated view of all library pieces and their performance dates.</p>
                </div>
                <div className="flex-row report-tabs">
                    <button onClick={handleExportCSV} className="btn btn-secondary btn-sm" disabled={isRepertoireLoading || repertoireStats.length === 0}>
                        <span>📥</span> Download CSV
                    </button>
                    <button onClick={handlePrint} className="btn btn-ghost btn-sm" disabled={isRepertoireLoading || repertoireStats.length === 0}>
                        <span>🖨️</span> Print Report
                    </button>
                </div>
            </div>

            {isRepertoireLoading ? (
                 <div className="report-loading">
                    <div className="text-muted">Loading repertoire data...</div>
                 </div>
            ) : repertoireStats.length === 0 ? (
                <div className="card report-empty-state">
                    <p className="text-muted">No pieces in the music library.</p>
                </div>
            ) : (
                <div className="card report-table-card">
                    <div className="report-table-scroll">
                        <table className="table report-table">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Composer</th>
                                    <th>Arranger</th>
                                    <th className="text-center">Total Performances</th>
                                    <th>Last Performed</th>
                                </tr>
                            </thead>
                            <tbody>
                                {repertoireStats.map(stat => (
                                    <tr key={stat.piece.id}>
                                        <td><strong>{stat.piece.title}</strong></td>
                                        <td>{stat.piece.composer || '-'}</td>
                                        <td>{stat.piece.arranger || '-'}</td>
                                        <td className="text-center">
                                            <span className="badge badge-performance">{stat.totalPerformances}</span>
                                        </td>
                                        <td>
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
