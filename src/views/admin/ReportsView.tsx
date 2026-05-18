import { useState, useEffect } from 'react';
import { reportService, type ConcertSummary } from '../../services/reportService';
import type { Event } from '../../services/eventService';

export default function ReportsView() {
  const [performances, setPerformances] = useState<Event[]>([]);
  const [selectedPerformanceId, setSelectedPerformanceId] = useState<string>('');
  const [summary, setSummary] = useState<ConcertSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    setIsLoading(true);
    setError(null);
    reportService.getConcertSummary(selectedPerformanceId)
      .then(setSummary)
      .catch(() => setError('Failed to load concert summary.'))
      .finally(() => setIsLoading(false));
  }, [selectedPerformanceId]);

  const handleExportCSV = () => {
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

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_report_${summary.performance.title.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => window.print();

  return (
    <div className="flex-col" style={{ gap: 'var(--space-xl)' }}>
      {/* Selection Header */}
      <div className="card no-print">
        <div className="flex-responsive" style={{ justifyContent: 'space-between' }}>
          <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
            <label className="text-label text-muted">Select Concert / Performance</label>
            <select 
              className="input" 
              style={{ width: '300px' }}
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

      {isLoading && (
        <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
          <div className="text-muted">Calculating attendance insights...</div>
        </div>
      )}

      {!isLoading && summary && (
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
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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

      {!selectedPerformanceId && !isLoading && (
        <div className="card" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>📊</div>
          <h3>No Performance Selected</h3>
          <p className="text-muted">Choose a performance from the dropdown above to analyze attendance data for its associated rehearsals.</p>
        </div>
      )}
    </div>
  );
}
