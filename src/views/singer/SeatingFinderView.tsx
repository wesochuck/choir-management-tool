import { useEffect, useState } from 'react';
import { useMyEvents } from '../../hooks/useMyEvents';
import { useSeatingChart } from '../../hooks/useSeatingChart';
import { useParams } from 'react-router-dom';
import { PageLayout } from '../../components/common/PageLayout';
import { AppCard } from '../../components/common/AppCard';
import { profileService, type Profile } from '../../services/profileService';

export default function SeatingFinderView() {
  const { eventId } = useParams();
  const { events, isLoading: eventsLoading } = useMyEvents();
  const [myProfile, setMyProfile] = useState<Profile | null>(null);

  useEffect(() => {
    profileService.getMyProfile().then(setMyProfile).catch(console.error);
  }, []);

  const event = events.find(e => e.id === eventId);
  // Default to null venue on singer view for now; ideally the event has a default venue
  const { chart, rowCounts, isLoading: chartLoading } = useSeatingChart(eventId || '', null);

  const isLoading = eventsLoading || chartLoading;

  if (!event) return <div className="container" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>Event not found.</div>;

  const seatLocation = myProfile ? Object.entries(chart?.assignments || {}).find(([, id]) => id === myProfile.id) : null;
  const [row, seat] = seatLocation ? seatLocation[0].split('-').map(Number) : [null, null];

  return (
    <PageLayout 
      title="Find Your Seat" 
      subtitle={event.title || event.location}
      backTo="/"
      maxWidth="800px"
    >
      <div className="flex-col" style={{ gap: 'var(--space-xl)', padding: 'var(--space-xl) 0' }}>
        <AppCard>
          {row !== null ? (
            <div className="flex-col" style={{ 
              textAlign: 'center', 
              padding: 'var(--space-xl)', 
              backgroundColor: 'var(--primary-light)', 
              borderRadius: 'var(--radius-lg)', 
              border: '2px solid var(--primary)',
              gap: 'var(--space-sm)'
            }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--primary-deep)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Assignment</div>
              <div style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--primary-deep)', margin: 'var(--space-sm) 0', lineHeight: 1 }}>
                 Row {row + 1}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                 Seat {seat! + 1}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <p className="text-muted">No assignment found for your profile yet. Check with your director!</p>
            </div>
          )}
        </AppCard>

        <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
           <h3 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Full Stage View</h3>
           {isLoading ? (
              <div style={{ textAlign: 'center' }} className="text-muted">Loading grid...</div>
           ) : (
              <div className="flex-col" style={{ gap: '4px' }}>
                  {rowCounts.map((count, rIdx) => (
                      <div key={rIdx} className="flex-row" style={{ gap: '4px', justifyContent: 'center' }}>
                          {Array.from({ length: count }).map((_, sIdx) => {
                              const isMySeat = chart?.assignments[`${rIdx}-${sIdx}`] === myProfile?.id;
                              return (
                                  <div key={sIdx} style={{ 
                                      width: '12px', height: '12px', borderRadius: '2px',
                                      backgroundColor: isMySeat ? 'var(--primary)' : 'var(--border)' 
                                  }} />
                              );
                          })}
                      </div>
                  ))}
              </div>
           )}
        </div>
      </div>
    </PageLayout>
  );
}
