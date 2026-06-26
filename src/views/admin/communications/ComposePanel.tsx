import type React from 'react';
import type EasyMDE from 'easymde';
import { useEvents } from '../../../hooks/useEvents';
import { useVoiceParts } from '../../../hooks/useVoiceParts';
import { WizardStepper } from '../../../components/WizardStepper';
import type {
  CommunicationRecipient,
  MessageType,
  TemplateRecord,
} from '../../../services/communicationService';
import type { CommunicationSettings } from '../../../services/settingsService';
import type { CommunicationTab } from '../../../types/Communication';
import type { ChoirUser } from '../../../types/auth';
import type { WizardStep } from './types';
import type { UseCommunicationDraftReturn } from './useCommunicationDraft';
import type { UseCommunicationPreviewReturn } from './useCommunicationPreview';
import { useTemplateSelection } from './useTemplateSelection';
import { AudienceStep } from './AudienceStep';
import { TemplateStep } from './TemplateStep';
import { ComposeMessageStep } from './ComposeMessageStep';
import { ReviewStep } from './ReviewStep';

interface ComposePanelProps {
  draft: UseCommunicationDraftReturn;
  preview: UseCommunicationPreviewReturn;
  wizardStep: WizardStep;
  setWizardStep: (step: WizardStep) => void;
  commSettings: CommunicationSettings;
  templates: TemplateRecord[];
  setTab: (tab: CommunicationTab) => void;
  setEditingTemplate: React.Dispatch<React.SetStateAction<Partial<TemplateRecord> | null>>;
  editorRef: React.MutableRefObject<EasyMDE | null>;
  onInsertPlaceholder: (tag: string) => void;
  onViewRecipients: (recipients: CommunicationRecipient[], title: string) => void;
  user: ChoirUser | null;
  choirName: string;
  senderEmail: string;
}

export function ComposePanel({
  draft,
  preview,
  wizardStep,
  setWizardStep,
  commSettings,
  templates,
  setTab,
  setEditingTemplate,
  editorRef,
  onInsertPlaceholder,
  onViewRecipients,
  user,
  choirName,
  senderEmail,
}: ComposePanelProps) {
  const { events } = useEvents();
  const { labels: voicePartLabels, sections: configSections } = useVoiceParts();

  const templateSelection = useTemplateSelection({
    templates,
    setSubject: draft.setSubject as (v: string) => void,
    setContent: draft.setContent as (v: string) => void,
    setMessageType: draft.setMessageType as (v: MessageType) => void,
    onContinue: () => setWizardStep('COMPOSE'),
  });

  const selectedEvent = preview.selectedEvent;

  return (
    <div className="flex flex-col gap-4">
      <WizardStepper
        steps={[
          { number: 1, id: 'TARGETS', label: 'Audience', isValid: true },
          { number: 2, id: 'TEMPLATE', label: 'Template', isValid: true },
          { number: 3, id: 'COMPOSE', label: 'Message', isValid: true },
          {
            number: 4,
            id: 'REVIEW',
            label: 'Review & Send',
            isValid: draft.selectedRecipients.length > 0,
          },
        ]}
        currentStep={
          wizardStep === 'TARGETS'
            ? 1
            : wizardStep === 'TEMPLATE'
              ? 2
              : wizardStep === 'COMPOSE'
                ? 3
                : 4
        }
        onStepClick={(num) => {
          if (num === 1) setWizardStep('TARGETS');
          if (num === 2) setWizardStep('TEMPLATE');
          if (num === 3) setWizardStep('COMPOSE');
          if (num === 4) setWizardStep('REVIEW');
        }}
      />

      {wizardStep === 'TARGETS' && (
        <AudienceStep
          draft={draft}
          events={events}
          voicePartLabels={voicePartLabels}
          configSections={configSections}
          onViewRecipients={onViewRecipients}
          onContinue={() => setWizardStep('TEMPLATE')}
        />
      )}

      {wizardStep === 'TEMPLATE' && (
        <TemplateStep
          templates={templates}
          templateSelection={templateSelection}
          onBack={() => setWizardStep('TARGETS')}
        />
      )}

      {wizardStep === 'COMPOSE' && (
        <ComposeMessageStep
          draft={draft}
          editorRef={editorRef}
          onInsertPlaceholder={onInsertPlaceholder}
          selectedEvent={selectedEvent}
          onBack={() => setWizardStep('TEMPLATE')}
          onContinue={() => setWizardStep('REVIEW')}
        />
      )}

      {wizardStep === 'REVIEW' && (
        <ReviewStep
          draft={draft}
          preview={preview}
          commSettings={commSettings}
          selectedEvent={selectedEvent}
          user={user}
          choirName={choirName}
          senderEmail={senderEmail}
          onBack={() => setWizardStep('COMPOSE')}
          onViewRecipients={onViewRecipients}
          setTab={setTab}
          setEditingTemplate={setEditingTemplate}
        />
      )}
    </div>
  );
}
