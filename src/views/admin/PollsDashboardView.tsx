import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppCard } from '../../components/common/AppCard';
import './PollsDashboardView.css';
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

  if (isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Polls...</div>;

  return (
    <div className="flex-col" style={{ gap: 'var(--space-md)', padding: 'var(--space-md) 0' }}>
      <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
        <h2 className="text-headline" style={{ margin: 0 }}>Engagement Polls & Volunteering</h2>
        <div className="flex-row" style={{ gap: 'var(--space-md)', alignItems: 'center' }}>
          <label className="flex-row" style={{ gap: '8px', alignItems: 'center', cursor: 'pointer', fontSize: '0.9rem' }}>
            <input 
              type="checkbox" 
              checked={showArchived} 
              onChange={e => setShowArchived(e.target.checked)}
              style={{ width: '16px', height: '16px' }}
            />
            Show Archived
          </label>
          <button 
            type="button"
            className="btn btn-secondary btn-sm flex-row" 
            style={{ gap: '6px', height: '36px', display: 'flex', alignItems: 'center' }}
            onClick={() => setIsSettingsModalOpen(true)}
          >
            ⚙️ Settings
          </button>
          <button 
            type="button"
            className="btn btn-primary btn-sm flex-row" 
            style={{ gap: '6px', height: '36px', display: 'flex', alignItems: 'center' }}
            onClick={openQuickCreate}
          >
            <span>+</span> Start New Poll
          </button>
        </div>
      </div>

      <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
        {loadError && (
          <AppCard style={{ padding: 'var(--space-md)', borderColor: '#ef4444' }}>
            <p style={{ margin: 0, color: '#ef4444' }}>{loadError}</p>
          </AppCard>
        )}
        {filteredPolls.length === 0 ? (
          <AppCard style={{ textAlign: 'center', padding: '48px', border: '2px dashed var(--border)', backgroundColor: 'transparent', boxShadow: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <p className="text-muted" style={{ fontSize: '1.1rem', marginBottom: 'var(--space-md)' }}>No active polls found.</p>
            <div>
              <button type="button" className="btn btn-primary" onClick={openQuickCreate}>
                Start New Poll
              </button>
            </div>
          </AppCard>
        ) : (
          <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
            <AppCard noPadding className="polls-list-card">
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
                    className={`polls-list-item${isExpanded ? ' is-expanded' : ''}${index === paginatedPolls.length - 1 ? ' is-last' : ''}`}
                  >
                  <div
                    role="button"
                    tabIndex={0}
                    className="polls-list-row"
                    onClick={() => setExpandedPollId(isExpanded ? null : poll.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpandedPollId(isExpanded ? null : poll.id); }}
                  >
                    <div className="polls-list-main">
                      <div className="polls-list-title-row">
                        <h3 className="polls-list-title">{poll.question}</h3>
                        {isArchived && <span className="badge polls-archived-badge">Archived</span>}
                      </div>
                      <div className="polls-list-meta">
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

                    <div className="polls-list-side">
                      <div className="polls-stat-group" aria-label="Poll response counts">
                        <div className="polls-stat">
                          <span className="polls-stat-value polls-stat-yes">{stat.yes}</span>
                          <span className="polls-stat-label">Yes</span>
                        </div>
                        <div className="polls-stat">
                          <span className="polls-stat-value polls-stat-no">{stat.no}</span>
                          <span className="polls-stat-label">No</span>
                        </div>
                      </div>

                      <div className="polls-list-actions">
                        <span className="polls-expand-label">
                          {isExpanded ? '▲ Hide' : '▼ View Names'}
                        </span>
                        <button
                          className="btn btn-ghost btn-sm polls-delete-btn"
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
                      <div className="polls-response-panel flex-col" style={{ gap: 'var(--space-md)' }}>
                        <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center', width: '100%', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '4px' }}>
                          {contactedSingers.length > 0 ? (
                            <>
                              <span>📨 Sent to {contactedSingers.length} singer{contactedSingers.length !== 1 ? 's' : ''} via Communications.</span>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                style={{ padding: '0 8px', height: '24px', fontSize: '0.75rem', textDecoration: 'underline', color: 'var(--primary)', cursor: 'pointer' }}
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
                                style={{ color: 'var(--primary)', textDecoration: 'underline' }}
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

                        <div style={{ display: 'flex', gap: 'var(--space-xl)', width: '100%' }} className="polls-response-columns-container">
                          <div className="polls-response-column">
                            <h4 className="polls-response-heading polls-response-heading-yes">
                              Volunteers ({stat.yes})
                            </h4>
                            {stat.volunteers.length === 0 ? (
                              <p className="text-muted text-sm">No volunteers yet.</p>
                            ) : (
                              <div className="polls-response-grid">
                                {stat.volunteers.map(v => (
                                  <div key={v.id} className="polls-response-person">
                                    <div className="polls-response-name">{v.expand?.profileId.name}</div>
                                    <div className="text-muted text-xs">{v.expand?.profileId.voicePart}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="polls-response-column">
                            <h4 className="polls-response-heading polls-response-heading-no">
                              Declined ({stat.no})
                            </h4>
                            {stat.decliners.length === 0 ? (
                              <p className="text-muted text-sm">No decliners yet.</p>
                            ) : (
                              <div className="polls-response-grid">
                                {stat.decliners.map(v => (
                                  <div key={v.id} className="polls-response-person polls-response-person-muted">
                                    <div className="polls-response-name">{v.expand?.profileId?.name ?? 'Unknown singer'}</div>
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
        <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
          {quickCreateStep === 1 ? (
            <>
              <p className="text-muted" style={{ margin: 0 }}>
                Create a poll and jump straight to Communications Review with a prefilled message.
              </p>
              <div className="flex-col" style={{ gap: 'var(--space-xs)', marginBottom: 'var(--space-md)' }}>
                <label className="text-label" htmlFor="quick-poll-question">Poll Question</label>
                <input
                  id="quick-poll-question"
                  type="text"
                  className="card"
                  style={{ width: '100%', padding: '0 12px', height: '40px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
                  value={quickPollQuestion}
                  onChange={(e) => setQuickPollQuestion(e.target.value)}
                  placeholder="e.g. Who can help with setup?"
                  required
                />
              </div>
              <div className="flex-col" style={{ gap: 'var(--space-xs)', marginBottom: 'var(--space-md)' }}>
                <label className="text-label" htmlFor="quick-poll-days">Auto-Archive Poll in (Days)</label>
                <input
                  id="quick-poll-days"
                  type="number"
                  min="1"
                  max="365"
                  className="card"
                  style={{ width: '120px', padding: '0 12px', height: '40px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
                  value={quickPollDays}
                  onChange={(e) => setQuickPollDays(parseInt(e.target.value) || 1)}
                  required
                />
              </div>
              <p className="text-muted text-sm" style={{ margin: 0, marginBottom: 'var(--space-sm)' }}>
                Recipients default to all singers with status Active or Idle.
              </p>
              <div className="flex-row" style={{ justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
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
              <p style={{ margin: 0 }}>
                We'll create this poll and save a pre-filled message to your <strong>Drafts</strong>. You can review, edit, and send from the Communications page.
              </p>
              <div className="card" style={{ padding: '12px 14px' }}>
                <div className="text-muted text-xs" style={{ marginBottom: '6px' }}>Poll Question</div>
                <strong>{quickPollQuestion.trim()}</strong>
              </div>
              <div className="card" style={{ padding: '12px 14px' }}>
                <div className="text-muted text-xs" style={{ marginBottom: '6px' }}>Draft Preview</div>
                <div><strong>Subject:</strong> Quick Choir Poll</div>
                <div style={{ marginTop: '8px', whiteSpace: 'pre-wrap' }}>{`Hi everyone,\n\nPlease tap below to answer:\n{{POLL_LINK:newPollId}}\n\nThank you!`}</div>
              </div>
              <div className="flex-row" style={{ justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
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
        <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
          <p className="text-muted" style={{ margin: 0 }}>
            Configure global default settings for quick engagement polls.
          </p>
          <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
            <label className="text-label" htmlFor="settings-default-days">Default Auto-Archive (Days)</label>
            <input
              id="settings-default-days"
              type="number"
              min="1"
              max="365"
              className="card"
              style={{ width: '120px', padding: '0 12px', height: '40px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
              value={globalDefaultDays}
              onChange={(e) => setGlobalDefaultDays(parseInt(e.target.value) || 1)}
              required
            />
          </div>
          <p className="text-muted text-xs" style={{ margin: 0 }}>
            New quick polls will automatically archive after this many days unless overridden.
          </p>
          <div className="flex-row" style={{ justifyContent: 'flex-end', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
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
        <div className="flex-col" style={{ gap: 'var(--space-sm)', maxHeight: '400px', overflowY: 'auto' }}>
          {recipientModal.recipients.map(r => (
            <div key={r.id} className="flex-row card" style={{ padding: 'var(--space-sm)', justifyContent: 'space-between', boxShadow: 'none' }}>
              <strong>{r.name}</strong>
              <span className="text-muted text-xs">{r.voicePart}</span>
            </div>
          ))}
        </div>
      </BaseModal>

    </div>
  );
}
