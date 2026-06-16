import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { Button, FormField, Badge, Modal, EmptyState, Input } from '../../components/ui';
import { pb } from '../../lib/pocketbase';
import { useEvents } from '../../hooks/useEvents';
import { formatInTimezone } from '../../lib/timezone';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { useDialog } from '../../contexts/DialogContext';
import { profileService } from '../../services/profileService';
import {
  communicationService,
  type CommunicationRecipient,
  type MessageRecord,
} from '../../services/communicationService';
import type { RecordModel } from 'pocketbase';
import { settingsService, type PollSettings } from '../../services/settingsService';
import { Pagination } from '../../components/common/Pagination';

interface PollRecord extends RecordModel {
  question: string;
  eventId?: string;
  archiveAt?: string;
  created?: string;
  updated?: string;
}

interface PollResponseRecord extends RecordModel {
  pollId: string;
  profileId: string;
  status: 'Yes' | 'No';
  expand?: {
    profileId: {
      name: string;
      voicePart: string;
    };
  };
}

export default function PollsDashboardView() {
  const dialog = useDialog();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { events } = useEvents();
  const { timezone } = useChoirSettings();

  // ── Data queries ──
  const pollsQuery = useQuery({
    queryKey: queryKeys.polls.list,
    queryFn: () => pb.collection('polls').getFullList<PollRecord>({ sort: '-created' }),
  });

  const responsesQuery = useQuery({
    queryKey: queryKeys.polls.responses,
    queryFn: () => pb.collection('pollResponses').getFullList<PollResponseRecord>({ expand: 'profileId', sort: '-updated' }),
  });

  const pollMessagesQuery = useQuery({
    queryKey: queryKeys.polls.messages,
    queryFn: () => pb.collection('messages').getFullList<MessageRecord>({
      filter: 'status = "Sent" && content ~ "{{POLL_LINK:"',
    }),
  });

  const pollSettingsQuery = useQuery({
    queryKey: queryKeys.polls.settings,
    queryFn: () => settingsService.getPollSettings(),
  });

  const refresh = () => {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.polls.list }),
      queryClient.invalidateQueries({ queryKey: queryKeys.polls.responses }),
      queryClient.invalidateQueries({ queryKey: queryKeys.polls.messages }),
      queryClient.invalidateQueries({ queryKey: queryKeys.polls.settings }),
    ]);
  };

  const polls = useMemo(() => pollsQuery.data ?? [], [pollsQuery.data]);
  const responses = useMemo(() => responsesQuery.data ?? [], [responsesQuery.data]);
  const pollMessages = pollMessagesQuery.data ?? [];
  const isLoading = pollsQuery.isLoading || responsesQuery.isLoading || pollMessagesQuery.isLoading || pollSettingsQuery.isLoading;
  const firstError = pollsQuery.error || responsesQuery.error || pollMessagesQuery.error || pollSettingsQuery.error;
  const loadError = firstError
    ? (firstError instanceof Error ? firstError.message : 'Unable to load polls.')
    : null;
  const [recipientModal, setRecipientModal] = useState<{
    isOpen: boolean;
    recipients: CommunicationRecipient[];
    title: string;
  }>({
    isOpen: false,
    recipients: [],
    title: '',
  });
  const [showArchived, setShowArchived] = useState(false);
  const [expandedPollId, setExpandedPollId] = useState<string | null>(null);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [quickCreateStep, setQuickCreateStep] = useState<1 | 2>(1);
  const [quickPollQuestion, setQuickPollQuestion] = useState('');
  const [isCreatingQuickPoll, setIsCreatingQuickPoll] = useState(false);

  // Auto-Archive and Pagination States
  const [pollSettings, setPollSettings] = useState<PollSettings>({ defaultAutoArchiveDays: 3 });
  const [globalDefaultDays, setGlobalDefaultDays] = useState(3);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [quickPollDays, setQuickPollDays] = useState(3);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Initialize local settings state from query (only when modal is closed, to avoid
  // overwriting in-progress edits if a background refetch lands).
  useEffect(() => {
    if (pollSettingsQuery.data && !isSettingsModalOpen) {
      setPollSettings(pollSettingsQuery.data);
      setGlobalDefaultDays(pollSettingsQuery.data.defaultAutoArchiveDays);
    }
  }, [pollSettingsQuery.data, isSettingsModalOpen]);

  useEffect(() => {
    setCurrentPage(1);
  }, [showArchived, polls.length]);

  const filteredPolls = useMemo(() => {
    const now = new Date();
    return polls.filter((poll) => {
      // Auto-archive check
      const isExpired = poll.archiveAt ? new Date(poll.archiveAt.replace(' ', 'T')) < now : false;

      if (showArchived) return true;
      if (isExpired) return false;

      if (!poll.eventId) return true; // Polls without events stay active
      const event = events.find((e) => e.id === poll.eventId);
      if (!event) return true;
      return new Date(event.date) > now;
    });
  }, [polls, events, showArchived]);

  const paginatedPolls = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredPolls.slice(startIndex, startIndex + pageSize);
  }, [filteredPolls, currentPage, pageSize]);

  const pollStats = useMemo(() => {
    const stats: Record<
      string,
      { yes: number; no: number; volunteers: PollResponseRecord[]; decliners: PollResponseRecord[] }
    > = {};

    polls.forEach((p) => {
      stats[p.id] = { yes: 0, no: 0, volunteers: [], decliners: [] };
    });

    responses.forEach((r) => {
      if (stats[r.pollId]) {
        if (r.status === 'Yes') {
          stats[r.pollId].yes++;
          stats[r.pollId].volunteers.push(r);
        } else {
          stats[r.pollId].no++;
          stats[r.pollId].decliners.push(r);
        }
      }
    });

    return stats;
  }, [polls, responses]);

  const handleDeletePoll = async (id: string) => {
    const confirmed = await dialog.confirm({
      title: 'Delete Poll',
      message: 'Are you sure you want to delete this poll and all its responses?',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await pb.collection('polls').delete(id);
      refresh();
      dialog.showToast('Poll deleted.');
    } catch {
      await dialog.showMessage({
        title: 'Delete Failed',
        message: 'Failed to delete poll.',
        variant: 'danger',
      });
    }
  };

  const openQuickCreate = () => {
    setQuickCreateStep(1);
    setQuickPollQuestion('');
    setQuickPollDays(pollSettings.defaultAutoArchiveDays);
    setIsQuickCreateOpen(true);
  };

  const handleQuickCreateAndOpenReview = async () => {
    const trimmedQuestion = quickPollQuestion.trim();
    if (!trimmedQuestion) return;

    setIsCreatingQuickPoll(true);
    try {
      // Calculate archive target timestamp
      const archiveAt = new Date(Date.now() + quickPollDays * 24 * 60 * 60 * 1000).toISOString();

      // 1. Create the poll record
      const poll = await pb.collection('polls').create<PollRecord>({
        question: trimmedQuestion,
        archiveAt,
      });

      // 2. Build recipients (active/idle singers)
      const profiles = await profileService.getProfiles();
      const recipients: CommunicationRecipient[] = profiles
        .filter((profile) => profile.globalStatus === 'Active' || profile.globalStatus === 'Idle')
        .map((profile) => ({
          id: profile.id,
          name: profile.name,
          email: profile.expand?.user?.email || '',
          phone: profile.phone || '',
          voicePart: profile.voicePart,
          globalStatus: profile.globalStatus,
        }));

      const subject = 'Quick Choir Poll';
      const content = `Hi {singerName},\n\nPlease tap below to answer:\n{{POLL_LINK:${poll.id}}}\n\nThank you!`;

      // 3. Save immediately as a draft so it shows up in the Drafts badge
      const draft = await communicationService.saveDraft({
        subject,
        content,
        type: 'Email',
        recipients,
        filters: { eventId: '', rsvp: 'All', voiceParts: [], globalStatus: 'Active' },
      });

      setIsQuickCreateOpen(false);
      refresh();

      // 4. Navigate to Communications → Drafts tab, passing the draft ID and poll question
      // so the preview can show the actual question without the fallback text.
      navigate('/admin/communications', {
        state: {
          openDraftId: draft.id,
          initialPollQuestions: { [poll.id]: trimmedQuestion },
          returnToPolls: true,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create quick poll workflow.';
      await dialog.showMessage({
        title: 'Quick Create Failed',
        message,
        variant: 'danger',
      });
    } finally {
      setIsCreatingQuickPoll(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await settingsService.savePollSettings({ defaultAutoArchiveDays: globalDefaultDays });
      setPollSettings({ defaultAutoArchiveDays: globalDefaultDays });
      setIsSettingsModalOpen(false);
      dialog.showToast('Poll settings saved successfully.');
    } catch {
      await dialog.showMessage({
        title: 'Error',
        message: 'Failed to save poll settings.',
        variant: 'danger',
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Helper to render expanded poll details (shared between desktop and mobile)
  const renderPollDetails = (poll: PollRecord, stat: (typeof pollStats)[string]) => {
    const contactedSingers = (() => {
      const contactedMap = new Map<string, CommunicationRecipient>();
      const msgs = pollMessages.filter((msg) => msg.content.includes(`{{POLL_LINK:${poll.id}}}`));
      msgs.forEach((msg) => {
        if (Array.isArray(msg.recipients)) {
          msg.recipients.forEach((rec) => {
            contactedMap.set(rec.id, rec);
          });
        }
      });
      return Array.from(contactedMap.values());
    })();

    return (
      <div className="flex flex-col gap-6 border-t border-slate-100 bg-slate-50/30 p-6 px-6 text-left md:px-8">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
            <span>📨</span>
            {contactedSingers.length > 0 ? (
              <span>
                Sent to {contactedSingers.length} singer{contactedSingers.length !== 1 ? 's' : ''}{' '}
                via Communications.
              </span>
            ) : (
              <span>
                No sent communications found yet.{' '}
                <button
                  type="button"
                  className="font-semibold text-primary underline hover:text-primary-deep"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/admin/communications');
                  }}
                >
                  Communications page
                </button>
              </span>
            )}
          </div>
          {contactedSingers.length > 0 && (
            <button
              type="button"
              className="text-left text-xs font-bold text-primary underline transition-colors hover:text-primary-deep sm:text-right"
              onClick={() =>
                setRecipientModal({
                  isOpen: true,
                  recipients: contactedSingers,
                  title: `Contacted Singers — ${poll.question}`,
                })
              }
            >
              View Contacted List →
            </button>
          )}
        </div>

        <div className="flex flex-col gap-8 md:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <h4 className="m-0 border-b-2 border-primary/20 pb-1.5 text-sm font-black tracking-wider text-primary uppercase">
              Volunteers ({stat.yes})
            </h4>
            {stat.volunteers.length === 0 ? (
              <p className="m-0 text-sm font-medium text-slate-400 italic">No volunteers yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {stat.volunteers.map((v) => (
                  <div
                    key={v.id}
                    className="rounded-lg border border-slate-100 bg-white p-2.5 px-4 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="text-sm font-bold text-slate-800">
                      {v.expand?.profileId.name}
                    </div>
                    <div className="text-[0.7rem] font-bold tracking-wide text-slate-400 uppercase">
                      {v.expand?.profileId.voicePart}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <h4 className="m-0 border-b-2 border-danger-text/20 pb-1.5 text-sm font-black tracking-wider text-danger-text uppercase">
              Declined ({stat.no})
            </h4>
            {stat.decliners.length === 0 ? (
              <p className="m-0 text-sm font-medium text-slate-400 italic">No decliners yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {stat.decliners.map((v) => (
                  <div
                    key={v.id}
                    className="rounded-lg border border-danger-text/10 bg-white p-2.5 px-4 opacity-90 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="text-sm font-bold text-slate-800">
                      {v.expand?.profileId?.name ?? 'Unknown singer'}
                    </div>
                    <div className="text-[0.7rem] font-bold tracking-wide text-slate-400 uppercase">
                      {v.expand?.profileId?.voicePart ?? ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading && polls.length === 0) {
    return (
      <div className="flex w-full flex-col p-6">
        <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white py-12 shadow-sm">
          <p className="font-medium text-slate-500">Loading polls...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Header Area */}
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
          Engagement Polls & Volunteering
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
          Review volunteer responses, coordinate singer feedback, and draft quick engagement
          messages.
        </p>
      </div>

      {/* Tabs / Actions Navigation Bar */}
      <div className="flex w-full flex-row items-center justify-between border-b border-slate-200 pb-px">
        <div className="flex items-center gap-3 pb-1.5">
          <label className="flex cursor-pointer flex-row items-center gap-2 text-sm font-semibold text-slate-700 select-none">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="size-4 rounded-sm border-slate-300 text-primary focus:ring-primary focus:ring-offset-0"
            />
            Show Archived
          </label>
        </div>
        <div className="flex items-center gap-2 pb-1.5">
          <Button
            variant="secondary"
            className=""
            onClick={() => setIsSettingsModalOpen(true)}
            title="Settings"
            icon={
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            }
          >
            <span className="hidden md:inline">Settings</span>
          </Button>
          <Button
            variant="primary"
            className="animate-pulse-once"
            onClick={openQuickCreate}
            title="Start New Poll"
            icon={
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            }
          >
            <span className="hidden md:inline">Start New Poll</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {loadError && (
          <div className="rounded-lg border border-danger-text/30 bg-danger-bg p-5 text-left shadow-xs">
            <p className="m-0 font-bold text-danger-text">{loadError}</p>
          </div>
        )}

        {filteredPolls.length === 0 ? (
          <EmptyState
            title="No Active Polls Found"
            description={
              showArchived
                ? 'No polls have been created yet.'
                : "No active engagement polls are available. Check 'Show Archived' to view past polls."
            }
            icon="🗳️"
            action={
              <Button variant="primary" onClick={openQuickCreate} size="small">
                + Start New Poll
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-6">
            {/* Desktop View */}
            <div className="hidden overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm md:block">
              <div className="divide-y divide-slate-100">
                {paginatedPolls.map((poll) => {
                  const stat = pollStats[poll.id];
                  const isExpanded = expandedPollId === poll.id;
                  const event = poll.eventId ? events.find((e) => e.id === poll.eventId) : null;
                  const isArchived =
                    (event ? new Date(event.date) < new Date() : false) ||
                    (poll.archiveAt
                      ? new Date(poll.archiveAt.replace(' ', 'T')) < new Date()
                      : false);
                  const createdLabel = poll.created
                    ? formatInTimezone(poll.created, timezone, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : null;
                  const archiveLabel = poll.archiveAt
                    ? formatInTimezone(poll.archiveAt, timezone, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : null;

                  return (
                    <div key={poll.id} className="transition-colors hover:bg-slate-50/20">
                      <div
                        role="button"
                        tabIndex={0}
                        className={`flex cursor-pointer items-center justify-between gap-6 p-4 px-6 transition-all duration-150 select-none focus-visible:bg-slate-50/40 focus-visible:outline-none ${isExpanded ? 'bg-slate-50/40' : ''}`}
                        onClick={() => setExpandedPollId(isExpanded ? null : poll.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ')
                            setExpandedPollId(isExpanded ? null : poll.id);
                        }}
                      >
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5 text-left">
                          <div className="flex min-w-0 items-center gap-3">
                            <h3 className="m-0 truncate text-base font-bold tracking-tight text-slate-900">
                              {poll.question}
                            </h3>
                            {isArchived ? (
                              <Badge tone="neutral">Archived</Badge>
                            ) : (
                              <Badge tone="success">Active</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs font-semibold text-slate-400">
                            {createdLabel && (
                              <span className="flex items-center gap-1.5">
                                <span>📅</span> Created {createdLabel}
                              </span>
                            )}
                            {archiveLabel && (
                              <span
                                className="flex items-center gap-1.5"
                                title={`Auto-archives on ${formatInTimezone(poll.archiveAt!, timezone, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}`}
                              >
                                <span>⏱️</span> {isArchived ? 'Archived' : 'Auto-archives'}{' '}
                                {archiveLabel}
                              </span>
                            )}
                            {event && (
                              <span className="flex items-center gap-1.5">
                                <span>🎭</span> {event.title} (
                                {formatInTimezone(event.date, timezone, {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                                )
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-shrink-0 items-center gap-8">
                          <div
                            className="flex items-center gap-3"
                            aria-label="Poll response counts"
                          >
                            <div className="flex min-w-[56px] flex-col rounded-lg border border-primary/20 bg-primary/5 p-1.5 text-center shadow-xs">
                              <span className="text-lg leading-tight font-black text-primary">
                                {stat.yes}
                              </span>
                              <span className="text-overline text-primary">
                                Yes
                              </span>
                            </div>
                            <div className="flex min-w-[56px] flex-col rounded-lg border border-danger-text/20 bg-danger-bg p-1.5 text-center shadow-xs">
                              <span className="text-lg leading-tight font-black text-danger-text">
                                {stat.no}
                              </span>
                              <span className="text-overline text-danger-text">
                                No
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-500 transition-colors hover:text-slate-900">
                              {isExpanded ? '▲ Hide Details' : '▼ View Names'}
                            </span>
                            <Button
                              variant="danger"
                              size="small"
                              className=""
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePoll(poll.id);
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>

                      {isExpanded && renderPollDetails(poll, stat)}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile View */}
            <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm md:hidden">
              <div className="divide-y divide-slate-100">
                {paginatedPolls.map((poll) => {
                  const stat = pollStats[poll.id];
                  const isExpanded = expandedPollId === poll.id;
                  const event = poll.eventId ? events.find((e) => e.id === poll.eventId) : null;
                  const isArchived =
                    (event ? new Date(event.date) < new Date() : false) ||
                    (poll.archiveAt
                      ? new Date(poll.archiveAt.replace(' ', 'T')) < new Date()
                      : false);
                  const createdLabel = poll.created
                    ? formatInTimezone(poll.created, timezone, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : null;
                  const archiveLabel = poll.archiveAt
                    ? formatInTimezone(poll.archiveAt, timezone, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : null;

                  return (
                    <div key={poll.id} className="flex flex-col">
                      <div className="flex flex-col gap-3 p-4 text-left transition-colors hover:bg-slate-50/40">
                        {/* Row 1: Fine-grain dates and status badge */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-col gap-0.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                            {createdLabel && <span>Created: {createdLabel}</span>}
                            {archiveLabel && (
                              <span
                                title={`Auto-archives on ${formatInTimezone(poll.archiveAt!, timezone, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}`}
                              >
                                {isArchived ? 'Archived' : 'Expires'}: {archiveLabel}
                              </span>
                            )}
                          </div>
                          <Badge tone={isArchived ? 'neutral' : 'success'}>
                            {isArchived ? 'Archived' : 'Active'}
                          </Badge>
                        </div>

                        {/* Row 2: Question & Linked Event */}
                        <div className="flex flex-col gap-1">
                          <h3 className="text-sm leading-snug font-bold text-slate-900">
                            {poll.question}
                          </h3>
                          {event && (
                            <div className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
                              <span>🎭</span> {event.title} (
                              {formatInTimezone(event.date, timezone, {
                                month: 'short',
                                day: 'numeric',
                              })}
                              )
                            </div>
                          )}
                        </div>

                        {/* Row 3: Response summary stats */}
                        <div className="flex items-center gap-3">
                          <div className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 py-1.5 text-xs font-bold text-primary">
                            <span>{stat.yes}</span>
                            <span className="text-[10px] font-bold tracking-wider uppercase">
                              Yes
                            </span>
                          </div>
                          <div className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-danger-text/20 bg-danger-bg py-1.5 text-xs font-bold text-danger-text">
                            <span>{stat.no}</span>
                            <span className="text-[10px] font-bold tracking-wider uppercase">
                              No
                            </span>
                          </div>
                        </div>

                        {/* Row 4: Primary Actions */}
                        <div className="flex items-center gap-2 border-t border-slate-50 pt-1">
                          <Button
                            variant="secondary"
                            size="small"
                            className="flex-1"
                            onClick={() => setExpandedPollId(isExpanded ? null : poll.id)}
                          >
                            {isExpanded ? '▲ Hide Names' : '▼ View Names'}
                          </Button>
                          <Button
                            variant="danger"
                            size="small"
                            className=""
                            onClick={() => handleDeletePoll(poll.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>

                      {/* Expanded Section inside the mobile card */}
                      {isExpanded && renderPollDetails(poll, stat)}
                    </div>
                  );
                })}
              </div>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={Math.max(1, Math.ceil(filteredPolls.length / pageSize))}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      <Modal
        isOpen={isQuickCreateOpen}
        onClose={() => setIsQuickCreateOpen(false)}
        title={quickCreateStep === 1 ? 'Quick Create Poll' : 'Confirm & Open Review'}
        maxWidth="560px"
      >
        <div className="flex flex-col gap-6 py-2 text-left">
          {quickCreateStep === 1 ? (
            <>
              <p className="m-0 text-sm leading-relaxed font-medium text-slate-500">
                Create a poll and jump straight to Communications Review with a prefilled message.
              </p>
              <FormField label="Poll Question">
                <Input
                  id="quick-poll-question"
                  type="text"
                  className="block w-full shadow-sm transition-colors outline-none focus:ring-1 focus:ring-primary"
                  value={quickPollQuestion}
                  onChange={(e) => setQuickPollQuestion(e.target.value)}
                  placeholder="e.g. Who can help with setup?"
                  required
                />
              </FormField>
              <FormField label="Auto-Archive Poll in (Days)">
                <Input
                  id="quick-poll-days"
                  type="number"
                  min="1"
                  max="365"
                  className="block w-[120px] shadow-sm transition-colors outline-none focus:ring-1 focus:ring-primary"
                  value={quickPollDays}
                  onChange={(e) => setQuickPollDays(parseInt(e.target.value) || 1)}
                  required
                />
              </FormField>
              <div className="flex flex-col gap-4">
                <p className="m-0 text-xs font-medium text-slate-400">
                  Recipients default to all singers with status Active or Idle.
                </p>
                <div className="flex flex-row justify-end gap-3 border-t border-slate-100 pt-4">
                  <Button variant="secondary" onClick={() => setIsQuickCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    disabled={!quickPollQuestion.trim()}
                    onClick={() => setQuickCreateStep(2)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="m-0 text-sm leading-relaxed font-medium text-slate-500">
                We'll create this poll and save a pre-filled message to your{' '}
                <strong className="font-semibold text-slate-900">Drafts</strong>. You can review,
                edit, and send from the Communications page.
              </p>
              <div className="flex flex-col gap-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 shadow-sm">
                  <div className="mb-2 text-overline text-slate-400">
                    Poll Question
                  </div>
                  <strong className="text-lg font-extrabold tracking-tight text-slate-900">
                    {quickPollQuestion.trim()}
                  </strong>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 shadow-sm">
                  <div className="mb-2 text-overline text-slate-400">
                    Draft Preview
                  </div>
                  <div className="text-sm">
                    <strong className="text-slate-800">Subject:</strong> Quick Choir Poll
                  </div>
                  <div className="mt-3 rounded-md border border-slate-200 bg-white p-3 text-xs whitespace-pre-wrap text-slate-500 italic">{`Hi everyone,\n\nPlease tap below to answer:\n{{POLL_LINK:newPollId}}\n\nThank you!`}</div>
                </div>
              </div>
              <div className="flex flex-row justify-end gap-3 border-t border-slate-100 pt-4">
                <Button
                  variant="secondary"
                  disabled={isCreatingQuickPoll}
                  onClick={() => setQuickCreateStep(1)}
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  disabled={isCreatingQuickPoll}
                  onClick={() => void handleQuickCreateAndOpenReview()}
                >
                  {isCreatingQuickPoll ? 'Saving draft...' : 'Create + Save as Draft'}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Global default archive days settings modal */}
      <Modal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        title="⚙️ Engagement Poll Settings"
        maxWidth="400px"
      >
        <div className="flex flex-col gap-6 py-2 text-left">
          <p className="m-0 text-sm leading-relaxed font-medium text-slate-500">
            Configure global default settings for quick engagement polls.
          </p>
          <FormField label="Default Auto-Archive (Days)">
            <Input
              id="settings-default-days"
              type="number"
              min="1"
              max="365"
              className="block w-[120px] shadow-sm transition-colors outline-none focus:ring-1 focus:ring-primary"
              value={globalDefaultDays}
              onChange={(e) => setGlobalDefaultDays(parseInt(e.target.value) || 1)}
              required
            />
          </FormField>
          <div className="flex flex-col gap-4">
            <p className="m-0 text-xs font-medium text-slate-400">
              New quick polls will automatically archive after this many days unless overridden.
            </p>
            <div className="flex flex-row justify-end gap-3 border-t border-slate-100 pt-4">
              <Button
                variant="secondary"
                disabled={isSavingSettings}
                onClick={() => setIsSettingsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={isSavingSettings}
                onClick={() => void handleSaveSettings()}
              >
                {isSavingSettings ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={recipientModal.isOpen}
        onClose={() => setRecipientModal({ ...recipientModal, isOpen: false })}
        title={recipientModal.title}
        maxWidth="500px"
        footer={
          <Button
            variant="secondary"
            onClick={() => setRecipientModal({ ...recipientModal, isOpen: false })}
          >
            Close
          </Button>
        }
      >
        <div className="flex max-h-[400px] flex-col gap-2 overflow-y-auto pr-2 text-left">
          {recipientModal.recipients.map((r) => (
            <div
              key={r.id}
              className="flex flex-row items-center justify-between rounded-lg border border-slate-200 bg-slate-50/30 p-3 px-4 shadow-sm"
            >
              <strong className="text-sm font-bold text-slate-800">{r.name}</strong>
              <Badge tone="neutral">{r.voicePart}</Badge>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
