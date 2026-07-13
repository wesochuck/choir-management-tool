import type React from 'react';
import type EasyMDE from 'easymde';
import { AppCard } from '../../../components/common/AppCard';
import { Button } from '../../../components/ui';
import { ComposeStep } from '../../../components/ComposeStep';
import { PlaceholderPanel } from '../../../components/admin/PlaceholderPanel';
import type { Event } from '../../../services/eventService';
import type { UseCommunicationDraftReturn } from './useCommunicationDraft';
import { SetlistWarning } from './SetlistWarning';
import { WizardActionBar } from './WizardActionBar';
import { WizardStepHeading } from './WizardStepHeading';

interface ComposeMessageStepProps {
  draft: UseCommunicationDraftReturn;
  editorRef: React.MutableRefObject<EasyMDE | null>;
  onInsertPlaceholder: (tag: string) => void;
  selectedEvent: Event | null;
  onBack: () => void;
  onContinue: () => void;
}

export function ComposeMessageStep({
  draft,
  editorRef,
  onInsertPlaceholder,
  selectedEvent,
  onBack,
  onContinue,
}: ComposeMessageStepProps) {
  const hasApprovedSetList = selectedEvent ? selectedEvent.setListApproved !== false : false;

  return (
    <div className="flex flex-col gap-6 pb-20 lg:pb-0">
      <WizardStepHeading
        step="COMPOSE"
        number={3}
        title="Compose Your Message"
        description="Write your message subject and body. Markdown and placeholders are supported."
      />

      <div className="flex flex-col items-stretch gap-6 lg:grid lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-4">
          <AppCard title="Composer">
            <ComposeStep
              subject={draft.subject}
              onSubjectChange={draft.setSubject}
              messageType={draft.messageType}
              onMessageTypeChange={draft.setMessageType}
              content={draft.content}
              onContentChange={draft.setContent}
              editorRef={editorRef}
              warnings={draft.warnings}
            />
          </AppCard>

          <WizardActionBar>
            <Button
              variant="outline"
              onClick={onBack}
              aria-label="Back to Templates"
              className="size-11 px-0 sm:w-auto sm:px-6"
            >
              <span aria-hidden="true">←</span>
              <span className="hidden sm:inline">Back</span>
            </Button>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={draft.handleSaveDraft}
                disabled={draft.isSavingDraft}
              >
                {draft.isSavingDraft ? 'Saving...' : 'Save Draft'}
              </Button>
              <Button variant="primary" onClick={onContinue}>
                Review Message
              </Button>
            </div>
          </WizardActionBar>
        </div>
        <PlaceholderPanel
          onInsert={onInsertPlaceholder}
          hasEvent={!!draft.filters.eventId}
          hasApprovedSetList={hasApprovedSetList}
          hasCallTime={!!selectedEvent?.callTime?.trim()}
        />
        <SetlistWarning selectedEvent={selectedEvent} content={draft.content} />
      </div>
    </div>
  );
}
