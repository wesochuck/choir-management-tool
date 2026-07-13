import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppCard } from '../../components/common/AppCard';
import EasyMDE from 'easymde';
import { useDialog } from '../../contexts/DialogContext';
import { useEvents } from '../../hooks/useEvents';
import { useAuth } from '../../contexts/AuthContext';
import { CommunicationTabs } from '../../components/CommunicationTabs';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import type { CommunicationTab } from '../../types/Communication';
import type { CommunicationRecipient, MessageRecord } from '../../services/communicationService';
import { formatPocketBaseError, pb } from '../../lib/pocketbase';
import { Button } from '../../components/ui';
import { communicationService } from '../../services/communicationService';
import { queryKeys } from '../../lib/queryKeys';
import {
  settingsService,
  type CommunicationSettings,
  type EmailProviderSettings,
  DEFAULT_EMAIL_PROVIDER_SETTINGS,
} from '../../services/settingsService';
import { parseConfigBaseline } from './communications/communicationSettingsForm';
import type { CommunicationConfig } from './communications/communicationSettingsForm';

import { useCommunicationLibrary } from './communications/useCommunicationLibrary';
import { useCommunicationDraft } from './communications/useCommunicationDraft';
import { useCommunicationPreview } from './communications/useCommunicationPreview';
import { useAutomatedCommunicationTasks } from './communications/useAutomatedCommunicationTasks';

import { ComposePanel } from './communications/ComposePanel';
import { AutomatedTasksPanel } from './communications/AutomatedTasksPanel';
import { DraftsPanel } from './communications/DraftsPanel';
import { HistoryPanel } from './communications/HistoryPanel';
import { SettingsPanel } from './communications/SettingsPanel';
import { TemplatesPanel } from './communications/TemplatesPanel';
import { CommunicationModals } from './communications/CommunicationModals';
import type { AutomatedTask, CommunicationRouteState, WizardStep } from './communications/types';
import { useSetup } from '../../contexts/SetupContext';

export default function CommunicationView() {
  const dialog = useDialog();
  const location = useLocation();
  const { events } = useEvents();
  const { user } = useAuth();
  const { enabledModules } = useSetup();
  const pollsEnabled = enabledModules.has('polls');

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
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const library = useCommunicationLibrary();
  const queryClient = useQueryClient();

  const saveConfigMutation = useMutation({
    mutationFn: (settings: CommunicationSettings) =>
      settingsService.saveCommunicationSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.communications.settings() });
    },
  });

  const emailProviderQuery = useQuery({
    queryKey: queryKeys.appSettings.emailProvider,
    queryFn: () => settingsService.getEmailProviderSettings(),
    staleTime: 5 * 60_000,
  });

  const saveEmailProviderMutation = useMutation({
    mutationFn: (settings: EmailProviderSettings) =>
      settingsService.saveEmailProviderSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appSettings.emailProvider });
    },
  });

  const configBaseline = useMemo(() => {
    return parseConfigBaseline(
      library.commSettings,
      emailProviderQuery.data || DEFAULT_EMAIL_PROVIDER_SETTINGS,
      testEmailAddress,
      testPhoneNumber
    );
  }, [library.commSettings, emailProviderQuery.data, testEmailAddress, testPhoneNumber]);

  const saveSettings = async (newConfig: CommunicationConfig) => {
    try {
      setTestEmailAddress(newConfig.testEmail);
      setTestPhoneNumber(newConfig.testPhone);

      const commPayload: CommunicationSettings = {
        ...library.commSettings,
        mailingAddress: newConfig.physicalAddress,
        frontendUrl: newConfig.baseUrl,
        defaultCountryCode: newConfig.defaultSmsCountryCode,
      };
      await saveConfigMutation.mutateAsync(commPayload);

      const providerPayload: EmailProviderSettings = {
        provider: newConfig.emailProvider,
        brevoApiKey: newConfig.brevoApiKey,
      };
      await saveEmailProviderMutation.mutateAsync(providerPayload);

      dialog.showToast('Communication settings saved successfully.');
    } catch (err: unknown) {
      await dialog.showMessage({
        title: 'Settings Not Saved',
        message: formatPocketBaseError(err),
        variant: 'danger',
      });
      throw err;
    }
  };

  const testSmtpMutation = useMutation({
    mutationFn: (email: string) => pb.send('/api/test-smtp', { method: 'POST', body: { email } }),
  });

  const testSmsMutation = useMutation({
    mutationFn: (phone: string) => pb.send('/api/test-sms', { method: 'POST', body: { phone } }),
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

  const startNewMessage = () => {
    setTab('compose');
    setWizardStep('TARGETS');
  };

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
      await dialog.showMessage({
        title: 'Could Not Load Recipients',
        message: formatPocketBaseError(err),
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
      await dialog.showMessage({
        title: 'Message Not Archived',
        message: formatPocketBaseError(err),
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
      <div className="mx-auto max-w-7xl p-3 sm:p-6">
        <AppCard className="flex items-center justify-center py-12">
          <p>Loading Communications...</p>
        </AppCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-3 sm:p-6">
      <div className="mb-6">
        <AdminPageHeader
          title="Communications"
          description="Create messages, manage drafts, review message history, and configure automated communications."
          actions={
            tab !== 'compose' ? (
              <Button
                type="button"
                variant="primary"
                onClick={startNewMessage}
                className="w-full whitespace-nowrap sm:w-auto"
              >
                <span aria-hidden="true">+</span>
                <span>New Message</span>
              </Button>
            ) : undefined
          }
          below={
            <>
              {routeState?.returnToPolls && pollsEnabled && (
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
          draft={draft}
          preview={preview}
          wizardStep={wizardStep}
          setWizardStep={setWizardStep}
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
                await dialog.showMessage({
                  title: 'Report Not Sent',
                  message: formatPocketBaseError(err),
                  variant: 'danger',
                });
              }
            }
          }}
          onArchiveTask={handleArchiveAutomatedTask}
          onViewTaskRecipients={handleViewAutomatedTaskRecipients}
          commSettings={library.commSettings}
          isSending={draft.isSending}
          onNewMessage={startNewMessage}
        />
      )}

      {tab === 'drafts' && (
        <DraftsPanel
          drafts={library.drafts}
          onResumeDraft={draft.handleResumeDraft}
          onStartNew={startNewMessage}
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
          onNewMessage={startNewMessage}
        />
      )}

      {tab === 'templates' && (
        <TemplatesPanel
          templates={library.templates}
          setTemplates={library.setTemplates}
          editingTemplate={library.editingTemplate}
          setEditingTemplate={library.setEditingTemplate}
          dialog={dialog}
          previewHtml={preview.previewHtml}
          onInsertPlaceholder={insertPlaceholder}
          editorRef={editorRef}
          choirName={library.choirName}
          senderEmail={library.commConfig.smtp.from || 'no-reply@choir.management'}
        />
      )}

      {tab === 'settings' && (
        <SettingsPanel
          config={configBaseline}
          isSaving={saveConfigMutation.isPending || saveEmailProviderMutation.isPending}
          saveError={saveConfigMutation.error || saveEmailProviderMutation.error}
          onSave={saveSettings}
          onSendTestEmail={async (email) => {
            const response = await testSmtpMutation.mutateAsync(email);
            if (!response || !response.success) {
              throw new Error(response?.error || 'Unknown error occurred.');
            }
          }}
          onSendTestSms={async (phone) => {
            const response = await testSmsMutation.mutateAsync(phone);
            if (!response || !response.success) {
              throw new Error(response?.error || 'Unknown error occurred.');
            }
          }}
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
