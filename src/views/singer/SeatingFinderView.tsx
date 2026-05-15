import { useState } from 'react';
import { useMyEvents } from '../../hooks/useMyEvents';
import { useSeatingChart } from '../../hooks/useSeatingChart';
import { useParams, Link } from 'react-router-dom';

export default function SeatingFinderView() {
  const { eventId } = useParams();
  const { events } = useMyEvents();
  const [searchTerm, setSearchTerm] = useState('');

  const event = events.find(e => e.id === eventId);
  const { 
    chart, activeProfiles, rowCounts, isLoading 
  } = useSeatingChart(eventId || '', null);

  if (!event) return <div style={{ padding: '20px' }}>Event not found.</div>;

  const mySeat = activeProfiles.find(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // Find where this profile is assigned
  let seatLocation = null;
  if (chart?.assignments) {
    for (const [key, profileId] of Object.entries(chart.assignments)) {
      if (profileId === mySeat?.id) {
        const [row, index] = key.split('-');
        seatLocation = { row: parseInt(row) + 1, seat: parseInt(index) + 1 };
        break;
      }
    }
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#f0f4f8', minHeight: '100vh' }}>
      <header style={{ marginBottom: '24px' }}>
        <Link to="/" style={{ textDecoration: 'none', color: '#3182ce', fontWeight: 'bold' }}>← Back to Dashboard</Link>
        <h1 style={{ marginTop: '16px' }}>Find Your Seat</h1>
        <div style={{ fontSize: '18px', color: '#4a5568' }}>{event.title || event.location}</div>
      </header>

      <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Search Your Name</label>
        <input 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Type your name..."
          style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '16px' }}
        />

        {searchTerm && seatLocation ? (
          <div style={{ marginTop: '32px', textAlign: 'center', padding: '40px', backgroundColor: '#e6fffa', borderRadius: '16px', border: '2px solid #38a169' }}>
            <div style={{ fontSize: '14px', color: '#2c7a7b', fontWeight: 'bold', textTransform: 'uppercase' }}>Your Assignment</div>
            <div style={{ fontSize: '48px', fontWeight: '900', color: '#234e52', margin: '12px 0' }}>
               Row {seatLocation.row}
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#285e61' }}>
               Seat {seatLocation.seat}
            </div>
          </div>
        ) : searchTerm ? (
          <div style={{ marginTop: '32px', textAlign: 'center', color: '#718096' }}>
            No assignment found for "{searchTerm}" yet. Check with your director!
          </div>
        ) : (
          <div style={{ marginTop: '32px', textAlign: 'center', color: '#a0aec0' }}>
            Enter your name above to see your assigned seat.
          </div>
        )}
      </div>

      <div style={{ marginTop: '40px' }}>
         <h3 style={{ fontSize: '14px', color: '#718096', textAlign: 'center', marginBottom: '16px' }}>FULL STAGE VIEW</h3>
         {isLoading ? (
            <div style={{ textAlign: 'center' }}>Loading grid...</div>
         ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {rowCounts.map((count, rIdx) => (
                    <div key={rIdx} style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        {Array.from({ length: count }).map((_, sIdx) => {
                            const isMySeat = chart?.assignments[`${rIdx}-${sIdx}`] === mySeat?.id && !!searchTerm;
                            return (
                                <div key={sIdx} style={{ 
                                    width: '12px', height: '12px', borderRadius: '2px',
                                    backgroundColor: isMySeat ? '#38a169' : '#e2e8f0' 
                                }} />
                            );
                        })}
                    </div>
                ))}
            </div>
         )}
      </div>
    </div>
  );
}
