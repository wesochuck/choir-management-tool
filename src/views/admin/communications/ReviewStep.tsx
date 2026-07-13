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
import { useChoirSettings } from '../../../hooks/useDocumentTitle';
import { pluralizeLabel } from '../../../lib/labelHelpers';
import { RecipientSummaryCard } from './RecipientSummaryCard';
import { PreFlightChecklist } from './PreFlightChecklist';
import { WizardStepHeading } from './WizardStepHeading';
import { WizardActionBar } from './WizardActionBar';
import { summarizeRecipientReach } from './recipientReach';

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
  const { performerLabel } = useChoirSettings();
  const performerLabelPlural = pluralizeLabel(performerLabel);

  const reach = summarizeRecipientReach(draft.selectedRecipients, draft.messageType);
  const sendLabelChannel = draft.messageType === 'Both' ? 'Both' : draft.messageType;
  const performerText = reach.reachablePeople === 1 ? performerLabel : performerLabelPlural;
  const sendActionLabel = draft.isSending
    ? 'Sending...'
    : `Send ${sendLabelChannel} to ${reach.reachablePeople} ${performerText}`;

  return (
    <div className="flex flex-col gap-6 pb-20 lg:pb-0">
      <WizardStepHeading
        step="REVIEW"
        number={4}
        title="Review & Send"
        description="Verify your message format, checklist, and audience before sending."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        {/* Card 1: Recipient summary */}
        <div data-review-section="recipients" className="order-1 lg:col-start-2 lg:row-start-1">
          <RecipientSummaryCard
            selectedRecipients={draft.selectedRecipients}
            recipientCounts={draft.recipientCounts}
            onViewRecipients={onViewRecipients}
          />
        </div>

        {/* Card 2: Live preview */}
        <div
          data-review-section="preview"
          className="order-2 lg:col-start-1 lg:row-span-2 lg:row-start-1"
        >
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

        {/* Card 3: Pre-flight checklist */}
        <div data-review-section="checklist" className="order-3 lg:col-start-2 lg:row-start-2">
          <PreFlightChecklist
            subject={draft.subject}
            content={draft.content}
            messageType={draft.messageType}
            selectedRecipients={draft.selectedRecipients}
            filters={draft.filters}
            selectedEvent={selectedEvent}
            commSettings={commSettings}
            setTab={setTab}
            setEditingTemplate={setEditingTemplate}
          />
        </div>
      </div>

      <WizardActionBar>
        <Button
          variant="outline"
          onClick={onBack}
          aria-label="Back to Message"
          className="size-11 px-0 sm:w-auto sm:px-6"
        >
          <span aria-hidden="true">←</span>
          <span className="hidden sm:inline">Back</span>
        </Button>
        <div className="flex min-w-0 gap-1.5 sm:gap-2">
          <Button
            variant="secondary"
            onClick={draft.handleSendTest}
            disabled={draft.isSendingTest || draft.isSending}
            title={`Send email test to ${user?.email || 'your email'}`}
            aria-label={draft.isSendingTest ? 'Sending test...' : 'Send Test to Me'}
            className="px-3 sm:px-4"
          >
            <span className="sm:hidden">{draft.isSendingTest ? 'Sending...' : 'Test'}</span>
            <span className="hidden sm:inline">
              {draft.isSendingTest ? 'Sending test...' : 'Send Test to Me'}
            </span>
          </Button>
          <Button
            variant="primary"
            onClick={draft.sendMessage}
            disabled={draft.isSending || reach.reachablePeople === 0}
            aria-label={sendActionLabel}
            className="px-3 sm:px-4"
          >
            <span className="sm:hidden">
              {draft.isSending ? 'Sending...' : `Send ${reach.reachablePeople}`}
            </span>
            <span className="hidden sm:inline">{sendActionLabel}</span>
          </Button>
        </div>
      </WizardActionBar>
    </div>
  );
}
