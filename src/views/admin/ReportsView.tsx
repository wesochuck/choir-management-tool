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

      // 1. Add historical dates from the piece itself
      if (piece.historicalDates) {
        piece.historicalDates.forEach(dStr => {
          const d = new Date(dStr);
          if (!isNaN(d.getTime())) dates.push(d);
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
        const headers = ['Title', 'Composer', 'Catalog ID', 'Total Performances', 'Last Performed'];
        const rows = repertoireStats.map(s => [
            `"${s.piece.title.replace(/"/g, '""')}"`,
            `"${(s.piece.composer || '').replace(/"/g, '""')}"`,
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
    <div className="flex-col" style={{ gap: 'var(--space-xl)', padding: 'var(--space-xl) 0' }}>
      <div className="flex-responsive" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="text-display" style={{ margin: 0 }}>Reports & Insights</h1>
        <div className="flex-row" style={{ gap: 'var(--space-sm)' }}>
            <button className={`btn ${tab === 'attendance' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('attendance')}>
                Attendance
            </button>
            <button className={`btn ${tab === 'repertoire' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('repertoire')}>
                Repertoire History
            </button>
        </div>
      </div>

      {tab === 'attendance' && (
        <div className="flex-col" style={{ gap: 'var(--space-xl)' }}>
          {/* Selection Header */}
          <div className="card no-print">
            <div className="flex-responsive" style={{ justifyContent: 'space-between' }}>
              <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                <label className="text-label text-muted">Select Concert / Performance</label>
                <select 
                  className="card" 
                  style={{ width: '300px', height: '40px', padding: '0 12px' }}
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

          {error && <div className="badge badge-danger" style={{ padding: 'var(--space-md)', width: '100%' }}>{error}</div>}

          {isAttendanceLoading && (
            <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
              <div className="text-muted">Calculating attendance insights...</div>
            </div>
          )}

          {!isAttendanceLoading && summary && (
            <>
              {/* KPI Cards */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: 'var(--space-lg)' 
              }}>
                <div className="card" style={{ textAlign: 'center' }}>
                  <div className="text-muted text-xs" style={{ textTransform: 'uppercase', marginBottom: 'var(--space-xs)' }}>Rehearsals</div>
                  <div className="text-display" style={{ color: 'var(--primary)' }}>{summary.totalRehearsals}</div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                  <div className="text-muted text-xs" style={{ textTransform: 'uppercase', marginBottom: 'var(--space-xs)' }}>Avg Attendance</div>
                  <div className="text-display" style={{ color: 'var(--primary)' }}>{summary.avgAttendanceRate.toFixed(1)}%</div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                  <div className="text-muted text-xs" style={{ textTransform: 'uppercase', marginBottom: 'var(--space-xs)' }}>Total Singers</div>
                  <div className="text-display" style={{ color: 'var(--primary)' }}>{summary.singerReports.length}</div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                  <div className="text-muted text-xs" style={{ textTransform: 'uppercase', marginBottom: 'var(--space-xs)' }}>2+ Absences</div>
                  <div className="text-display" style={{ color: 'var(--color-danger-text)' }}>
                    {summary.singerReports.filter(r => r.absences >= 2).length}
                  </div>
                </div>
              </div>

              {/* Detailed Table */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: 'var(--space-lg)', borderBottom: '1px solid var(--border)' }} className="no-print">
                  <h3 style={{ margin: 0 }}>Singer Attendance Detail</h3>
                  <p className="text-muted" style={{ margin: 0 }}>Singers with 2 or more absences are highlighted in red.</p>
                </div>
                
                <div style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', backgroundColor: 'var(--primary-light)' }}>
                        <th style={{ padding: 'var(--space-md)' }}>Singer</th>
                        <th style={{ padding: 'var(--space-md)' }}>Part</th>
                        <th style={{ padding: 'var(--space-md)', textAlign: 'center' }}>Absences</th>
                        <th style={{ padding: 'var(--space-md)', textAlign: 'center' }}>Present</th>
                        <th style={{ padding: 'var(--space-md)', textAlign: 'center' }}>Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.singerReports.map(report => (
                        <tr 
                          key={report.profileId} 
                          style={{ 
                            borderBottom: '1px solid var(--border)',
                            backgroundColor: report.absences >= 2 ? 'var(--color-danger-bg)' : 'transparent',
                            color: report.absences >= 2 ? 'var(--color-danger-text)' : 'inherit'
                          }}
                        >
                          <td style={{ padding: 'var(--space-md)', fontWeight: 600 }}>{report.name}</td>
                          <td style={{ padding: 'var(--space-md)' }}>{report.voicePart}</td>
                          <td style={{ padding: 'var(--space-md)', textAlign: 'center' }}>
                            <span className={report.absences >= 2 ? 'badge badge-danger' : ''}>
                              {report.absences}
                            </span>
                          </td>
                          <td style={{ padding: 'var(--space-md)', textAlign: 'center' }}>{report.presenceCount} / {report.totalEvents}</td>
                          <td style={{ padding: 'var(--space-md)', textAlign: 'center' }}>{report.attendanceRate.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ display: 'none' }} className="print-only">
                <style>{`
                  @media print {
                    .print-only { display: block !important; }
                    table { border: 1px solid black !important; }
                    th, td { border: 1px solid black !important; padding: 4px !important; }
                    .badge-danger { color: red !important; font-weight: bold !important; }
                  }
                `}</style>
                <h2 style={{ textAlign: 'center' }}>Attendance Report: {summary.performance.title}</h2>
                <p style={{ textAlign: 'center' }}>Date: {new Date(summary.performance.date).toLocaleDateString()}</p>
              </div>
            </>
          )}

          {!selectedPerformanceId && !isAttendanceLoading && (
            <div className="card" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>📊</div>
              <h3>No Performance Selected</h3>
              <p className="text-muted">Choose a performance from the dropdown above to analyze attendance data for its associated rehearsals.</p>
            </div>
          )}
        </div>
      )}

      {tab === 'repertoire' && (
          <div className="flex-col" style={{ gap: 'var(--space-xl)' }}>
            <div className="flex-responsive" style={{ justifyContent: 'space-between' }}>
                <div>
                    <h3 style={{ margin: 0 }}>Repertoire History</h3>
                    <p className="text-muted" style={{ margin: 0 }}>A consolidated view of all library pieces and their performance dates.</p>
                </div>
                <div className="flex-row">
                    <button onClick={handleExportCSV} className="btn btn-secondary btn-sm" disabled={isRepertoireLoading || repertoireStats.length === 0}>
                        <span>📥</span> Download CSV
                    </button>
                    <button onClick={handlePrint} className="btn btn-ghost btn-sm" disabled={isRepertoireLoading || repertoireStats.length === 0}>
                        <span>🖨️</span> Print Report
                    </button>
                </div>
            </div>

            {isRepertoireLoading ? (
                 <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                    <div className="text-muted">Loading repertoire data...</div>
                 </div>
            ) : repertoireStats.length === 0 ? (
                <div className="card" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
                    <p className="text-muted">No pieces in the music library.</p>
                </div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="table" style={{ width: '100%' }}>
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Composer</th>
                                    <th style={{ textAlign: 'center' }}>Total Performances</th>
                                    <th>Last Performed</th>
                                </tr>
                            </thead>
                            <tbody>
                                {repertoireStats.map(stat => (
                                    <tr key={stat.piece.id}>
                                        <td><strong>{stat.piece.title}</strong></td>
                                        <td>{stat.piece.composer || '-'}</td>
                                        <td style={{ textAlign: 'center' }}>
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
