import { useEffect, useState } from 'react';
import { useMyEvents } from '../../hooks/useMyEvents';
import { EventCard } from '../../components/singer/EventCard';
import PublicLogo from '../../components/common/PublicLogo';
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

  if (isLoading && events.length === 0) return <div className="container pt-8 text-center">Loading your events...</div>;
  if (error) return <div className="container p-5 text-red-600">Error: {error}</div>;

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
        <div className="flex-row gap-2">
          <Link to="/profile" className="btn btn-ghost">My Profile</Link>
          <button onClick={() => pb.authStore.clear()} className="btn btn-ghost">Logout</button>
        </div>
      }
      maxWidth="1200px"
    >
      <PublicLogo />
      <div className="py-4">
        {nextEvent && (
          <section className="hidden max-md:mb-6 max-md:block" aria-label="Singer quick actions">
            <AppCard className="rounded-lg bg-surface/80 p-6 shadow-sm backdrop-blur-sm">
              <div className="flex flex-col gap-2">
                <div className="text-[0.72rem] font-extrabold tracking-widest text-text-muted uppercase">Next up</div>
                <div className="text-lg leading-tight font-extrabold text-text">{nextEvent.title || nextEvent.type}</div>
                <div className="text-sm text-text-muted">
                  {getFormattedDate(nextEvent.date)}
                  {nextEvent.expand?.venue?.name ? ` • ${nextEvent.expand.venue.name}` : ''}
                </div>

                <div className="grid grid-cols-2 gap-2">
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
                  <div className="text-muted mt-4 w-full rounded border border-dashed border-white/30 p-2 text-center text-xs">
                    🚫 Excused (Parent Performance Declined)
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
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
                      <div className="text-muted mt-1 text-center text-xs">
                        {nextEvent.type === 'Performance' 
                          ? 'The RSVP window for this performance is closed.' 
                          : 'This rehearsal has already passed.'}
                      </div>
                    )}
                  </>
                )}

                {(activePolls.length > 0 || latestAnnouncement) && (
                  <div className="flex flex-col gap-1 border-t border-border pt-1 text-xs text-text-muted">
                    {activePolls.length > 0 && (
                      <span>{activePolls.length} active poll{activePolls.length === 1 ? '' : 's'}</span>
                    )}
                    {latestAnnouncement && (
                      <button
                        type="button"
                        className="font-[inherit] cursor-pointer border-0 bg-transparent p-0 text-left font-bold text-primary"
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

        <div className="grid grid-cols-[1fr_340px] items-start gap-8 max-md:grid-cols-1 max-md:gap-6">
          
          {/* Main timeline panel: Events */}
          <div className="flex-col gap-6">
            <h2 className="m-0 mb-1 text-2xl font-bold text-text">Upcoming Events</h2>
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
              <div className="card flex flex-col items-center justify-center rounded-lg bg-surface/80 p-6 py-12 text-text-muted shadow-sm backdrop-blur-sm">
                <p className="text-muted">No upcoming events at this time.</p>
              </div>
            )}
          </div>

          {/* Right sidebar: Quick widgets */}
          <div className="flex-col gap-6">
            
            {/* Quick Polls Widget */}
            {activePolls.length > 0 && (
              <AppCard className="rounded-lg bg-surface/80 p-6 shadow-sm backdrop-blur-sm" title="📊 Quick Polls">
                <div className="flex-col gap-2">
                  {activePolls.map(poll => (
                    <div key={poll.id} className="card flex flex-col gap-1 border border-border p-2 shadow-none">
                      <div className="text-sm font-bold">{poll.question}</div>
                      <div className="flex-row gap-1">
                        <button 
                          className="btn btn-sm flex-1 border border-border font-bold" 
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
                          className="btn btn-sm flex-1 border border-border font-bold" 
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
            <AppCard className="rounded-lg bg-surface/80 p-6 shadow-sm backdrop-blur-sm" title="✉️ Bulletins">
              {isAnnouncementsLoading ? (
                <div className="text-muted p-4 text-center">Loading bulletins...</div>
              ) : announcements.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {announcements.map(ann => (
                    <div 
                      key={ann.id} 
                      className="cursor-pointer rounded-r-md border-y border-r border-l-[3px] border-border border-l-primary bg-surface p-4 transition-all duration-200 hover:translate-x-[3px] hover:bg-primary-light"
                      onClick={() => setSelectedAnnouncement(ann)}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="max-w-[180px] truncate text-sm font-bold text-text">{ann.subject || 'Choir Update'}</span>
                        <span className="text-xs text-text-muted">{getFormattedDate(ann.created)}</span>
                      </div>
                      <div 
                        className="line-clamp-2 text-xs text-text-muted"
                        dangerouslySetInnerHTML={{ 
                          __html: sanitizeHtml(ann.content).replace(/<[^>]*>/g, '').slice(0, 100) + '...' 
                        }} 
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted p-4 text-center">No recent updates.</div>
              )}
            </AppCard>

            {/* Resources Widget */}
            <AppCard className="rounded-lg bg-surface/80 p-6 shadow-sm backdrop-blur-sm" title="📂 Resources">
              {isResourcesLoading ? (
                <div className="text-muted p-4 text-center">Loading resources...</div>
              ) : resources.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {resources.map(res => {
                    const href = res.url || (res.file ? resourceService.getResourceFileUrl(res, res.file) : '#');
                    return (
                      <a 
                        key={res.id}
                        href={href} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center gap-2 rounded-md border border-border bg-[rgba(74,124,89,0.02)] p-[10px_12px] text-sm font-semibold text-text no-underline transition-all duration-200 hover:translate-x-[2px] hover:border-primary hover:bg-primary-light hover:text-primary-deep"
                      >
                        <span className="text-xl">{res.url ? '🔗' : '📄'}</span> {res.title}
                      </a>
                    );
                  })}
                </div>
              ) : (
                <div className="text-muted p-4 text-center">No resources available.</div>
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
          <div className="flex-col gap-4">
            <div className="text-muted -mt-2 text-xs">
              Dispatched on {getFormattedDate(selectedAnnouncement.created)}
            </div>
            <div className="message-preview-content max-h-[60vh] overflow-y-auto">
              {/* Secure content rendering */}
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedAnnouncement.content) }} />
            </div>
          </div>
        )}
      </BaseModal>
    </PageLayout>
  );
}
