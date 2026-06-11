import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BaseModal } from '../../components/common/BaseModal';
import { pb } from '../../lib/pocketbase';
import { useEvents } from '../../hooks/useEvents';
import { formatInTimezone } from '../../lib/timezone';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { useDialog } from '../../contexts/DialogContext';
import { profileService } from '../../services/profileService';
import { communicationService, type CommunicationRecipient, type MessageRecord } from '../../services/communicationService';
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
    }
  };
}

export default function PollsDashboardView() {
  const dialog = useDialog();
  const navigate = useNavigate();
  const { events } = useEvents();
  const { timezone } = useChoirSettings();
  const [polls, setPolls] = useState<PollRecord[]>([]);
  const [responses, setResponses] = useState<PollResponseRecord[]>([]);
  const [pollMessages, setPollMessages] = useState<MessageRecord[]>([]);
  const [recipientModal, setRecipientModal] = useState<{ isOpen: boolean; recipients: CommunicationRecipient[]; title: string }>({
    isOpen: false,
    recipients: [],
    title: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
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

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [pollList, responseList, loadedSettings, messagesList] = await Promise.all([
        pb.collection('polls').getFullList<PollRecord>({ sort: '-created' }),
        pb.collection('pollResponses').getFullList<PollResponseRecord>({ expand: 'profileId', sort: '-updated' }),
        settingsService.getPollSettings(),
        pb.collection('messages').getFullList<MessageRecord>({
          filter: 'status = "Sent" && content ~ "{{POLL_LINK:"',
        }),
      ]);
      setPolls(pollList);
      setResponses(responseList);
      setPollSettings(loadedSettings);
      setGlobalDefaultDays(loadedSettings.defaultAutoArchiveDays);
      setPollMessages(messagesList);
    } catch (err) {
      console.error('Failed to load poll dashboard data', err);
      setLoadError('Unable to load polls. Check PocketBase collection fields, API rules, and browser console.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [showArchived, polls.length]);

  const filteredPolls = useMemo(() => {
    const now = new Date();
    return polls.filter(poll => {
      // Auto-archive check
      const isExpired = poll.archiveAt ? new Date(poll.archiveAt.replace(" ", "T")) < now : false;

      if (showArchived) return true;
      if (isExpired) return false;

      if (!poll.eventId) return true; // Polls without events stay active
      const event = events.find(e => e.id === poll.eventId);
      if (!event) return true;
      return new Date(event.date) > now;
    });
  }, [polls, events, showArchived]);

  const paginatedPolls = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredPolls.slice(startIndex, startIndex + pageSize);
  }, [filteredPolls, currentPage, pageSize]);

  const pollStats = useMemo(() => {
    const stats: Record<string, { yes: number; no: number; volunteers: PollResponseRecord[]; decliners: PollResponseRecord[] }> = {};
    
    polls.forEach(p => {
      stats[p.id] = { yes: 0, no: 0, volunteers: [], decliners: [] };
    });

    responses.forEach(r => {
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
      setPolls(prev => prev.filter(p => p.id !== id));
      setResponses(prev => prev.filter(r => r.pollId !== id));
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

      setPolls((prev) => [poll, ...prev]);
      setIsQuickCreateOpen(false);

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
      await dialog.showMessage({ title: 'Error', message: 'Failed to save poll settings.', variant: 'danger' });
    } finally {
      setIsSavingSettings(false);
    }
  };

  if (isLoading && polls.length === 0) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col p-6">
        <div className="flex items-center justify-center rounded-lg border border-border bg-surface py-12 shadow-xs">
          <p className="font-medium text-text-muted">Loading polls...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
      <div className="flex flex-col justify-between gap-6 border-b border-border pb-6 md:flex-row md:items-center">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 text-3xl font-extrabold tracking-tight text-text">Engagement Polls & Volunteering</h2>
          <p className="text-sm font-medium text-text-muted">Review volunteer responses and counts.</p>
        </div>
        <div className="flex flex-row flex-wrap items-center gap-4 max-md:w-full max-md:justify-start">
          <label className="flex cursor-pointer flex-row items-center gap-2 text-sm font-semibold text-text">
            <input 
              type="checkbox" 
              checked={showArchived} 
              onChange={e => setShowArchived(e.target.checked)}
              className="h-4 w-4 rounded-sm border-border text-primary focus:ring-primary focus:ring-offset-0"
            />
            Show Archived
          </label>
          <button 
            type="button"
            className="flex h-10 flex-row items-center gap-1.5 rounded-md border border-border bg-surface px-4 text-sm font-bold text-text-muted shadow-xs transition-all hover:bg-gray-50 active:scale-95" 
            onClick={() => setIsSettingsModalOpen(true)}
          >
            <span>⚙️</span> Settings
          </button>
          <button 
            type="button"
            className="flex h-10 flex-row items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-bold text-white shadow-md transition-all hover:bg-primary-deep active:scale-95" 
            onClick={openQuickCreate}
          >
            <span className="text-lg">+</span> Start New Poll
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {loadError && (
          <div className="rounded-lg border border-danger-text/30 bg-danger-bg p-5 shadow-xs">
            <p className="m-0 font-bold text-danger-text">{loadError}</p>
          </div>
        )}
        
        {filteredPolls.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface/30 py-16 text-center shadow-xs">
            <p className="mt-0 mb-6 text-lg font-semibold text-text-muted">No active polls found.</p>
            <button 
              type="button" 
              className="rounded-md bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-primary-deep active:scale-95" 
              onClick={openQuickCreate}
            >
              Start New Poll
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
              {paginatedPolls.map((poll, index) => {
                const stat = pollStats[poll.id];
                const isExpanded = expandedPollId === poll.id;
                const event = poll.eventId ? events.find(e => e.id === poll.eventId) : null;
                const isArchived = (event ? new Date(event.date) < new Date() : false) || 
                                   (poll.archiveAt ? new Date(poll.archiveAt.replace(" ", "T")) < new Date() : false);
                const createdLabel = poll.created
                  ? formatInTimezone(poll.created, timezone, { month: 'short', day: 'numeric', year: 'numeric' })
                  : null;
                const archiveLabel = poll.archiveAt
                  ? formatInTimezone(poll.archiveAt, timezone, { month: 'short', day: 'numeric', year: 'numeric' })
                  : null;

                return (
                  <div
                    key={poll.id}
                    className={`border-b border-border ${index === paginatedPolls.length - 1 ? 'border-b-0' : ''}`}
                  >
                  <div
                    role="button"
                    tabIndex={0}
                    className={`flex cursor-pointer items-center justify-between gap-6 p-4 px-6 transition-all duration-150 select-none hover:bg-primary-light/30 focus-visible:bg-primary-light/30 focus-visible:outline-none ${isExpanded ? 'bg-primary-light/10' : ''} max-md:flex-col max-md:items-stretch`}
                    onClick={() => setExpandedPollId(isExpanded ? null : poll.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpandedPollId(isExpanded ? null : poll.id); }}
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <h3 className="m-0 truncate text-lg font-bold tracking-tight text-text">{poll.question}</h3>
                        {isArchived && <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-[0.65rem] font-bold tracking-wider text-text-muted uppercase">Archived</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs font-semibold text-text-muted">
                        {createdLabel && <span className="flex items-center gap-1.5"><span>📅</span> Created {createdLabel}</span>}
                        {archiveLabel && (
                          <span 
                            className="flex items-center gap-1.5"
                            title={`Auto-archives on ${formatInTimezone(poll.archiveAt!, timezone, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}`}
                          >
                            <span>⏱️</span> {isArchived ? 'Archived' : 'Auto-archives'} {archiveLabel}
                          </span>
                        )}
                        {event && (
                          <span className="flex items-center gap-1.5">
                            <span>🎭</span> {event.title} ({formatInTimezone(event.date, timezone, { month: 'short', day: 'numeric' })})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-shrink-0 items-center gap-8 max-md:flex-col max-md:items-stretch max-md:gap-5">
                      <div className="flex items-center gap-3" aria-label="Poll response counts">
                        <div className="flex min-w-[56px] flex-col rounded-lg border border-primary/20 bg-primary/5 p-1.5 text-center shadow-xs">
                          <span className="text-lg leading-tight font-black text-primary-deep">{stat.yes}</span>
                          <span className="text-[0.65rem] font-bold tracking-wider text-primary-deep uppercase">Yes</span>
                        </div>
                        <div className="flex min-w-[56px] flex-col rounded-lg border border-danger-text/20 bg-danger-bg p-1.5 text-center shadow-xs">
                          <span className="text-lg leading-tight font-black text-danger-text">{stat.no}</span>
                          <span className="text-[0.65rem] font-bold tracking-wider text-danger-text uppercase">No</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 max-md:justify-between">
                        <span className="text-sm font-bold text-text-muted">
                          {isExpanded ? '▲ Hide Details' : '▼ View Names'}
                        </span>
                        <button
                          className="rounded-md p-1.5 text-xs font-bold text-danger-text transition-colors hover:bg-danger-bg active:opacity-70"
                          onClick={(e) => { e.stopPropagation(); handleDeletePoll(poll.id); }}
                          onKeyDown={(e) => { e.stopPropagation(); }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (() => {
                    const contactedSingers = (() => {
                      const contactedMap = new Map<string, CommunicationRecipient>();
                      const msgs = pollMessages.filter(msg => msg.content.includes(`{{POLL_LINK:${poll.id}}}`));
                      msgs.forEach(msg => {
                        if (Array.isArray(msg.recipients)) {
                          msg.recipients.forEach(rec => {
                            contactedMap.set(rec.id, rec);
                          });
                        }
                      });
                      return Array.from(contactedMap.values());
                    })();

                    return (
                      <div className="flex flex-col gap-6 border-t border-border bg-gray-50/50 p-6 px-8">
                        <div className="flex flex-row items-center justify-between border-b border-border pb-3">
                          <div className="flex items-center gap-2 text-sm font-bold text-text-muted">
                            <span>📨</span>
                            {contactedSingers.length > 0 ? (
                              <span>Sent to {contactedSingers.length} singer{contactedSingers.length !== 1 ? 's' : ''} via Communications.</span>
                            ) : (
                              <span>
                                No sent communications found for this poll yet. You can send it from the{' '}
                                <button
                                  className="text-primary underline hover:text-primary-deep"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    navigate('/admin/communications');
                                  }}
                                >
                                  Communications page
                                </button>.
                              </span>
                            )}
                          </div>
                          {contactedSingers.length > 0 && (
                            <button
                              type="button"
                              className="text-xs font-bold text-primary underline transition-colors hover:text-primary-deep"
                              onClick={() => setRecipientModal({
                                isOpen: true,
                                recipients: contactedSingers,
                                title: `Contacted Singers — ${poll.question}`
                              })}
                            >
                              View Contacted List →
                            </button>
                          )}
                        </div>

                        <div className="flex flex-col gap-8 md:flex-row">
                          <div className="flex min-w-0 flex-1 flex-col gap-3">
                            <h4 className="m-0 border-b-2 border-primary/20 pb-1.5 text-sm font-black tracking-wider text-primary-deep uppercase">
                              Volunteers ({stat.yes})
                            </h4>
                            {stat.volunteers.length === 0 ? (
                              <p className="m-0 text-sm font-medium text-text-muted italic">No volunteers yet.</p>
                            ) : (
                              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2.5">
                                {stat.volunteers.map(v => (
                                  <div key={v.id} className="rounded-lg border border-border bg-surface p-2.5 px-4 shadow-xs transition-shadow hover:shadow-sm">
                                    <div className="font-bold text-text">{v.expand?.profileId.name}</div>
                                    <div className="text-[0.7rem] font-bold tracking-wide text-text-muted uppercase">{v.expand?.profileId.voicePart}</div>
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
                              <p className="m-0 text-sm font-medium text-text-muted italic">No decliners yet.</p>
                            ) : (
                              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2.5">
                                {stat.decliners.map(v => (
                                  <div key={v.id} className="rounded-lg border border-danger-text/10 bg-surface p-2.5 px-4 opacity-90 shadow-xs">
                                    <div className="font-bold text-text">{v.expand?.profileId?.name ?? 'Unknown singer'}</div>
                                    <div className="text-[0.7rem] font-bold tracking-wide text-text-muted uppercase">{v.expand?.profileId?.voicePart ?? ''}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                );
              })}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={Math.max(1, Math.ceil(filteredPolls.length / pageSize))}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      <BaseModal
        isOpen={isQuickCreateOpen}
        onClose={() => setIsQuickCreateOpen(false)}
        title={quickCreateStep === 1 ? 'Quick Create Poll' : 'Confirm & Open Review'}
        maxWidth="560px"
      >
        <div className="flex flex-col gap-6 py-2">
          {quickCreateStep === 1 ? (
            <>
              <p className="m-0 text-sm font-medium text-text-muted leading-relaxed">
                Create a poll and jump straight to Communications Review with a prefilled message.
              </p>
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.65rem] font-bold uppercase tracking-wider text-text-muted" htmlFor="quick-poll-question">Poll Question</label>
                <input
                  id="quick-poll-question"
                  type="text"
                  className="h-10 w-full rounded-md border border-border bg-surface px-4 text-sm transition-colors focus:border-primary focus:ring-1 focus:ring-primary focus:outline-hidden"
                  value={quickPollQuestion}
                  onChange={(e) => setQuickPollQuestion(e.target.value)}
                  placeholder="e.g. Who can help with setup?"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.65rem] font-bold uppercase tracking-wider text-text-muted" htmlFor="quick-poll-days">Auto-Archive Poll in (Days)</label>
                <input
                  id="quick-poll-days"
                  type="number"
                  min="1"
                  max="365"
                  className="h-10 w-[120px] rounded-md border border-border bg-surface px-4 text-sm transition-colors focus:border-primary focus:ring-1 focus:ring-primary focus:outline-hidden"
                  value={quickPollDays}
                  onChange={(e) => setQuickPollDays(parseInt(e.target.value) || 1)}
                  required
                />
              </div>
              <div className="flex flex-col gap-4">
                <p className="m-0 text-xs font-medium text-text-muted">
                  Recipients default to all singers with status Active or Idle.
                </p>
                <div className="flex flex-row justify-end gap-3 border-t border-border pt-4">
                  <button 
                    type="button" 
                    className="h-10 rounded-md px-4 text-sm font-bold text-text-muted transition-colors hover:bg-gray-100" 
                    onClick={() => setIsQuickCreateOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="h-10 rounded-md bg-primary px-6 text-sm font-bold text-white shadow-md transition-all enabled:hover:bg-primary-deep enabled:active:scale-95 disabled:opacity-50"
                    disabled={!quickPollQuestion.trim()}
                    onClick={() => setQuickCreateStep(2)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="m-0 text-sm font-medium text-text-muted leading-relaxed">
                We'll create this poll and save a pre-filled message to your <strong className="text-text">Drafts</strong>. You can review, edit, and send from the Communications page.
              </p>
              <div className="flex flex-col gap-4">
                <div className="rounded-lg border border-border bg-gray-50/50 p-4 shadow-xs">
                  <div className="mb-2 text-[0.6rem] font-black tracking-widest text-text-muted uppercase">Poll Question</div>
                  <strong className="text-lg text-text tracking-tight">{quickPollQuestion.trim()}</strong>
                </div>
                <div className="rounded-lg border border-border bg-gray-50/50 p-4 shadow-xs">
                  <div className="mb-2 text-[0.6rem] font-black tracking-widest text-text-muted uppercase">Draft Preview</div>
                  <div className="text-sm"><strong>Subject:</strong> Quick Choir Poll</div>
                  <div className="mt-3 whitespace-pre-wrap rounded-md border border-border bg-surface p-3 text-xs text-text-muted italic">{`Hi everyone,\n\nPlease tap below to answer:\n{{POLL_LINK:newPollId}}\n\nThank you!`}</div>
                </div>
              </div>
              <div className="flex flex-row justify-end gap-3 border-t border-border pt-4">
                <button 
                  type="button" 
                  className="h-10 rounded-md px-4 text-sm font-bold text-text-muted transition-colors hover:bg-gray-100" 
                  disabled={isCreatingQuickPoll} 
                  onClick={() => setQuickCreateStep(1)}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="h-10 rounded-md bg-primary px-6 text-sm font-bold text-white shadow-md transition-all enabled:hover:bg-primary-deep enabled:active:scale-95 disabled:opacity-50"
                  disabled={isCreatingQuickPoll}
                  onClick={() => void handleQuickCreateAndOpenReview()}
                >
                  {isCreatingQuickPoll ? 'Saving draft...' : 'Create + Save as Draft'}
                </button>
              </div>
            </>
          )}
        </div>
      </BaseModal>

      {/* Global default archive days settings modal */}
      <BaseModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        title="⚙️ Engagement Poll Settings"
        maxWidth="400px"
      >
        <div className="flex flex-col gap-6 py-2">
          <p className="m-0 text-sm font-medium text-text-muted leading-relaxed">
            Configure global default settings for quick engagement polls.
          </p>
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.65rem] font-bold uppercase tracking-wider text-text-muted" htmlFor="settings-default-days">Default Auto-Archive (Days)</label>
            <input
              id="settings-default-days"
              type="number"
              min="1"
              max="365"
              className="h-10 w-[120px] rounded-md border border-border bg-surface px-4 text-sm transition-colors focus:border-primary focus:ring-1 focus:ring-primary focus:outline-hidden"
              value={globalDefaultDays}
              onChange={(e) => setGlobalDefaultDays(parseInt(e.target.value) || 1)}
              required
            />
          </div>
          <div className="flex flex-col gap-4">
            <p className="m-0 text-xs font-medium text-text-muted">
              New quick polls will automatically archive after this many days unless overridden.
            </p>
            <div className="flex flex-row justify-end gap-3 border-t border-border pt-4">
              <button 
                type="button" 
                className="h-10 rounded-md px-4 text-sm font-bold text-text-muted transition-colors hover:bg-gray-100" 
                disabled={isSavingSettings} 
                onClick={() => setIsSettingsModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="h-10 rounded-md bg-primary px-6 text-sm font-bold text-white shadow-md transition-all enabled:hover:bg-primary-deep enabled:active:scale-95 disabled:opacity-50"
                disabled={isSavingSettings}
                onClick={() => void handleSaveSettings()}
              >
                {isSavingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </BaseModal>

      <BaseModal
        isOpen={recipientModal.isOpen}
        onClose={() => setRecipientModal({ ...recipientModal, isOpen: false })}
        title={recipientModal.title}
        maxWidth="500px"
        footer={
          <button
            type="button"
            className="flex h-10 items-center justify-center rounded-md border border-border bg-surface px-6 text-sm font-bold text-text-muted shadow-xs transition-colors hover:bg-gray-50 active:scale-95"
            onClick={() => setRecipientModal({ ...recipientModal, isOpen: false })}
          >
            Close
          </button>
        }
      >
        <div className="flex max-h-[400px] flex-col gap-2 overflow-y-auto pr-2">
          {recipientModal.recipients.map(r => (
            <div key={r.id} className="flex flex-row items-center justify-between rounded-lg border border-border bg-gray-50/30 p-3 px-4 shadow-xs">
              <strong className="text-sm font-bold text-text">{r.name}</strong>
              <span className="text-[0.65rem] font-black tracking-wider text-text-muted uppercase">{r.voicePart}</span>
            </div>
          ))}
        </div>
      </BaseModal>

    </div>
  );
}
