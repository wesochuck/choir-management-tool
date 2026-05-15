import { useState } from 'react';
import { useEvents } from '../../hooks/useEvents';
import { useVenues } from '../../hooks/useVenues';
import { useSeatingChart } from '../../hooks/useSeatingChart';
import { SeatingGrid } from '../../components/admin/SeatingGrid';

export default function SeatingView() {
  const { performances } = useEvents();
  const { venues } = useVenues();
  
  const [performanceId, setPerformanceId] = useState('');
  const [venueId, setVenueId] = useState('');

  const selectedVenue = venues.find(v => v.id === venueId) || null;
  const { 
    chart, activeProfiles, rowCounts, suggestions, isLoading, assignSinger 
  } = useSeatingChart(performanceId, selectedVenue);

  const handlePrint = () => window.print();

  return (
    <div style={{ padding: '24px', backgroundColor: '#f0f4f8', minHeight: '100vh' }}>
      <div className="no-print" style={{ marginBottom: '32px' }}>
        <h1>Seating Chart Creator</h1>
        
        <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Performance</label>
            <select 
              value={performanceId} 
              onChange={(e) => setPerformanceId(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e0' }}
            >
              <option value="">-- Select Performance --</option>
              {performances.map(p => (
                <option key={p.id} value={p.id}>{p.title || new Date(p.date).toLocaleDateString()} - {p.location}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Venue Layout</label>
            <select 
              value={venueId} 
              onChange={(e) => setVenueId(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e0' }}
            >
              <option value="">-- Select Venue Template --</option>
              {venues.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {performanceId && venueId ? (
        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 15px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
             <h2>Grid Editor</h2>
             <button 
                onClick={handlePrint}
                style={{ padding: '10px 24px', backgroundColor: '#2d3748', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
             >
                🖨️ Print for Letter Paper
             </button>
          </div>

          {isLoading ? (
            <div>Loading seating data...</div>
          ) : (
            <>
              <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#fff5f5', borderRadius: '8px', fontSize: '13px', color: '#c53030' }}>
                <strong>Tip:</strong> The background colors indicate the suggested "Vertical Wedge" for each section based on your current roster.
              </div>
              <SeatingGrid 
                rowCounts={rowCounts}
                assignments={chart?.assignments || {}}
                suggestions={suggestions}
                activeProfiles={activeProfiles}
                onAssign={assignSinger}
              />
            </>
          )}
        </div>
      ) : (
        <div style={{ padding: '80px', textAlign: 'center', backgroundColor: 'white', borderRadius: '16px', color: '#a0aec0' }}>
          Select a Performance and a Venue to start creating the seating chart.
        </div>
      )}

      <style>{`
        @media print {
            .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
