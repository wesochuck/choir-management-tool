import type React from 'react';
import { AppCard } from '../../../components/common/AppCard';
import { Button } from '../../../components/ui';
import { LivePreview } from '../../../components/LivePreview';
import type { CommunicationTab } from '../../../types/Communication';
import type { CommunicationSettings } from '../../../services/settingsService';
import type { Event } from '../../../services/eventService';
import type { ChoirUser } from '../../../types/auth';
import type {
  CommunicationRecipient,
  TemplateRecord,
} from '../../../services/communicationService';
import type { UseCommunicationDraftReturn } from './useCommunicationDraft';
import type { UseCommunicationPreviewReturn } from './useCommunicationPreview';
import { ReviewSidebar } from './ReviewSidebar';

interface ReviewStepProps {
  draft: UseCommunicationDraftReturn;
  preview: UseCommunicationPreviewReturn;
  commSettings: CommunicationSettings;
  selectedEvent: Event | null;
  user: ChoirUser | null;
  choirName: string;
  senderEmail: string;
  onBack: () => void;
  onViewRecipients: (recipients: CommunicationRecipient[], title: string) => void;
  setTab: (tab: CommunicationTab) => void;
  setEditingTemplate: React.Dispatch<React.SetStateAction<Partial<TemplateRecord> | null>>;
}

export function ReviewStep({
  draft,
  preview,
  commSettings,
  selectedEvent,
  user,
  choirName,
  senderEmail,
  onBack,
  onViewRecipients,
  setTab,
  setEditingTemplate,
}: ReviewStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="border-border flex w-full flex-col gap-3 border-b pb-2.5 md:flex-row md:items-center md:justify-between">
        <Button variant="outline" onClick={onBack} className="w-full md:w-auto">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-1 inline-flex size-4"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </Button>
        <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
          <Button
            variant="secondary"
            onClick={draft.handleSendTest}
            disabled={draft.isSendingTest || draft.isSending}
            title={`Send email test to ${user?.email || 'your email'}`}
            className="w-full sm:w-auto"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4"
            >
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            {draft.isSendingTest ? 'Sending test...' : 'Send Test to Me'}
          </Button>
          <Button
            variant="primary"
            onClick={draft.sendMessage}
            disabled={draft.isSending || draft.selectedRecipients.length === 0}
            className="w-full sm:w-auto"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            {draft.isSending ? 'Sending...' : `Send to ${draft.selectedRecipients.length} Singers`}
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <div className="flex flex-col lg:order-2">
          <ReviewSidebar
            selectedRecipients={draft.selectedRecipients}
            recipientCounts={draft.recipientCounts}
            onViewRecipients={onViewRecipients}
            subject={draft.subject}
            content={draft.content}
            messageType={draft.messageType}
            filters={draft.filters}
            selectedEvent={selectedEvent}
            commSettings={commSettings}
            setTab={setTab}
            setEditingTemplate={setEditingTemplate}
            isSendingTest={draft.isSendingTest}
            isSending={draft.isSending}
            handleSendTest={draft.handleSendTest}
            sendMessage={draft.sendMessage}
            setWizardStep={(step) => {
              if (step === 'COMPOSE') onBack();
            }}
            user={user}
          />
        </div>

        <div className="flex flex-col lg:order-1">
          <AppCard noPadding>
            <div className="p-4">
              <LivePreview
                channel={draft.messageType}
                subject={preview.renderedSubject}
                bodyHtml={preview.previewHtml}
                smsBody={preview.renderedSmsBody}
                recipientName={preview.previewRecipient?.name}
                recipientEmail={preview.previewRecipient?.email}
                senderName={choirName}
                senderEmail={senderEmail}
              />
            </div>
          </AppCard>
        </div>
      </div>
    </div>
  );
}
