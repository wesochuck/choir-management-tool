import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AppCard } from '../../components/common/AppCard';
import EasyMDE from 'easymde';
import { useDialog } from '../../contexts/DialogContext';
import { useEvents } from '../../hooks/useEvents';
import { useVoiceParts } from '../../hooks/useVoiceParts';
import { useAuth } from '../../contexts/AuthContext';
import { CommunicationTabs } from '../../components/CommunicationTabs';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import type { CommunicationTab } from '../../types/Communication';
import type { CommunicationRecipient, MessageRecord } from '../../services/communicationService';
import { pb } from '../../lib/pocketbase';
import { Button } from '../../components/ui';
import { communicationService } from '../../services/communicationService';
import { queryKeys } from '../../lib/queryKeys';
import { settingsService, type CommunicationSettings } from '../../services/settingsService';

import { useCommunicationLibrary } from './communications/useCommunicationLibrary';
import { useCommunicationDraft } from './communications/useCommunicationDraft';
import { useCommunicationPreview } from './communications/useCommunicationPreview';
import { useAutomatedCommunicationTasks } from './communications/useAutomatedCommunicationTasks';

import { ComposePanel } from './communications/ComposePanel';
import { AutomatedTasksPanel } from './communications/AutomatedTasksPanel';
import { DraftsPanel } from './communications/DraftsPanel';
import { HistoryPanel } from './communications/HistoryPanel';
import { SettingsPanel } from './communications/SettingsPanel';
import { CommunicationModals } from './communications/CommunicationModals';
import type { AutomatedTask, CommunicationRouteState, WizardStep } from './communications/types';

export default function CommunicationView() {
  const dialog = useDialog();
  const location = useLocation();
  const { labels: voicePartLabels, sections: configSections } = useVoiceParts();
  const { events } = useEvents();
  const { user } = useAuth();

  const routeState = location.state as CommunicationRouteState | null;

  const [tab, setTab] = useState<CommunicationTab>('compose');
  const [wizardStep, setWizardStep] = useState<WizardStep>(
    routeState?.initialOpenReview || routeState?.openDraftId ? 'REVIEW' : 'TARGETS'
  );

  const editorRef = useRef<EasyMDE | null>(null);
  const didResumeRef = useRef(false);

  const [selectedMessage, setSelectedMessage] = useState<MessageRecord | null>(null);

  const [recipientPreviewList, setRecipientPreviewList] = useState<{
    isOpen: boolean;
    recipients: CommunicationRecipient[];
    title: string;
    emptyMessage?: string;
    helperText?: string;
  }>({
    isOpen: false,
    recipients: [],
    title: '',
    emptyMessage: undefined,
    helperText: undefined,
  });

  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState(user?.email || '');

  const library = useCommunicationLibrary();
  const queryClient = useQueryClient();

  const saveConfigMutation = useMutation({
    mutationFn: (settings: CommunicationSettings) =>
      settingsService.saveCommunicationSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.communications.settings() });
    },
  });

  const testSmtpMutation = useMutation({
    mutationFn: (email: string) => pb.send('/api/test-smtp', { method: 'POST', body: { email } }),
  });

  const automated = useAutomatedCommunicationTasks({
    events,
    commSettings: library.commSettings,
  });

  const draft = useCommunicationDraft({
    routeState,
    user,
    tab,
    historyPage: library.historyPage,
    setHistoryPage: library.setHistoryPage,
    refreshHistory: library.refreshHistory,
    setDrafts: library.setDrafts,
    setAutomatedTaskStatus: automated.setAutomatedTaskStatus,
    dialog,
    setTab,
    setWizardStep,
  });

  const preview = useCommunicationPreview({
    content: draft.content,
    subject: draft.subject,
    editingTemplate: library.editingTemplate,
    messageType: draft.messageType,
    selectedRecipients: draft.selectedRecipients,
    events,
    eventId: draft.filters.eventId,
    commSettings: library.commSettings,
    pollQuestions: draft.pollQuestions,
  });

  const { handleResumeDraft } = draft;

  useEffect(() => {
    if (library.isLoading || didResumeRef.current || !routeState?.openDraftId) return;

    const targetDraft = library.drafts.find(
      (draftRecord) => draftRecord.id === routeState.openDraftId
    );

    if (targetDraft) {
      didResumeRef.current = true;
      handleResumeDraft(targetDraft);
      setTab('compose');
      setWizardStep('REVIEW');
    }
  }, [library.isLoading, library.drafts, routeState?.openDraftId, handleResumeDraft]);

  const handleViewRecipients = (recipients: CommunicationRecipient[], title: string) => {
    setRecipientPreviewList({
      isOpen: true,
      recipients,
      title,
      emptyMessage: undefined,
      helperText: undefined,
    });
  };

  const handleViewAutomatedTaskRecipients = async (task: AutomatedTask) => {
    const eventLabel = task.event.title || task.event.type;

    try {
      if (task.type === 'Report') {
        const recipients = await communicationService.resolveAttendanceReportRecipients();

        setRecipientPreviewList({
          isOpen: true,
          recipients,
          title: `Admins Receiving Report for ${eventLabel}`,
          emptyMessage: 'No admins are currently opted in to receive attendance reports.',
          helperText:
            'Enable attendance reports on at least one admin profile to receive these messages.',
        });

        return;
      }

      if (task.type === 'Ticket Buyer Reminder') {
        const recipients = await communicationService.resolveTicketBuyerRecipients(task.event.id);

        setRecipientPreviewList({
          isOpen: true,
          recipients,
          title: `Ticket Buyers for ${eventLabel}`,
          emptyMessage: 'No ticket buyers found for this performance.',
          helperText:
            'Only users who have purchased tickets for this specific performance will receive this reminder.',
        });

        return;
      }

      const recipients = await communicationService.resolveRecipients({
        eventId: task.event.id,
        rsvp: task.type === 'RSVP Request' ? 'Pending' : 'All',
        voiceParts: [],
        globalStatus: 'Active',
      });

      setRecipientPreviewList({
        isOpen: true,
        recipients,
        title:
          task.type === 'RSVP Request'
            ? `Pending RSVP Recipients for ${eventLabel}`
            : `Reminder Recipients for ${eventLabel}`,
        emptyMessage: undefined,
        helperText: undefined,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await dialog.showMessage({
        title: 'Could Not Load Recipients',
        message,
        variant: 'danger',
      });
    }
  };

  const handleArchiveAutomatedTask = async (task: AutomatedTask) => {
    try {
      const eventLabel = task.event.title || task.event.type;

      const confirmed = await dialog.confirm({
        title: 'Archive Automated Message?',
        message: `Archive this ${task.type.toLowerCase()} for "${eventLabel}" without sending it? It will be removed from upcoming automated tasks and kept in communications history.`,
        confirmLabel: 'Archive',
      });

      if (!confirmed) return;

      const getAutomatedTaskKeyPrefix = (taskType: AutomatedTask['type']) => {
        if (taskType === 'RSVP Request') return 'rsvp';
        if (taskType === 'Reminder') return 'reminder';
        if (taskType === 'Ticket Buyer Reminder') return 'ticket-reminder';
        return 'report';
      };

      const getAutomatedTaskFilterType = (taskType: AutomatedTask['type']) => {
        if (taskType === 'RSVP Request') return 'RSVP Invitation';
        if (taskType === 'Reminder') return 'Automated Reminder';
        if (taskType === 'Ticket Buyer Reminder') return 'Ticket Buyer Reminder';
        return 'Automated Report';
      };

      const taskKeyPrefix = getAutomatedTaskKeyPrefix(task.type);

      await communicationService.archiveMessage({
        subject: `[Archived] ${task.type}: ${eventLabel}`,
        content: `This automated ${task.type.toLowerCase()} for "${eventLabel}" was archived without sending.`,
        type: 'Email',
        recipients: [],
        recipientIds: [],
        filters: {
          type: getAutomatedTaskFilterType(task.type),
          eventId: task.event.id,
          archived: true,
          archivedReason: 'Archived manually by admin',
          automatedTaskType: task.type,
          archivedBy: user?.id || null,
          archivedByEmail: user?.email || null,
          archivedAt: new Date().toISOString(),
        },
        status: 'Archived',
      });

      automated.setAutomatedTaskStatus((prev) => ({
        ...prev,
        [`${taskKeyPrefix}-${task.event.id}`]: 'archived',
      }));

      if (library.historyPage === 1) {
        void library.refreshHistory(1);
      } else {
        library.setHistoryPage(1);
      }

      dialog.showToast('Automated message archived without sending.');
    } catch (err: unknown) {
      console.error('Failed to archive automated message', err);
      const message = err instanceof Error ? err.message : String(err);
      await dialog.showMessage({
        title: 'Error',
        message: 'Failed to archive message: ' + message,
        variant: 'danger',
      });
    }
  };

  const handleCopyMessageAsDraft = (message: MessageRecord) => {
    const cleanFilters = { ...((message.filters || {}) as Record<string, unknown>) };
    delete cleanFilters.archived;
    delete cleanFilters.archivedReason;
    delete cleanFilters.archivedBy;
    delete cleanFilters.archivedByEmail;
    delete cleanFilters.archivedAt;
    delete cleanFilters.automatedTaskType;

    draft.handleResumeDraft(
      {
        ...message,
        subject: message.subject.replace(/^\[Archived\]\s*/, ''),
        content: message.content,
        filters: cleanFilters,
        status: 'Draft',
      },
      { asCopy: true }
    );
  };

  const handleDraftTaskMessage = (subjectText: string, bodyText: string) => {
    draft.setSubject(subjectText);
    draft.setContent(bodyText);
    draft.setMessageType('Email');
    setWizardStep('COMPOSE');
    setTab('compose');
  };

  const insertPlaceholder = (tag: string) => {
    if (tag === '{{POLL_LINK:pollId}}') {
      setIsPollModalOpen(true);
      return;
    }

    const editor = editorRef.current;

    if (!editor) {
      // Fallback if editor isn't loaded (unlikely in COMPOSE step)
      if (library.editingTemplate) {
        library.setEditingTemplate({
          ...library.editingTemplate,
          content: (library.editingTemplate.content || '') + tag,
        });
      } else {
        draft.setContent((prev) => prev + tag);
      }
      return;
    }

    // Insert at cursor using EasyMDE's CodeMirror
    editor.codemirror.replaceSelection(tag);
    editor.codemirror.focus();

    // The editor's change handler will trigger setContent/setEditingTemplate automatically via onChange
  };
  if (library.isLoading) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <AppCard className="flex items-center justify-center py-12">
          <p>Loading Communications...</p>
        </AppCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-6">
        <AdminPageHeader
          title="Communications"
          description="Create messages, manage drafts, review message history, and configure automated communications."
          actions={
            tab !== 'compose' ? (
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  setTab('compose');
                  if (wizardStep === 'REVIEW') {
                    setWizardStep('TARGETS');
                  }
                }}
                className="w-full whitespace-nowrap sm:w-auto"
              >
                <span aria-hidden="true">+</span>
                <span>New Message</span>
              </Button>
            ) : undefined
          }
          below={
            <>
              {routeState?.returnToPolls && (
                <Link to="/admin/polls" className="text-muted text-sm underline">
                  Back to Polls
                </Link>
              )}

              <CommunicationTabs
                activeTab={tab}
                onTabChange={(nextTab) => {
                  setTab(nextTab);
                }}
                draftsCount={library.drafts.length}
              />
            </>
          }
        />
      </div>

      {tab === 'compose' && (
        <ComposePanel
          {...draft}
          {...preview}
          wizardStep={wizardStep}
          setWizardStep={setWizardStep}
          events={events}
          voicePartLabels={voicePartLabels}
          configSections={configSections}
          commSettings={library.commSettings}
          templates={library.templates}
          setTab={setTab}
          setEditingTemplate={library.setEditingTemplate}
          editorRef={editorRef}
          onInsertPlaceholder={insertPlaceholder}
          onViewRecipients={handleViewRecipients}
          user={user}
          choirName={library.choirName}
          senderEmail={library.commConfig.smtp.from || 'no-reply@choir.management'}
        />
      )}

      {tab === 'automated' && (
        <AutomatedTasksPanel
          upcomingTasks={automated.upcomingTasks}
          onDraftTaskMessage={handleDraftTaskMessage}
          onTriggerReport={async (task) => {
            const confirmed = await dialog.confirm({
              title: 'Send Report Now?',
              message: `Generate and send the attendance report for "${task.event.title || task.event.type}" immediately?`,
              confirmLabel: 'Send Now',
            });
            if (confirmed) {
              automated.setAutomatedTaskStatus((prev) => ({
                ...prev,
                [`report-${task.event.id}`]: 'sent',
              }));
              try {
                await communicationService.triggerAttendanceReport(task.event.id);
                if (library.historyPage === 1) {
                  void library.refreshHistory(1);
                } else {
                  library.setHistoryPage(1);
                }
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                await dialog.showMessage({ title: 'Error', message: msg, variant: 'danger' });
              }
            }
          }}
          onArchiveTask={handleArchiveAutomatedTask}
          onViewTaskRecipients={handleViewAutomatedTaskRecipients}
          commSettings={library.commSettings}
          isSending={draft.isSending}
        />
      )}

      {tab === 'drafts' && (
        <DraftsPanel
          drafts={library.drafts}
          onResumeDraft={draft.handleResumeDraft}
          onDeleteDraft={async (draftRecord) => {
            if (
              await dialog.confirm({
                title: 'Delete Draft',
                message: 'Are you sure you want to delete this draft?',
                variant: 'danger',
              })
            ) {
              await communicationService.deleteDraft(draftRecord.id);
              queryClient.invalidateQueries({ queryKey: queryKeys.communications.drafts() });
            }
          }}
        />
      )}

      {tab === 'history' && (
        <HistoryPanel
          history={library.history}
          historyPage={library.historyPage}
          totalPages={library.totalPages}
          setHistoryPage={library.setHistoryPage}
          historySearchQuery={library.historySearchQuery}
          onHistorySearchChange={library.setHistorySearchQuery}
          events={events}
          commSettings={library.commSettings}
          onViewDetails={setSelectedMessage}
          onCopyDraft={handleCopyMessageAsDraft}
          onViewRecipients={handleViewRecipients}
        />
      )}

      {tab === 'settings' && (
        <SettingsPanel
          commSettings={library.commSettings}
          setCommSettings={library.setCommSettings}
          testEmailAddress={testEmailAddress}
          setTestEmailAddress={setTestEmailAddress}
          isTestingSmtp={testSmtpMutation.isPending}
          onSendConnectionTest={async () => {
            if (!testEmailAddress) {
              await dialog.showMessage({
                title: 'Error',
                message: 'Please enter a destination email address.',
                variant: 'danger',
              });
              return;
            }

            try {
              const response = await testSmtpMutation.mutateAsync(testEmailAddress);

              if (response && response.success) {
                dialog.showToast(`Test email successfully sent to ${testEmailAddress}!`);
              } else {
                throw new Error(response?.error || 'Unknown error occurred.');
              }
            } catch (err: unknown) {
              const errMsg = err instanceof Error ? err.message : String(err);
              await dialog.showMessage({
                title: 'SMTP Connection Failed',
                message: `Could not send test email: ${errMsg}`,
                variant: 'danger',
              });
            }
          }}
          isSavingConfig={saveConfigMutation.isPending}
          onSaveSettings={async () => {
            try {
              const currentSettings =
                queryClient.getQueryData<CommunicationSettings>(
                  queryKeys.communications.settings()
                ) ?? library.commSettings;
              await saveConfigMutation.mutateAsync(currentSettings);
              dialog.showToast('Settings updated successfully.');
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : String(err);
              await dialog.showMessage({
                title: 'Error',
                message: 'Failed to save settings: ' + message,
                variant: 'danger',
              });
            }
          }}
          templates={library.templates}
          setTemplates={library.setTemplates}
          editingTemplate={library.editingTemplate}
          setEditingTemplate={library.setEditingTemplate}
          previewHtml={preview.previewHtml}
          onInsertPlaceholder={insertPlaceholder}
          editorRef={editorRef}
          dialog={dialog}
          choirName={library.choirName}
          senderEmail={library.commConfig.smtp.from || 'no-reply@choir.management'}
        />
      )}

      <CommunicationModals
        selectedMessage={selectedMessage}
        setSelectedMessage={setSelectedMessage}
        recipientPreviewList={recipientPreviewList}
        setRecipientPreviewList={setRecipientPreviewList}
        isPollModalOpen={isPollModalOpen}
        setIsPollModalOpen={setIsPollModalOpen}
        setPollQuestions={draft.setPollQuestions}
        setContent={draft.setContent}
        editorRef={editorRef}
        events={events}
        commSettings={library.commSettings}
        editingTemplate={library.editingTemplate}
        setEditingTemplate={library.setEditingTemplate}
      />
    </div>
  );
}
