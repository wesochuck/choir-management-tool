import { useEffect, useState } from 'react';
import { useMyEvents } from '../../hooks/useMyEvents';
import { EventCard } from '../../components/singer/EventCard';
import { pb } from '../../lib/pocketbase';
import { PageLayout } from '../../components/common/PageLayout';
import { Link } from 'react-router-dom';
import { pollService, type SingerPoll } from '../../services/pollService';
import { AppCard } from '../../components/common/AppCard';
import { communicationService, type MessageRecord } from '../../services/communicationService';
import './DashboardView.css';

export default function DashboardView() {
  const { events, myRosters, myProfile, isLoading, error, updateRSVP } = useMyEvents();
  const [activePolls, setActivePolls] = useState<SingerPoll[]>([]);
  const [announcements, setAnnouncements] = useState<MessageRecord[]>([]);
  const [isAnnouncementsLoading, setIsAnnouncementsLoading] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<MessageRecord | null>(null);

  useEffect(() => {
    if (myProfile?.id) {
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
        });
    }
  }, [myProfile?.id, events]);

  useEffect(() => {
    if (myProfile?.id) {
      setIsAnnouncementsLoading(true);
      communicationService.getMessages()
        .then(list => {
          // Client-side filter to only show messages where the user is a recipient
          const filtered = list.filter(msg => 
            msg.recipients?.some(r => r.id === myProfile.id)
          );
          setAnnouncements(filtered.slice(0, 5));
        })
        .catch(err => console.error('Failed to load announcements', err))
        .finally(() => setIsAnnouncementsLoading(false));
    }
  }, [myProfile?.id]);

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

  const getFormattedDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

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
      maxWidth="1200px"
    >
      <div style={{ padding: 'var(--space-md) 0' }}>
        <div className="dashboard-container">
          
          {/* Main timeline panel: Events */}
          <div className="flex-col" style={{ gap: 'var(--space-lg)' }}>
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
              <div className="card glass-card" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
                <p className="text-muted">No upcoming events at this time.</p>
              </div>
            )}
          </div>

          {/* Right sidebar: Quick widgets */}
          <div className="flex-col" style={{ gap: 'var(--space-lg)' }}>
            
            {/* Practice Center CTA */}
            <AppCard className="practice-widget-card" style={{ padding: 'var(--space-lg)' }}>
              <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
                <h3 className="widget-title" style={{ margin: 0, fontSize: '1.25rem' }}>🎧 Practice Center</h3>
                <p className="text-muted-white" style={{ margin: 0, lineHeight: 1.4 }}>
                  Access learning tracks, markoffs, and practice lists. Practice offline anytime!
                </p>
                <div className="flex-col" style={{ gap: 'var(--space-sm)' }}>
                  {upcomingEvents.length > 0 ? (
                    <button 
                      onClick={() => window.open(`/player?eventId=${upcomingEvents[0].id}`, '_blank')}
                      className="btn"
                      style={{ backgroundColor: 'white', color: 'var(--primary-deep)', fontWeight: 800, width: '100%', border: 'none' }}
                    >
                      🎵 Launch Practice Player
                    </button>
                  ) : (
                    <Link 
                      to="/player" 
                      className="btn"
                      style={{ backgroundColor: 'white', color: 'var(--primary-deep)', fontWeight: 800, width: '100%', border: 'none', textAlign: 'center' }}
                    >
                      🎵 Open Practice Player
                    </Link>
                  )}
                  {upcomingEvents.length > 0 && upcomingEvents[0].type === 'Performance' && (
                    <Link 
                      to={`/seating/${upcomingEvents[0].id}`}
                      className="btn"
                      style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', fontWeight: 600, width: '100%', textAlign: 'center' }}
                    >
                      🪑 View Seating Roster
                    </Link>
                  )}
                </div>
              </div>
            </AppCard>

            {/* Quick Polls Widget */}
            {activePolls.length > 0 && (
              <AppCard className="glass-card" title="📊 Quick Polls" style={{ backgroundColor: 'var(--primary-light)' }}>
                <div className="flex-col" style={{ gap: 'var(--space-sm)' }}>
                  {activePolls.map(poll => (
                    <div key={poll.id} className="card" style={{ padding: 'var(--space-sm)', display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', boxShadow: 'none', border: '1px solid var(--border)' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{poll.question}</div>
                      <div className="flex-row" style={{ gap: 'var(--space-xs)' }}>
                        <button 
                          className="btn btn-sm" 
                          style={{ 
                            flex: 1, 
                            backgroundColor: poll.status === 'Yes' ? 'var(--primary)' : 'white',
                            color: poll.status === 'Yes' ? 'white' : 'var(--neutral-text)',
                            border: '1px solid var(--border)',
                            fontWeight: 700
                          }}
                          onClick={() => handlePollResponse(poll.id, 'Yes')}
                        >
                          {poll.status === 'Yes' ? '✓ Yes' : 'Yes'}
                        </button>
                        <button 
                          className="btn btn-sm" 
                          style={{ 
                            flex: 1, 
                            backgroundColor: poll.status === 'No' ? '#ef4444' : 'white',
                            color: poll.status === 'No' ? 'white' : 'var(--neutral-text)',
                            border: '1px solid var(--border)',
                            fontWeight: 700
                          }}
                          onClick={() => handlePollResponse(poll.id, 'No')}
                        >
                          {poll.status === 'No' ? '✗ No' : 'No'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </AppCard>
            )}

            {/* Recent Announcements Widget */}
            <AppCard className="glass-card" title="✉️ Bulletins">
              {isAnnouncementsLoading ? (
                <div className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-md)' }}>Loading bulletins...</div>
              ) : announcements.length > 0 ? (
                <div className="bulletin-feed">
                  {announcements.map(ann => (
                    <div 
                      key={ann.id} 
                      className="bulletin-item"
                      onClick={() => setSelectedAnnouncement(ann)}
                    >
                      <div className="bulletin-header">
                        <span className="bulletin-title">{ann.subject || 'Choir Update'}</span>
                        <span className="bulletin-date">{getFormattedDate(ann.created)}</span>
                      </div>
                      <div 
                        className="bulletin-snippet"
                        dangerouslySetInnerHTML={{ 
                          __html: ann.content.replace(/<[^>]*>/g, '').slice(0, 100) + '...' 
                        }} 
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-md)' }}>No recent updates.</div>
              )}
            </AppCard>

            {/* Resources Locker Widget */}
            <AppCard className="glass-card" title="📂 Resources Locker">
              <div className="resource-locker-list">
                <a href="/profile" className="resource-locker-item">
                  <span className="resource-icon">👤</span> My Singer Profile
                </a>
                <a 
                  href="https://www.google.com" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="resource-locker-item"
                >
                  <span className="resource-icon">📖</span> Choir Singer Handbook
                </a>
                {events.length > 0 && events.find(e => e.expand?.venue?.address) && (
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(events.find(e => e.expand?.venue?.address)?.expand?.venue?.address || '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="resource-locker-item"
                  >
                    <span className="resource-icon">📍</span> Primary Venue Location
                  </a>
                )}
              </div>
            </AppCard>

          </div>

        </div>
      </div>

      {/* Announcement slide-over/modal */}
      {selectedAnnouncement && (
        <div className="announcement-modal-backdrop" onClick={() => setSelectedAnnouncement(null)}>
          <div className="announcement-modal" onClick={e => e.stopPropagation()}>
            <div className="announcement-modal-header">
              <div>
                <h2 className="announcement-modal-title">{selectedAnnouncement.subject || 'Bulletin details'}</h2>
                <div className="announcement-modal-meta">Dispatched on {getFormattedDate(selectedAnnouncement.created)}</div>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '1.25rem', border: 'none', padding: '0 8px' }}
              >
                ×
              </button>
            </div>
            <div className="announcement-modal-body message-preview-content">
              {/* Secure content rendering */}
              <div dangerouslySetInnerHTML={{ __html: selectedAnnouncement.content }} />
            </div>
            <div className="announcement-modal-footer">
              <button 
                type="button" 
                onClick={() => setSelectedAnnouncement(null)} 
                className="btn btn-secondary btn-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

