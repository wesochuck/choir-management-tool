import { useEffect, useState } from 'react';
import { useMyEvents } from '../../hooks/useMyEvents';
import { EventCard } from '../../components/singer/EventCard';
import { pb } from '../../lib/pocketbase';
import { PageLayout } from '../../components/common/PageLayout';
import { Link } from 'react-router-dom';
import { pollService, type SingerPoll } from '../../services/pollService';
import { AppCard } from '../../components/common/AppCard';
import { communicationService, type MessageRecord } from '../../services/communicationService';
import { sanitizeHtml } from '../../lib/textSafety';
import { useDialog } from '../../contexts/DialogContext';
import { resourceService, type SingerResource } from '../../services/resourceService';
import { settingsService } from '../../services/settingsService';
import { BaseModal } from '../../components/common/BaseModal';
import './SingerDashboard.css';


export default function DashboardView() {
  const dialog = useDialog();
  const { events, myRosters, myProfile, isLoading, error, updateRSVP } = useMyEvents();
  const [activePolls, setActivePolls] = useState<SingerPoll[]>([]);
  const [announcements, setAnnouncements] = useState<MessageRecord[]>([]);
  const [isAnnouncementsLoading, setIsAnnouncementsLoading] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<MessageRecord | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [resources, setResources] = useState<SingerResource[]>([]);
  const [isResourcesLoading, setIsResourcesLoading] = useState(false);
  const [submittingRsvpStatus, setSubmittingRsvpStatus] = useState<'Yes' | 'No' | null>(null);
  const [maxRehearsalMisses, setMaxRehearsalMisses] = useState(3);

  useEffect(() => {
    if (myProfile?.id) {
      const now = new Date();
      pollService.getActivePollsForSinger(myProfile.id)
        .then(list => {
          // Client-side filter for active polls
          const filtered = list.filter(poll => {
            // Filter by archiveAt expiration
            const isExpired = poll.archiveAt ? new Date(poll.archiveAt.replace(" ", "T")) < now : false;
            if (isExpired) return false;

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
        .then(async list => {
          // Client-side filter to only show messages where the user is a recipient
          const filtered = list.filter(msg => 
            msg.recipients?.some(r => r.id === myProfile.id)
          );

          const recent = filtered.slice(0, 5);
          const resolved = await Promise.all(
            recent.map(async (msg) => {
              let content = msg.content;
              const eventId = msg.filters?.eventId as string | undefined;

              try {
                content = await communicationService.resolveSingerPlaceholders(content, eventId);
              } catch (err) {
                console.error('Failed to resolve placeholders for message', msg.id, err);
              }

              return {
                ...msg,
                content,
              };
            })
          );

          setAnnouncements(resolved);
        })
        .catch(err => console.error('Failed to load announcements', err))
        .finally(() => setIsAnnouncementsLoading(false));
    }
  }, [myProfile?.id]);

  useEffect(() => {
    setCurrentTime(Date.now());
  }, [events]);

  useEffect(() => {
    setIsResourcesLoading(true);
    resourceService.getResources()
      .then(list => setResources(list))
      .catch(err => console.error('Failed to load resources', err))
      .finally(() => setIsResourcesLoading(false));

    settingsService.getRosterSettings()
      .then(settings => {
        if (settings?.maxRehearsalMisses !== undefined) {
          setMaxRehearsalMisses(settings.maxRehearsalMisses);
        }
      })
      .catch(err => console.error('Failed to load roster settings:', err));
  }, []);

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

  const handleUpdateRSVP = async (eventId: string, rsvp: 'Yes' | 'No') => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    setSubmittingRsvpStatus(rsvp);
    try {
      if (event.type === 'Rehearsal' && rsvp === 'No') {
        const note = await dialog.prompt({
          title: 'RSVP Note Required',
          message: 'Please provide a brief reason for your absence from this rehearsal.',
          placeholder: 'e.g. Family emergency, work travel, illness...',
          confirmLabel: 'Submit RSVP',
          required: true,
          maxLength: 1000
        });

        if (note === null) return; // User cancelled prompt

        await updateRSVP(eventId, rsvp, note);
      } else {
        await updateRSVP(eventId, rsvp);
      }
    } finally {
      setSubmittingRsvpStatus(null);
    }
  };

  if (isLoading && events.length === 0) return <div className="container sd-loading-container">Loading your events...</div>;
  if (error) return <div className="container sd-error-container">Error: {error}</div>;

  const upcomingEvents = events.filter(e => new Date(e.date) >= new Date());
  
  const nextEvent = upcomingEvents[0] ?? null;
  const nextRoster = nextEvent ? myRosters[nextEvent.id] : undefined;
  const hasPerformanceSeatLink = nextEvent?.type === 'Performance';
  const isNextEventParentPerformanceDeclined = nextEvent?.type === 'Rehearsal' && nextEvent.parentPerformanceId && myRosters[nextEvent.parentPerformanceId]?.rsvp === 'No';
  const latestAnnouncement = announcements[0] ?? null;

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

  const isNextEventClosed = nextEvent ? (
    nextEvent.type === 'Performance' 
      ? !nextEvent.isOpenForRSVP 
      : new Date(nextEvent.date).getTime() < currentTime
  ) : false;

  const nextEventLabels = nextEvent?.type === 'Rehearsal' ? {
    yes: nextRoster?.rsvp === 'Yes' ? '✓ Attending' : "I'll be there",
    no: nextRoster?.rsvp === 'No' ? '✗ Absence Reported' : 'Report absence'
  } : {
    yes: nextRoster?.rsvp === 'Yes' ? '✓ Attending' : 'Attend',
    no: nextRoster?.rsvp === 'No' ? '✗ Declining' : 'Decline'
  };

  return (
    <PageLayout 
      title="Singer Dashboard" 
      actions={
        <div className="flex-row sd-page-actions">
          <Link to="/profile" className="btn btn-ghost">My Profile</Link>
          <button onClick={() => pb.authStore.clear()} className="btn btn-ghost">Logout</button>
        </div>
      }
      maxWidth="1200px"
    >
      <div className="sd-dashboard-wrapper">
        {nextEvent && (
          <section className="mobile-singer-quick-panel" aria-label="Singer quick actions">
            <AppCard className="glass-card">
              <div className="mobile-singer-quick-content">
                <div className="mobile-singer-quick-eyebrow">Next up</div>
                <div className="mobile-singer-quick-title">{nextEvent.title || nextEvent.type}</div>
                <div className="mobile-singer-quick-meta">
                  {getFormattedDate(nextEvent.date)}
                  {nextEvent.expand?.venue?.name ? ` • ${nextEvent.expand.venue.name}` : ''}
                </div>

                <div className="mobile-singer-quick-actions">
                  <Link to={`/player?eventId=${nextEvent.id}`} className="btn btn-primary">
                    🎵 Practice
                  </Link>

                  {hasPerformanceSeatLink && (
                    <Link to={`/seating/${nextEvent.id}`} className="btn btn-secondary">
                      🪑 Seat
                    </Link>
                  )}
                </div>

                {isNextEventParentPerformanceDeclined ? (
                  <div className="text-center text-xs text-muted sd-excused-message">
                    🚫 Excused (Parent Performance Declined)
                  </div>
                ) : (
                  <>
                    <div className="mobile-singer-quick-rsvp">
                      <button
                        type="button"
                        onClick={() => handleUpdateRSVP(nextEvent.id, 'Yes')}
                        className={`btn btn-sm ${nextRoster?.rsvp === 'Yes' ? 'btn-primary' : 'btn-ghost'}`}
                        disabled={isNextEventClosed || submittingRsvpStatus !== null}
                      >
                        {submittingRsvpStatus === 'Yes' ? 'Processing...' : nextEventLabels.yes}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateRSVP(nextEvent.id, 'No')}
                        className={`btn btn-sm ${nextRoster?.rsvp === 'No' ? 'btn-danger' : 'btn-ghost'}`}
                        disabled={isNextEventClosed || submittingRsvpStatus !== null}
                      >
                        {submittingRsvpStatus === 'No' ? 'Processing...' : nextEventLabels.no}
                      </button>
                    </div>
                    {isNextEventClosed && (
                      <div className="text-xs text-muted sd-rsvp-closed-message">
                        {nextEvent.type === 'Performance' 
                          ? 'The RSVP window for this performance is closed.' 
                          : 'This rehearsal has already passed.'}
                      </div>
                    )}
                  </>
                )}

                {(activePolls.length > 0 || latestAnnouncement) && (
                  <div className="mobile-singer-quick-notices">
                    {activePolls.length > 0 && (
                      <span>{activePolls.length} active poll{activePolls.length === 1 ? '' : 's'}</span>
                    )}
                    {latestAnnouncement && (
                      <button
                        type="button"
                        className="mobile-singer-bulletin-link"
                        onClick={() => setSelectedAnnouncement(latestAnnouncement)}
                      >
                        Latest bulletin: {latestAnnouncement.subject || 'Choir Update'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </AppCard>
          </section>
        )}

        <div className="dashboard-container">
          
          {/* Main timeline panel: Events */}
          <div className="flex-col sd-timeline-panel">
            <h2 className="sd-upcoming-events-header">Upcoming Events</h2>
            {upcomingEvents.map((e) => (
              <EventCard 
                key={e.id} 
                event={e} 
                rsvp={myRosters[e.id]?.rsvp} 
                onRSVP={(rsvp) => handleUpdateRSVP(e.id, rsvp)} 
                allEvents={events}
                myRosters={myRosters}
                maxRehearsalMisses={maxRehearsalMisses}
              />
            ))}

            {upcomingEvents.length === 0 && (
              <div className="card glass-card sd-no-events-card">
                <p className="text-muted">No upcoming events at this time.</p>
              </div>
            )}
          </div>

          {/* Right sidebar: Quick widgets */}
          <div className="flex-col sd-sidebar">
            
            {/* Quick Polls Widget */}
            {activePolls.length > 0 && (
              <AppCard className="glass-card sd-polls-card" title="📊 Quick Polls">
                <div className="flex-col sd-polls-list">
                  {activePolls.map(poll => (
                    <div key={poll.id} className="card sd-poll-item">
                      <div className="sd-poll-question">{poll.question}</div>
                      <div className="flex-row sd-poll-actions">
                        <button 
                          className="btn btn-sm sd-poll-btn-base" 
                          // @allow-inline-style - Dynamic color based on poll status
                          style={{ 
                            backgroundColor: poll.status === 'Yes' ? 'var(--primary)' : 'white',
                            color: poll.status === 'Yes' ? 'white' : 'var(--neutral-text)',
                          }}
                          onClick={() => handlePollResponse(poll.id, 'Yes')}
                        >
                          {poll.status === 'Yes' ? '✓ Yes' : 'Yes'}
                        </button>
                        <button 
                          className="btn btn-sm sd-poll-btn-base" 
                          // @allow-inline-style - Dynamic color based on poll status
                          style={{ 
                            backgroundColor: poll.status === 'No' ? '#ef4444' : 'white',
                            color: poll.status === 'No' ? 'white' : 'var(--neutral-text)',
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
                <div className="text-muted sd-centered-muted-padding">Loading bulletins...</div>
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
                          __html: sanitizeHtml(ann.content).replace(/<[^>]*>/g, '').slice(0, 100) + '...' 
                        }} 
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted sd-centered-muted-padding">No recent updates.</div>
              )}
            </AppCard>

            {/* Resources Widget */}
            <AppCard className="glass-card" title="📂 Resources">
              {isResourcesLoading ? (
                <div className="text-muted sd-centered-muted-padding">Loading resources...</div>
              ) : resources.length > 0 ? (
                <div className="resource-locker-list">
                  {resources.map(res => {
                    const href = res.url || (res.file ? resourceService.getResourceFileUrl(res, res.file) : '#');
                    return (
                      <a 
                        key={res.id}
                        href={href} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="resource-locker-item"
                      >
                        <span className="resource-icon">{res.url ? '🔗' : '📄'}</span> {res.title}
                      </a>
                    );
                  })}
                </div>
              ) : (
                <div className="text-muted sd-centered-muted-padding">No resources available.</div>
              )}
            </AppCard>

          </div>

        </div>
      </div>

      {/* Announcement modal */}
      <BaseModal
        isOpen={!!selectedAnnouncement}
        onClose={() => setSelectedAnnouncement(null)}
        title={selectedAnnouncement?.subject || 'Bulletin details'}
        maxWidth="600px"
        footer={
          <button 
            type="button" 
            onClick={() => setSelectedAnnouncement(null)} 
            className="btn btn-secondary btn-sm"
          >
            Close
          </button>
        }
      >
        {selectedAnnouncement && (
          <div className="flex-col sd-announcement-modal-content">
            <div className="text-xs text-muted sd-dispatched-date">
              Dispatched on {getFormattedDate(selectedAnnouncement.created)}
            </div>
            <div className="message-preview-content sd-message-preview-content">
              {/* Secure content rendering */}
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedAnnouncement.content) }} />
            </div>
          </div>
        )}
      </BaseModal>
    </PageLayout>
  );
}
