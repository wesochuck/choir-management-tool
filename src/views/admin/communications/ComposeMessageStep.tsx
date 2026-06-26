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
    <div className="flex flex-col gap-4">
      <div className="border-border flex w-full flex-col items-center justify-between gap-2 border-b pb-2.5 md:flex-row">
        <Button variant="outline" onClick={onBack}>
          ← Back to Template Selection
        </Button>
        <div className="flex flex-2 flex-row flex-wrap items-center gap-2 lg:flex-none">
          <Button
            variant="secondary"
            onClick={draft.handleSaveDraft}
            disabled={draft.isSavingDraft}
          >
            {draft.isSavingDraft ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button variant="primary" onClick={onContinue}>
            Next: Review & Send →
          </Button>
        </div>
      </div>
      <div className="flex flex-col items-start gap-6 lg:grid lg:grid-cols-[1fr_300px]">
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
            <Button variant="outline" onClick={onBack}>
              ← Back to Template Selection
            </Button>
            <div className="flex flex-2 flex-row flex-wrap items-center gap-2 lg:flex-none">
              <Button
                variant="secondary"
                onClick={draft.handleSaveDraft}
                disabled={draft.isSavingDraft}
              >
                {draft.isSavingDraft ? 'Saving...' : 'Save Draft'}
              </Button>
              <Button variant="primary" onClick={onContinue}>
                Next: Review & Send →
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
