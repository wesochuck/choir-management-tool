import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import EasyMDE from 'easymde';
import { useDialog } from '../../contexts/DialogContext';
import { useEvents } from '../../hooks/useEvents';
import { useVoiceParts } from '../../hooks/useVoiceParts';
import { useAuth } from '../../contexts/AuthContext';
import { CommunicationTabs } from '../../components/CommunicationTabs';
import type { CommunicationTab } from '../../types/Communication';
import type {
  CommunicationRecipient,
  MessageRecord,
} from '../../services/communicationService';
import { pb } from '../../lib/pocketbase';
import { communicationService } from '../../services/communicationService';
import { settingsService } from '../../services/settingsService';

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
import type {
  CommunicationRouteState,
  WizardStep,
} from './communications/types';

import './CommunicationView.css';

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
  }>({
    isOpen: false,
    recipients: [],
    title: '',
  });

  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState(user?.email || '');
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);

  const library = useCommunicationLibrary();

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
    setSentTaskStatus: automated.setSentTaskStatus,
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
    });
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
      <div style={{ padding: '40px', textAlign: 'center' }}>Loading Communications...</div>
    );
  }

  return (
    <div className="communication-container">
      <div className="communication-header">
        <div className="flex-col" style={{ gap: '6px' }}>
          <h1 className="text-display" style={{ margin: 0 }}>
            Communications
          </h1>
          {routeState?.returnToPolls && (
            <Link
              to="/admin/polls"
              className="text-muted text-sm"
              style={{ textDecoration: 'underline' }}
            >
              Back to Polls
            </Link>
          )}
        </div>

        <CommunicationTabs
          activeTab={tab}
          onTabChange={(nextTab) => {
            setTab(nextTab);
            if (nextTab === 'compose' && wizardStep === 'REVIEW') {
              setWizardStep('TARGETS');
            }
          }}
          draftsCount={library.drafts.length}
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
        />
      )}

      {tab === 'automated' && (
        <AutomatedTasksPanel
          upcomingTasks={automated.upcomingTasks}
          pastTasks={automated.pastTasks}
          onDraftTaskMessage={handleDraftTaskMessage}
          onTriggerReport={async (task) => {
            const confirmed = await dialog.confirm({
              title: 'Send Report Now?',
              message: `Generate and send the attendance report for "${
                task.event.title || task.event.type
              }" immediately?`,
              confirmLabel: 'Send Now',
            });
            if (confirmed) {
              automated.setSentTaskStatus((prev) => ({
                ...prev,
                [`report-${task.event.id}`]: true,
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
          onViewRecipients={handleViewRecipients}
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
              library.setDrafts(await communicationService.getDrafts());
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
          events={events}
          commSettings={library.commSettings}
          onViewDetails={setSelectedMessage}
          onCopyDraft={draft.handleResumeDraft}
          onViewRecipients={handleViewRecipients}
        />
      )}

      {tab === 'settings' && (
        <SettingsPanel
          commSettings={library.commSettings}
          setCommSettings={library.setCommSettings}
          testEmailAddress={testEmailAddress}
          setTestEmailAddress={setTestEmailAddress}
          isTestingSmtp={isTestingSmtp}
          onSendConnectionTest={async () => {
            if (!testEmailAddress) {
              await dialog.showMessage({
                title: 'Error',
                message: 'Please enter a destination email address.',
                variant: 'danger',
              });
              return;
            }

            setIsTestingSmtp(true);
            try {
              const response = await pb.send('/api/test-smtp', {
                method: 'POST',
                body: { email: testEmailAddress },
              });

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
            } finally {
              setIsTestingSmtp(false);
            }
          }}
          isSavingConfig={library.isSavingConfig}
          onSaveSettings={async () => {
            library.setIsSavingConfig(true);
            try {
              await settingsService.saveCommunicationSettings(library.commSettings);
              dialog.showToast('Settings updated successfully.');
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : String(err);
              await dialog.showMessage({
                title: 'Error',
                message: 'Failed to save settings: ' + message,
                variant: 'danger',
              });
            } finally {
              library.setIsSavingConfig(false);
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

