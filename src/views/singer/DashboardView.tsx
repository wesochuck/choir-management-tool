import { pb } from '../../lib/pocketbase';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { useMyEvents } from '../../hooks/useMyEvents';
import { EventCard } from '../../components/singer/EventCard';
import PublicLogo from '../../components/common/PublicLogo';
import { PageLayout } from '../../components/common/PageLayout';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { pollService } from '../../services/pollService';
import { AppCard } from '../../components/common/AppCard';
import { communicationService, type MessageRecord } from '../../services/communicationService';
import { sanitizeHtml } from '../../lib/textSafety';
import { useDialog } from '../../contexts/DialogContext';
import { resourceService } from '../../services/resourceService';
import { settingsService } from '../../services/settingsService';
import { Button, Modal } from '../../components/ui';
import { duesService, type SeasonalDue } from '../../services/duesService';
import { seasonService } from '../../services/seasonService';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { useSetup } from '../../contexts/SetupContext';

export default function DashboardView() {
  const queryClient = useQueryClient();
  const dialog = useDialog();
  const { user, logout } = useAuth();
  const { performerLabel } = useChoirSettings();
  const { enabledModules } = useSetup();
  const pollsEnabled = enabledModules.has('polls');
  const communicationsEnabled = enabledModules.has('communications');
  const resourcesEnabled = enabledModules.has('resources');
  const musicLibraryEnabled = enabledModules.has('musicLibrary');
  const seatingEnabled = enabledModules.has('seating');
  const rosterEnabled = enabledModules.has('roster');
  const { events, myRosters, myProfile, isLoading, error, updateRSVP } = useMyEvents();
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<MessageRecord | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [submittingRsvpStatus, setSubmittingRsvpStatus] = useState<'Yes' | 'No' | null>(null);

  const pollsQuery = useQuery({
    queryKey: queryKeys.polls.active,
    queryFn: () => pollService.getActivePollsForSinger(myProfile!.id),
    enabled: pollsEnabled && !!myProfile?.id,
  });

  const activePolls = useMemo(() => {
    const now = new Date();
    return (pollsQuery.data ?? []).filter((poll) => {
      const isExpired = poll.archiveAt ? new Date(poll.archiveAt.replace(' ', 'T')) < now : false;
      if (isExpired) return false;
      if (!poll.eventId) return true;
      const event = events.find((e) => e.id === poll.eventId);
      if (!event) return true;
      return new Date(event.date) > now;
    });
  }, [pollsQuery.data, events]);

  const announcementsQuery = useQuery({
    queryKey: queryKeys.announcements.forProfile(myProfile?.id ?? ''),
    queryFn: async () => {
      const list = await communicationService.getMessages();
      const filtered = list.filter((msg) => msg.recipients?.some((r) => r.id === myProfile!.id));
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
          return { ...msg, content };
        })
      );
      return resolved;
    },
    enabled: communicationsEnabled && !!myProfile?.id,
  });
  const announcements = announcementsQuery.data ?? [];

  const resourcesQuery = useQuery({
    queryKey: queryKeys.resources.list(),
    queryFn: () => resourceService.getResources(),
    enabled: resourcesEnabled,
  });
  const resources = resourcesQuery.data ?? [];

  const rosterSettingsQuery = useQuery({
    queryKey: queryKeys.appSettings.roster,
    queryFn: () => settingsService.getRosterSettings(),
    enabled: rosterEnabled,
  });
  const maxRehearsalMisses = rosterSettingsQuery.data?.maxRehearsalMisses ?? 3;

  const directorySettingsQuery = useQuery({
    queryKey: queryKeys.appSettings.directory,
    queryFn: () => settingsService.getDirectorySettings(),
    staleTime: 5 * 60_000,
  });
  const showDirectoryButton =
    enabledModules.has('directory') &&
    (directorySettingsQuery.data?.enabled !== false || user?.role === 'admin');

  const activeSeasonQuery = useQuery({
    queryKey: ['activeSeason'],
    queryFn: () => seasonService.getActiveSeason(),
    staleTime: 5 * 60_000,
  });
  const activeSeason = activeSeasonQuery.data;

  const myDuesQuery = useQuery({
    queryKey: queryKeys.dues.bySeason(activeSeason?.id ?? ''),
    queryFn: async () => {
      if (!activeSeason || !myProfile) return null;
      try {
        const record = await pb
          .collection('seasonalDues')
          .getFirstListItem<SeasonalDue>(
            `profile = "${myProfile.id}" && season = "${activeSeason.id}"`
          );
        return record;
      } catch {
        return null; // Not found = unpaid
      }
    },
    enabled: !!activeSeason && !!myProfile,
  });

  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  const handlePayDues = async () => {
    if (!myProfile || !activeSeason) return;
    try {
      setIsCheckoutLoading(true);
      const cancelPath = window.location.pathname;
      const url = await duesService.createCheckoutSession(
        myProfile.id,
        activeSeason.id,
        cancelPath
      );
      window.location.href = url;
    } catch (err: unknown) {
      dialog.showToast(err instanceof Error ? err.message : 'Failed to start checkout');
      setIsCheckoutLoading(false);
    }
  };

  useEffect(() => {
    setCurrentTime(Date.now());
  }, [events]);

  const pollMutation = useMutation({
    mutationFn: ({
      pollId,
      profileId,
      status,
    }: {
      pollId: string;
      profileId: string;
      status: 'Yes' | 'No';
    }) => pollService.submitResponseLoggedIn(pollId, profileId, status),
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to submit poll response';
      dialog.showToast(message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.polls.active });
    },
  });

  const handlePollResponse = (pollId: string, status: 'Yes' | 'No') => {
    if (!myProfile?.id) return;
    pollMutation.mutate({ pollId, profileId: myProfile.id, status });
  };

  const handleUpdateRSVP = async (eventId: string, rsvp: 'Yes' | 'No') => {
    const event = events.find((e) => e.id === eventId);
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
          maxLength: 1000,
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

  if (isLoading && events.length === 0)
    return <div className="container pt-8 text-center">Loading your events...</div>;
  if (error) return <div className="container p-5 text-red-600">Error: {error}</div>;

  const upcomingEvents = events.filter((e) => new Date(e.date) >= new Date());

  const nextEvent = upcomingEvents[0] ?? null;
  const remainingUpcomingEvents = nextEvent
    ? upcomingEvents.filter((event) => event.id !== nextEvent.id)
    : upcomingEvents;
  const nextRoster = nextEvent ? myRosters[nextEvent.id] : undefined;
  const isNextEventParentPerformanceDeclined =
    nextEvent?.type === 'Rehearsal' &&
    nextEvent.parentPerformanceId &&
    myRosters[nextEvent.parentPerformanceId]?.rsvp === 'No';
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

  const isNextEventClosed = nextEvent
    ? nextEvent.type === 'Performance'
      ? !nextEvent.isOpenForRSVP
      : new Date(nextEvent.date).getTime() < currentTime
    : false;

  const nextEventLabels =
    nextEvent?.type === 'Rehearsal'
      ? {
          yes: nextRoster?.rsvp === 'Yes' ? '✓ Attending' : "I'll be there",
          no: nextRoster?.rsvp === 'No' ? '✗ Absence Reported' : 'Report absence',
        }
      : {
          yes: nextRoster?.rsvp === 'Yes' ? '✓ Attending' : 'Attend',
          no: nextRoster?.rsvp === 'No' ? '✗ Declining' : 'Decline',
        };

  return (
    <PageLayout
      title={`${performerLabel} Dashboard`}
      actions={
        <div className="flex flex-row gap-2">
          {showDirectoryButton && (
            <Button as={Link} to="/directory" variant="outline">
              {performerLabel} Directory
            </Button>
          )}
          <Button as={Link} to="/profile" variant="outline">
            My Profile
          </Button>
          <Button onClick={logout} variant="outline">
            Logout
          </Button>
        </div>
      }
      maxWidth="1200px"
    >
      <PublicLogo />
      <div className="py-4">
        {nextEvent && (
          <section
            className="hidden max-md:mb-6 max-md:block"
            aria-label={`${performerLabel} quick actions`}
          >
            <AppCard className="bg-surface/80 rounded-lg p-6 shadow-sm backdrop-blur-sm">
              <div className="flex flex-col gap-2">
                <div className="text-text-muted text-[0.72rem] font-extrabold tracking-widest uppercase">
                  Next up
                </div>
                <div className="text-text text-lg leading-tight font-extrabold">
                  {nextEvent.title || nextEvent.type}
                </div>
                <div className="text-text-muted text-sm">
                  {getFormattedDate(nextEvent.date)}
                  {nextEvent.expand?.venue?.name ? ` • ${nextEvent.expand.venue.name}` : ''}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {musicLibraryEnabled && (
                    <Button as={Link} to={`/player?eventId=${nextEvent.id}`} variant="primary">
                      🎵 Practice
                    </Button>
                  )}

                  {seatingEnabled && nextEvent?.type === 'Performance' && (
                    <Button as={Link} to={`/seating/${nextEvent.id}`} variant="secondary">
                      🪑 Seating
                    </Button>
                  )}
                </div>

                {isNextEventParentPerformanceDeclined ? (
                  <div className="text-muted mt-4 w-full rounded border border-dashed border-white/30 p-2 text-center text-xs">
                    🚫 Excused (Parent Performance Declined)
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        onClick={() => handleUpdateRSVP(nextEvent.id, 'Yes')}
                        variant={nextRoster?.rsvp === 'Yes' ? 'primary' : 'outline'}
                        size="small"
                        disabled={isNextEventClosed || submittingRsvpStatus !== null}
                      >
                        {submittingRsvpStatus === 'Yes' ? 'Processing...' : nextEventLabels.yes}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleUpdateRSVP(nextEvent.id, 'No')}
                        variant={nextRoster?.rsvp === 'No' ? 'danger' : 'outline'}
                        size="small"
                        disabled={isNextEventClosed || submittingRsvpStatus !== null}
                      >
                        {submittingRsvpStatus === 'No' ? 'Processing...' : nextEventLabels.no}
                      </Button>
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
                  <div className="border-border text-text-muted flex flex-col gap-1 border-t pt-1 text-xs">
                    {activePolls.length > 0 && (
                      <span>
                        {activePolls.length} active poll{activePolls.length === 1 ? '' : 's'}
                      </span>
                    )}
                    {latestAnnouncement && (
                      <button
                        type="button"
                        className="text-primary cursor-pointer border-0 bg-transparent p-0 text-left font-[inherit] font-bold"
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
          <div className="flex flex-col gap-6">
            {/* Desktop: show all upcoming events */}
            <div className="max-md:hidden">
              <h2 className="text-text m-0 mb-1 text-2xl font-bold">Upcoming Events</h2>
              {upcomingEvents.map((e) => (
                <EventCard
                  key={e.id}
                  event={e}
                  rsvp={myRosters[e.id]?.rsvp}
                  onRSVP={(rsvp) => handleUpdateRSVP(e.id, rsvp)}
                  allEvents={events}
                  myRosters={myRosters}
                  maxRehearsalMisses={maxRehearsalMisses}
                  musicLibraryEnabled={musicLibraryEnabled}
                  seatingEnabled={seatingEnabled}
                />
              ))}
            </div>

            {/* Mobile: show remaining events (nextEvent is shown in Next Up card) */}
            {remainingUpcomingEvents.length > 0 && (
              <div className="hidden max-md:flex max-md:flex-col max-md:gap-6">
                <h2 className="text-text m-0 mb-1 text-2xl font-bold">More Upcoming Events</h2>
                {remainingUpcomingEvents.map((e) => (
                  <EventCard
                    key={e.id}
                    event={e}
                    rsvp={myRosters[e.id]?.rsvp}
                    onRSVP={(rsvp) => handleUpdateRSVP(e.id, rsvp)}
                    allEvents={events}
                    myRosters={myRosters}
                    maxRehearsalMisses={maxRehearsalMisses}
                    musicLibraryEnabled={musicLibraryEnabled}
                    seatingEnabled={seatingEnabled}
                  />
                ))}
              </div>
            )}

            {upcomingEvents.length === 0 && (
              <div className="border-border bg-surface/80 text-text-muted flex flex-col items-center justify-center rounded-lg border p-6 py-12 shadow-sm backdrop-blur-sm">
                <p className="text-muted">No upcoming events at this time.</p>
              </div>
            )}
          </div>

          {/* Right sidebar: Quick widgets */}
          <div className="flex flex-col gap-6">
            {/* Pay Dues Widget */}
            {activeSeason && (!myDuesQuery.data || !myDuesQuery.data.paid) && (
              <AppCard
                className="bg-primary/5 border-primary/20 rounded-lg border p-6 shadow-sm"
                title="💳 Season Dues"
              >
                <div className="flex flex-col gap-3">
                  <p className="text-text-muted text-sm leading-snug">
                    Dues for the <strong>{activeSeason.name}</strong> season are currently being
                    collected. Your payment status is:{' '}
                    <strong className="text-danger-text">Unpaid</strong>.
                  </p>
                  <Button
                    onClick={handlePayDues}
                    variant="primary"
                    className="w-full justify-center"
                    disabled={isCheckoutLoading}
                  >
                    {isCheckoutLoading
                      ? 'Starting Checkout...'
                      : `Pay ${(activeSeason.duesAmountCents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} via Card`}
                  </Button>
                  <p className="text-text-muted text-center text-xs">
                    You can also pay in person with cash/check.
                  </p>
                </div>
              </AppCard>
            )}

            {/* Quick Polls Widget */}
            {activePolls.length > 0 && (
              <AppCard
                className="bg-surface/80 rounded-lg p-6 shadow-sm backdrop-blur-sm"
                title="📊 Quick Polls"
              >
                <div className="flex flex-col gap-2">
                  {activePolls.map((poll) => (
                    <div
                      key={poll.id}
                      className="border-border flex flex-col gap-1 rounded-xl border p-2 shadow-none"
                    >
                      <div className="text-sm font-bold">{poll.question}</div>
                      <div className="flex flex-row gap-1">
                        <Button
                          size="small"
                          variant={poll.status === 'Yes' ? 'primary' : 'outline'}
                          className="border-border flex-1 border font-bold"
                          onClick={() => handlePollResponse(poll.id, 'Yes')}
                        >
                          {poll.status === 'Yes' ? '✓ Yes' : 'Yes'}
                        </Button>
                        <Button
                          size="small"
                          variant={poll.status === 'No' ? 'danger' : 'outline'}
                          className="border-border flex-1 border font-bold"
                          onClick={() => handlePollResponse(poll.id, 'No')}
                        >
                          {poll.status === 'No' ? '✗ No' : 'No'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </AppCard>
            )}

            {/* Recent Announcements Widget */}
            {communicationsEnabled && (
              <AppCard
                className="bg-surface/80 rounded-lg p-6 shadow-sm backdrop-blur-sm"
                title="✉️ Bulletins"
              >
                {announcementsQuery.isLoading ? (
                  <div className="text-muted p-4 text-center">Loading bulletins...</div>
                ) : announcements.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {announcements.map((ann) => (
                      <div
                        key={ann.id}
                        className="border-border border-l-primary bg-surface hover:bg-primary-light cursor-pointer rounded-r-md border-y border-r border-l-[3px] p-4 transition-all duration-200 hover:translate-x-[3px]"
                        onClick={() => setSelectedAnnouncement(ann)}
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-text max-w-[180px] truncate text-sm font-bold">
                            {ann.subject || 'Choir Update'}
                          </span>
                          <span className="text-text-muted text-xs">
                            {getFormattedDate(ann.created)}
                          </span>
                        </div>
                        <div
                          className="text-text-muted line-clamp-2 text-xs"
                          dangerouslySetInnerHTML={{
                            __html:
                              sanitizeHtml(ann.content)
                                .replace(/<[^>]*>/g, '')
                                .slice(0, 100) + '...',
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted p-4 text-center">No recent updates.</div>
                )}
              </AppCard>
            )}

            {/* Resources Widget */}
            {resourcesEnabled && (
              <AppCard
                className="bg-surface/80 rounded-lg p-6 shadow-sm backdrop-blur-sm"
                title="📂 Resources"
              >
                {resourcesQuery.isLoading ? (
                  <div className="text-muted p-4 text-center">Loading resources...</div>
                ) : resources.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {resources.map((res) => {
                      const href =
                        res.url ||
                        (res.file ? resourceService.getResourceFileUrl(res, res.file) : '#');
                      return (
                        <a
                          key={res.id}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="border-border text-text hover:border-primary hover:bg-primary-light hover:text-primary-deep flex items-center gap-2 rounded-md border bg-[rgba(74,124,89,0.02)] p-[10px_12px] text-sm font-semibold no-underline transition-all duration-200 hover:translate-x-[2px]"
                        >
                          <span className="text-xl" aria-hidden="true">
                            {res.url ? '🔗' : '📄'}
                          </span>{' '}
                          {res.title}
                        </a>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-muted p-4 text-center">No resources available.</div>
                )}
              </AppCard>
            )}
          </div>
        </div>
      </div>

      {/* Announcement modal */}
      <Modal
        isOpen={!!selectedAnnouncement}
        onClose={() => setSelectedAnnouncement(null)}
        title={selectedAnnouncement?.subject || 'Bulletin details'}
        maxWidth="600px"
        footer={
          <Button
            type="button"
            onClick={() => setSelectedAnnouncement(null)}
            variant="secondary"
            size="small"
          >
            Close
          </Button>
        }
      >
        {selectedAnnouncement && (
          <div className="flex flex-col gap-4">
            <div className="text-muted -mt-2 text-xs">
              Dispatched on {getFormattedDate(selectedAnnouncement.created)}
            </div>
            <div className="text-body max-h-[60vh] overflow-y-auto leading-relaxed">
              {/* Secure content rendering */}
              <div
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedAnnouncement.content) }}
              />
            </div>
          </div>
        )}
      </Modal>
    </PageLayout>
  );
}
