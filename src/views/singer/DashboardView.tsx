import { useEffect, useState } from 'react';
import { useMyEvents } from '../../hooks/useMyEvents';
import { EventCard } from '../../components/singer/EventCard';
import { pb } from '../../lib/pocketbase';
import { PageLayout } from '../../components/common/PageLayout';
import { Link } from 'react-router-dom';
import { pollService, type SingerPoll } from '../../services/pollService';
import { AppCard } from '../../components/common/AppCard';

export default function DashboardView() {
  const { events, myRosters, myProfile, isLoading, error, updateRSVP } = useMyEvents();
  const [activePolls, setActivePolls] = useState<SingerPoll[]>([]);
  const [isPollsLoading, setIsPollsLoading] = useState(false);

  useEffect(() => {
    if (myProfile?.id) {
      setIsPollsLoading(true);
      const now = new Date();
      pollService.getActivePollsForSinger(myProfile.id)
        .then(list => {
          // Client-side filter for active polls
          const filtered = list.filter(poll => {
            if (!poll.eventId) return true;
            const event = events.find(e => e.id === poll.eventId);
            if (!event) return true;
            return new Date(event.date) > now;
          });
          setActivePolls(filtered);
        })
        .finally(() => setIsPollsLoading(false));
    }
  }, [myProfile?.id, events]);

  const handlePollResponse = async (pollId: string, status: 'Yes' | 'No') => {
    if (!myProfile?.id) return;
    
    // Optimistic update
    setActivePolls(prev => prev.map(p => p.id === pollId ? { ...p, status } : p));
    
    try {
      await pollService.submitResponseLoggedIn(pollId, myProfile.id, status);
    } catch (err) {
      console.error('Failed to submit poll response', err);
      // Revert on error
      const list = await pollService.getActivePollsForSinger(myProfile.id);
      setActivePolls(list);
    }
  };

  if (isLoading && events.length === 0) return <div className="container" style={{ textAlign: 'center', paddingTop: 'var(--space-xl)' }}>Loading your events...</div>;
  if (error) return <div className="container" style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;

  const upcomingEvents = events.filter(e => new Date(e.date) >= new Date());

  return (
    <PageLayout 
      title="Upcoming Events" 
      subtitle="Please let us know if you can make it!"
      actions={
        <div className="flex-row" style={{ gap: 'var(--space-sm)' }}>
          <Link to="/profile" className="btn btn-ghost">My Profile</Link>
          <button onClick={() => pb.authStore.clear()} className="btn btn-ghost">Logout</button>
        </div>
      }
      maxWidth="800px"
    >
      <div className="flex-col" style={{ gap: 'var(--space-lg)', padding: 'var(--space-xl) 0' }}>
        
        {activePolls.length > 0 && (
          <AppCard title="📊 Quick Polls" style={{ backgroundColor: 'var(--primary-light)' }}>
            <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
              {activePolls.map(poll => (
                <div key={poll.id} className="card" style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', boxShadow: 'none', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{poll.question}</div>
                  <div className="flex-row" style={{ gap: 'var(--space-sm)' }}>
                    <button 
                      className="btn" 
                      style={{ 
                        flex: 1, 
                        backgroundColor: poll.status === 'Yes' ? 'var(--primary)' : 'white',
                        color: poll.status === 'Yes' ? 'white' : 'var(--neutral-text)',
                        border: '1px solid var(--border)',
                        fontWeight: 700
                      }}
                      onClick={() => handlePollResponse(poll.id, 'Yes')}
                    >
                      {poll.status === 'Yes' ? '✓ I Volunteered' : 'Yes / Volunteer'}
                    </button>
                    <button 
                      className="btn" 
                      style={{ 
                        flex: 1, 
                        backgroundColor: poll.status === 'No' ? '#ef4444' : 'white',
                        color: poll.status === 'No' ? 'white' : 'var(--neutral-text)',
                        border: '1px solid var(--border)',
                        fontWeight: 700
                      }}
                      onClick={() => handlePollResponse(poll.id, 'No')}
                    >
                      {poll.status === 'No' ? '✗ I Declined' : 'No / Cannot'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </AppCard>
        )}
        {isPollsLoading && (
          <div className="text-muted" style={{ textAlign: 'center' }}>
            Loading polls...
          </div>
        )}

        {upcomingEvents.map((e) => (
          <EventCard 
            key={e.id} 
            event={e} 
            rsvp={myRosters[e.id]?.rsvp} 
            onRSVP={(rsvp) => updateRSVP(e.id, rsvp)} 
            allEvents={events}
            myRosters={myRosters}
            voicePart={myProfile?.voicePart}
          />
        ))}

        {upcomingEvents.length === 0 && (
          <div className="card" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
            <p className="text-muted">No upcoming events at this time.</p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
