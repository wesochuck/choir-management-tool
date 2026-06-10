import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppCard } from '../../components/common/AppCard';
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
      <div className="admin-view-container">
        <AppCard className="admin-loading-state">
          <p>Loading polls...</p>
        </AppCard>
      </div>
    );
  }

  return (
    <div className="admin-view-container">
      <div className="admin-view-header">
        <div className="flex-col gap-1">
          <h2 className="text-headline m-0">Engagement Polls & Volunteering</h2>
          <p className="text-muted text-sm">Review volunteer responses and counts.</p>
        </div>
        <div className="flex flex-row flex-wrap items-center gap-4 max-md:w-full max-md:justify-start max-md:gap-2">
          <label className="flex-row gap-2 items-center cursor-pointer text-sm">
            <input 
              type="checkbox" 
              checked={showArchived} 
              onChange={e => setShowArchived(e.target.checked)}
              className="w-4 h-4"
            />
            Show Archived
          </label>
          <button 
            type="button"
            className="btn btn-secondary btn-sm flex-row gap-1.5 h-9 items-center" 
            onClick={() => setIsSettingsModalOpen(true)}
          >
            ⚙️ Settings
          </button>
          <button 
            type="button"
            className="btn btn-primary btn-sm flex-row gap-1.5 h-9 items-center" 
            onClick={openQuickCreate}
          >
            <span>+</span> Start New Poll
          </button>
        </div>
      </div>

      <div className="flex-col">
        {loadError && (
          <AppCard className="db-error-card">
            <p className="db-error-text">{loadError}</p>
          </AppCard>
        )}
        {filteredPolls.length === 0 ? (
          <AppCard className="admin-empty-state">
            <p className="text-muted db-empty-state-text mb-4">No active polls found.</p>
            <div>
              <button type="button" className="btn btn-primary" onClick={openQuickCreate}>
                Start New Poll
              </button>
            </div>
          </AppCard>
        ) : (
          <div className="flex-col">
            <AppCard noPadding className="gap-0 overflow-hidden">
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
                    className={`flex items-center justify-between gap-4 p-3.5 px-5 cursor-pointer select-none transition-colors duration-150 hover:bg-primary-light focus-visible:bg-primary-light focus-visible:outline-none ${isExpanded ? 'bg-[rgb(74_124_89_/_6%)]' : ''} max-md:flex-col max-md:items-stretch`}
                    onClick={() => setExpandedPollId(isExpanded ? null : poll.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpandedPollId(isExpanded ? null : poll.id); }}
                  >
                    <div className="flex flex-1 auto min-w-0 flex-col gap-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className="m-0 text-text text-base font-bold">{poll.question}</h3>
                        {isArchived && <span className="badge bg-[#f1f5f9] text-[#64748b]">Archived</span>}
                      </div>
                      <div className="flex flex-wrap gap-1 gap-x-4 text-text-muted text-sm font-semibold">
                        {createdLabel && <span>Created {createdLabel}</span>}
                        {archiveLabel && (
                          <span title={`Auto-archives on ${formatInTimezone(poll.archiveAt!, timezone, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}`}>
                            ⏱️ {isArchived ? 'Archived' : 'Auto-archives'} {archiveLabel}
                          </span>
                        )}
                        {event && (
                          <span>
                            📅 {event.title} ({formatInTimezone(event.date, timezone, { month: 'short', day: 'numeric' })})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center flex-shrink-0 gap-6 max-md:flex-col max-md:gap-4 max-md:items-stretch">
                      <div className="flex items-center gap-2" aria-label="Poll response counts">
                        <div className="min-w-[52px] p-1 px-2.5 border border-border rounded-md bg-surface text-center">
                          <span className="text-base font-extrabold leading-tight text-primary">{stat.yes}</span>
                          <span className="block text-text-muted text-sm font-bold">Yes</span>
                        </div>
                        <div className="min-w-[52px] p-1 px-2.5 border border-border rounded-md bg-surface text-center">
                          <span className="text-base font-extrabold leading-tight text-[#ef4444]">{stat.no}</span>
                          <span className="block text-text-muted text-sm font-bold">No</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 max-md:justify-between">
                        <span className="text-text-muted text-sm font-bold">
                          {isExpanded ? '▲ Hide' : '▼ View Names'}
                        </span>
                        <button
                          className="btn btn-ghost btn-sm text-[#ef4444]"
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
                      <div className="flex gap-8 p-6 px-5 bg-bg border-t border-border max-md:flex-col max-md:items-stretch">
                        <div className="flex-row justify-between items-center w-full text-sm text-text-muted font-semibold border-b border-border pb-2 mb-1">
                          {contactedSingers.length > 0 ? (
                            <>
                              <span>📨 Sent to {contactedSingers.length} singer{contactedSingers.length !== 1 ? 's' : ''} via Communications.</span>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm px-2 h-6 text-xs underline text-primary cursor-pointer"
                                onClick={() => setRecipientModal({
                                  isOpen: true,
                                  recipients: contactedSingers,
                                  title: `Contacted Singers — ${poll.question}`
                                })}
                              >
                                View Contacted List →
                              </button>
                            </>
                          ) : (
                            <span>
                              📨 No sent communications found for this poll yet. You can send it from the{' '}
                              <a
                                href="/admin/communications"
                                className="text-primary underline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate('/admin/communications');
                                }}
                              >
                                Communications page
                              </a>.
                            </span>
                          )}
                        </div>

                        <div className="flex gap-8 w-full">
                          <div className="flex flex-1 flex-col gap-2 min-w-0">
                            <h4 className="m-0 pb-1 text-sm font-bold border-b-2 border-primary-light text-primary">
                              Volunteers ({stat.yes})
                            </h4>
                            {stat.volunteers.length === 0 ? (
                              <p className="text-muted text-sm">No volunteers yet.</p>
                            ) : (
                              <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
                                {stat.volunteers.map(v => (
                                  <div key={v.id} className="p-2 px-3 border border-border rounded-md bg-surface text-sm">
                                    <div className="font-bold">{v.expand?.profileId.name}</div>
                                    <div className="text-muted text-xs">{v.expand?.profileId.voicePart}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-1 flex-col gap-2 min-w-0">
                            <h4 className="m-0 pb-1 text-sm font-bold border-b-2 border-[#fee2e2] text-[#ef4444]">
                              Declined ({stat.no})
                            </h4>
                            {stat.decliners.length === 0 ? (
                              <p className="text-muted text-sm">No decliners yet.</p>
                            ) : (
                              <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
                                {stat.decliners.map(v => (
                                  <div key={v.id} className="p-2 px-3 border border-[#fee2e2] rounded-md bg-surface text-sm opacity-85">
                                    <div className="font-bold">{v.expand?.profileId?.name ?? 'Unknown singer'}</div>
                                    <div className="text-muted text-xs">{v.expand?.profileId?.voicePart ?? ''}</div>
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
            </AppCard>

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
        <div className="flex-col">
          {quickCreateStep === 1 ? (
            <>
              <p className="text-muted m-0">
                Create a poll and jump straight to Communications Review with a prefilled message.
              </p>
              <div className="form-field-group">
                <label className="text-label" htmlFor="quick-poll-question">Poll Question</label>
                <input
                  id="quick-poll-question"
                  type="text"
                  className="card w-full px-3 h-10 border border-border rounded-md"
                  value={quickPollQuestion}
                  onChange={(e) => setQuickPollQuestion(e.target.value)}
                  placeholder="e.g. Who can help with setup?"
                  required
                />
              </div>
              <div className="form-field-group">
                <label className="text-label" htmlFor="quick-poll-days">Auto-Archive Poll in (Days)</label>
                <input
                  id="quick-poll-days"
                  type="number"
                  min="1"
                  max="365"
                  className="card w-[120px] px-3 h-10 border border-border rounded-md"
                  value={quickPollDays}
                  onChange={(e) => setQuickPollDays(parseInt(e.target.value) || 1)}
                  required
                />
              </div>
              <p className="text-muted text-sm m-0 mb-2">
                Recipients default to all singers with status Active or Idle.
              </p>
              <div className="flex-row justify-end gap-2">
                <button type="button" className="btn btn-ghost" onClick={() => setIsQuickCreateOpen(false)}>Cancel</button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!quickPollQuestion.trim()}
                  onClick={() => setQuickCreateStep(2)}
                >
                  Next
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="m-0">
                We'll create this poll and save a pre-filled message to your <strong>Drafts</strong>. You can review, edit, and send from the Communications page.
              </p>
              <div className="card p-3">
                <div className="text-muted text-xs mb-1.5">Poll Question</div>
                <strong>{quickPollQuestion.trim()}</strong>
              </div>
              <div className="card p-3">
                <div className="text-muted text-xs mb-1.5">Draft Preview</div>
                <div><strong>Subject:</strong> Quick Choir Poll</div>
                <div className="mt-2 whitespace-pre-wrap">{`Hi everyone,\n\nPlease tap below to answer:\n{{POLL_LINK:newPollId}}\n\nThank you!`}</div>
              </div>
              <div className="flex-row justify-end gap-2">
                <button type="button" className="btn btn-ghost" disabled={isCreatingQuickPoll} onClick={() => setQuickCreateStep(1)}>Back</button>
                <button
                  type="button"
                  className="btn btn-primary"
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
        <div className="flex-col">
          <p className="text-muted m-0">
            Configure global default settings for quick engagement polls.
          </p>
          <div className="form-field-group">
            <label className="text-label" htmlFor="settings-default-days">Default Auto-Archive (Days)</label>
            <input
              id="settings-default-days"
              type="number"
              min="1"
              max="365"
              className="card w-[120px] px-3 h-10 border border-border rounded-md"
              value={globalDefaultDays}
              onChange={(e) => setGlobalDefaultDays(parseInt(e.target.value) || 1)}
              required
            />
          </div>
          <p className="text-muted text-xs m-0">
            New quick polls will automatically archive after this many days unless overridden.
          </p>
          <div className="flex-row justify-end gap-2 mt-2">
            <button type="button" className="btn btn-ghost" disabled={isSavingSettings} onClick={() => setIsSettingsModalOpen(false)}>Cancel</button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={isSavingSettings}
              onClick={() => void handleSaveSettings()}
            >
              {isSavingSettings ? 'Saving...' : 'Save Settings'}
            </button>
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
            className="btn btn-secondary"
            onClick={() => setRecipientModal({ ...recipientModal, isOpen: false })}
          >
            Cancel
          </button>
        }
      >
        <div className="flex-col max-h-[400px] overflow-y-auto">
          {recipientModal.recipients.map(r => (
            <div key={r.id} className="flex-row card p-2 justify-between shadow-none">
              <strong>{r.name}</strong>
              <span className="text-muted text-xs">{r.voicePart}</span>
            </div>
          ))}
        </div>
      </BaseModal>

    </div>
  );
}
