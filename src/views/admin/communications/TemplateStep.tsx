import { AppCard } from '../../../components/common/AppCard';
import { Button } from '../../../components/ui';
import { TemplateGrid } from '../../../components/TemplateGrid';
import type { TemplateRecord } from '../../../services/communicationService';
import { mapToMessageTemplate } from './templateMapping';
import { WizardStepHeading } from './WizardStepHeading';
import { WizardActionBar } from './WizardActionBar';

function getPrimaryButtonLabel(selectedTemplateId: string): string {
  return selectedTemplateId === 'blank' ? 'Use blank message' : 'Use template';
}

interface TemplateStepProps {
  templates: TemplateRecord[];
  templateSelection: {
    selectedTemplateId: string;
    setSelectedTemplateId: (id: string) => void;
    handleUseTemplate: () => void;
  };
  onBack: () => void;
}

export function TemplateStep({ templates, templateSelection, onBack }: TemplateStepProps) {
  const { selectedTemplateId, setSelectedTemplateId, handleUseTemplate } = templateSelection;

  return (
    <div className="flex flex-col gap-6 pb-20 lg:pb-0">
      <WizardStepHeading
        step="TEMPLATE"
        number={2}
        title="Choose how to start your message"
        description="Select a template below or start with a blank message."
      />

      <AppCard title="Templates & Quick Starts">
        <div className="flex flex-col gap-4">
          <TemplateGrid
            templates={templates.map(mapToMessageTemplate)}
            selectedTemplateId={selectedTemplateId}
            onSelect={(tpl) => setSelectedTemplateId(tpl.id)}
          />
        </div>
      </AppCard>

      <WizardActionBar>
        <Button
          variant="outline"
          onClick={onBack}
          aria-label="Back to Audience"
          className="size-11 px-0 sm:w-auto sm:px-6"
        >
          <span aria-hidden="true">←</span>
          <span className="hidden sm:inline">Back</span>
        </Button>
        <Button variant="primary" onClick={handleUseTemplate}>
          {getPrimaryButtonLabel(selectedTemplateId)}
        </Button>
      </WizardActionBar>
    </div>
  );
}
