import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { Button, FormField, Badge, Modal, Input, DataTable } from '../../components/ui';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { pollService } from '../../services/pollService';
import { communicationService } from '../../services/communicationService';
import { useEvents } from '../../hooks/useEvents';
import { formatInTimezone } from '../../lib/timezone';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { useDialog } from '../../contexts/DialogContext';
import { profileService } from '../../services/profileService';
import type { CommunicationRecipient } from '../../services/communicationService';
import { settingsService, type PollSettings } from '../../services/settingsService';
import type { PollRecord, PollResponseRecord } from './polls/types';
import { PollDetailsModal } from './polls/PollDetailsModal';

export default function PollsDashboardView() {
  const dialog = useDialog();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { events } = useEvents();
  const { timezone } = useChoirSettings();

  const deletePollMutation = useMutation({
    mutationFn: (id: string) => pollService.deletePoll(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.polls.all }),
  });

  const createPollMutation = useMutation({
    mutationFn: (data: { question: string; archiveAt: string }) => pollService.createPoll(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.polls.all }),
  });

  const savePollSettingsMutation = useMutation({
    mutationFn: (settings: PollSettings) => settingsService.savePollSettings(settings),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.polls.settings }),
  });

  // ── Data queries ──
  const pollsQuery = useQuery({
    queryKey: queryKeys.polls.list,
    queryFn: () => pollService.getPolls(),
    staleTime: 30_000,
  });

  const responsesQuery = useQuery({
    queryKey: queryKeys.polls.responses,
    queryFn: () => pollService.getPollResponses(),
    staleTime: 30_000,
  });

  const pollMessagesQuery = useQuery({
    queryKey: queryKeys.polls.messages,
    queryFn: () => communicationService.getSentPollMessages(),
    staleTime: 30_000,
  });

  const pollSettingsQuery = useQuery({
    queryKey: queryKeys.polls.settings,
    queryFn: () => settingsService.getPollSettings(),
    staleTime: 30_000,
  });

  const polls = useMemo(() => (pollsQuery.data ?? []) as PollRecord[], [pollsQuery.data]);
  const responses = useMemo(
    () => (responsesQuery.data ?? []) as PollResponseRecord[],
    [responsesQuery.data]
  );
  const pollMessages = pollMessagesQuery.data ?? [];
  const isLoading =
    pollsQuery.isLoading ||
    responsesQuery.isLoading ||
    pollMessagesQuery.isLoading ||
    pollSettingsQuery.isLoading;
  const firstError =
    pollsQuery.error || responsesQuery.error || pollMessagesQuery.error || pollSettingsQuery.error;
  const loadError = firstError
    ? firstError instanceof Error
      ? firstError.message
      : 'Unable to load polls.'
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
  const [viewingPoll, setViewingPoll] = useState<PollRecord | null>(null);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [quickCreateStep, setQuickCreateStep] = useState<1 | 2>(1);
  const [quickPollQuestion, setQuickPollQuestion] = useState('');
  // Auto-Archive and Pagination States
  const [pollSettings, setPollSettings] = useState<PollSettings>({ defaultAutoArchiveDays: 3 });
  const [globalDefaultDays, setGlobalDefaultDays] = useState(3);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const [quickPollDays, setQuickPollDays] = useState(3);

  // Initialize local settings state from query (only when modal is closed, to avoid
  // overwriting in-progress edits if a background refetch lands).
  useEffect(() => {
    if (pollSettingsQuery.data && !isSettingsModalOpen) {
      setPollSettings(pollSettingsQuery.data);
      setGlobalDefaultDays(pollSettingsQuery.data.defaultAutoArchiveDays);
    }
  }, [pollSettingsQuery.data, isSettingsModalOpen]);

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
      await deletePollMutation.mutateAsync(id);
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

    try {
      // Calculate archive target timestamp
      const archiveAt = new Date(Date.now() + quickPollDays * 24 * 60 * 60 * 1000).toISOString();

      // 1. Create the poll record
      const poll = (await createPollMutation.mutateAsync({
        question: trimmedQuestion,
        archiveAt,
      })) as PollRecord;

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
    }
  };

  const handleSaveSettings = async () => {
    try {
      await savePollSettingsMutation.mutateAsync({ defaultAutoArchiveDays: globalDefaultDays });
      setPollSettings({ defaultAutoArchiveDays: globalDefaultDays });
      setIsSettingsModalOpen(false);
      dialog.showToast('Poll settings saved successfully.');
    } catch {
      await dialog.showMessage({
        title: 'Error',
        message: 'Failed to save poll settings.',
        variant: 'danger',
      });
    }
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
      <AdminPageHeader
        title="Engagement Polls & Volunteering"
        description="Review volunteer responses, coordinate singer feedback, and draft quick engagement messages."
        below={
          <div className="flex w-full flex-row items-center justify-between border-b border-slate-200 pb-px">
            <div className="flex items-center gap-3 pb-1.5">
              <label className="flex cursor-pointer flex-row items-center gap-2 text-sm font-semibold text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="text-primary focus:ring-primary size-4 rounded-sm border-slate-300 focus:ring-offset-0"
                />
                Show Archived
              </label>
            </div>
            <div className="flex items-center gap-2 pb-1.5">
              <Button
                variant="secondary"
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
                icon={'➕'}
              >
                <span className="hidden md:inline">Start New Poll</span>
              </Button>
            </div>
          </div>
        }
      />

      <div className="flex flex-col gap-6">
        {loadError && (
          <div className="border-danger-text/30 bg-danger-bg rounded-lg border p-5 text-left shadow-xs">
            <p className="text-danger-text m-0 font-bold">{loadError}</p>
          </div>
        )}

        <DataTable
          columns={[
            {
              id: 'question',
              header: 'Question',
              cell: ({ row }) => {
                const r = row.original;
                const event = r.eventId ? events.find((e) => e.id === r.eventId) : null;
                const isArchived =
                  (event ? new Date(event.date) < new Date() : false) ||
                  (r.archiveAt ? new Date(r.archiveAt.replace(' ', 'T')) < new Date() : false);
                const archiveLabel = r.archiveAt
                  ? formatInTimezone(r.archiveAt, timezone, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : null;
                return (
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="truncate text-sm font-bold text-slate-900">{r.question}</span>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-semibold text-slate-400">
                      {archiveLabel && (
                        <span className="flex items-center gap-1">
                          <span>⏱️</span> {isArchived ? 'Archived' : 'Expires'} {archiveLabel}
                        </span>
                      )}
                      {event && (
                        <span className="flex items-center gap-1">
                          <span>🎭</span> {event.title}
                        </span>
                      )}
                    </div>
                  </div>
                );
              },
              meta: {
                cardSection: 0,
                cardSide: 'left',
              },
            },
            {
              id: 'status',
              header: 'Status',
              cell: ({ row }) => {
                const r = row.original;
                const event = r.eventId ? events.find((e) => e.id === r.eventId) : null;
                const isArchived =
                  (event ? new Date(event.date) < new Date() : false) ||
                  (r.archiveAt ? new Date(r.archiveAt.replace(' ', 'T')) < new Date() : false);
                return (
                  <Badge tone={isArchived ? 'neutral' : 'success'}>
                    {isArchived ? 'Archived' : 'Active'}
                  </Badge>
                );
              },
              meta: {
                cardSection: 0,
                cardSide: 'right',
              },
            },
            {
              id: 'yes',
              header: 'Yes',
              cell: ({ row }) => {
                const stat = pollStats[row.original.id];
                return (
                  <div className="border-primary/20 bg-primary/5 flex min-w-[48px] flex-col rounded-lg border p-1 text-center shadow-xs">
                    <span className="text-primary text-sm leading-tight font-black">
                      {stat?.yes ?? 0}
                    </span>
                    <span className="text-overline text-primary text-[10px]">Yes</span>
                  </div>
                );
              },
              meta: {
                align: 'center',
                cardSection: 1,
                cardSide: 'right',
                cardLabel: 'Yes',
              },
            },
            {
              id: 'no',
              header: 'No',
              cell: ({ row }) => {
                const stat = pollStats[row.original.id];
                return (
                  <div className="border-danger-text/20 bg-danger-bg flex min-w-[48px] flex-col rounded-lg border p-1 text-center shadow-xs">
                    <span className="text-danger-text text-sm leading-tight font-black">
                      {stat?.no ?? 0}
                    </span>
                    <span className="text-overline text-danger-text text-[10px]">No</span>
                  </div>
                );
              },
              meta: {
                align: 'center',
                cardSection: 1,
                cardSide: 'right',
                cardLabel: 'No',
              },
            },
          ]}
          data={filteredPolls}
          isLoading={isLoading && polls.length === 0}
          emptyState={{
            title: 'No Active Polls Found',
            description: showArchived
              ? 'No polls have been created yet.'
              : "No active engagement polls are available. Check 'Show Archived' to view past polls.",
            icon: '🗳️',
            action: (
              <Button variant="primary" onClick={openQuickCreate} size="small">
                + Start New Poll
              </Button>
            ),
          }}
          pageSize={10}
          onRowClick={(poll) => setViewingPoll(poll)}
          getRowId={(p) => p.id}
        />
      </div>

      <PollDetailsModal
        poll={viewingPoll}
        stat={viewingPoll ? pollStats[viewingPoll.id] : undefined}
        event={
          viewingPoll?.eventId ? (events.find((e) => e.id === viewingPoll.eventId) ?? null) : null
        }
        pollMessages={pollMessages}
        timezone={timezone}
        isDeleting={deletePollMutation.isPending}
        onClose={() => setViewingPoll(null)}
        onDelete={async (pollId) => {
          await handleDeletePoll(pollId);
          setViewingPoll(null);
        }}
        onViewContactedList={({ recipients, title }) =>
          setRecipientModal({
            isOpen: true,
            recipients,
            title,
          })
        }
      />

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
                  className="focus:ring-primary block w-full shadow-sm transition-colors outline-none focus:ring-1"
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
                  className="focus:ring-primary block w-[120px] shadow-sm transition-colors outline-none focus:ring-1"
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
                  <div className="text-overline mb-2 text-slate-400">Poll Question</div>
                  <strong className="text-lg font-extrabold tracking-tight text-slate-900">
                    {quickPollQuestion.trim()}
                  </strong>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 shadow-sm">
                  <div className="text-overline mb-2 text-slate-400">Draft Preview</div>
                  <div className="text-sm">
                    <strong className="text-slate-800">Subject:</strong> Quick Choir Poll
                  </div>
                  <div className="mt-3 rounded-md border border-slate-200 bg-white p-3 text-xs whitespace-pre-wrap text-slate-500 italic">{`Hi everyone,\n\nPlease tap below to answer:\n{{POLL_LINK:newPollId}}\n\nThank you!`}</div>
                </div>
              </div>
              <div className="flex flex-row justify-end gap-3 border-t border-slate-100 pt-4">
                <Button
                  variant="secondary"
                  disabled={createPollMutation.isPending}
                  onClick={() => setQuickCreateStep(1)}
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  disabled={createPollMutation.isPending}
                  onClick={() => void handleQuickCreateAndOpenReview()}
                >
                  {createPollMutation.isPending ? 'Saving draft...' : 'Create + Save as Draft'}
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
              className="focus:ring-primary block w-[120px] shadow-sm transition-colors outline-none focus:ring-1"
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
                disabled={savePollSettingsMutation.isPending}
                onClick={() => setIsSettingsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={savePollSettingsMutation.isPending}
                onClick={() => void handleSaveSettings()}
              >
                {savePollSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
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
        <div className="flex max-h-[400px] flex-col gap-2 overflow-y-auto px-2 text-left">
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
