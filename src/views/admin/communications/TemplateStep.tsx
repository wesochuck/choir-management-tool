import { AppCard } from '../../../components/common/AppCard';
import { Button } from '../../../components/ui';
import { TemplateGrid } from '../../../components/TemplateGrid';
import type { TemplateRecord } from '../../../services/communicationService';
import { mapToMessageTemplate } from './templateMapping';
import { WizardActionBar } from './WizardActionBar';

interface TemplateStepProps {
  templates: TemplateRecord[];
  templateSelection: {
    selectedTemplateId: string | null;
    setSelectedTemplateId: (id: string | null) => void;
    handleUseTemplate: () => void;
  };
  onBack: () => void;
}

export function TemplateStep({ templates, templateSelection, onBack }: TemplateStepProps) {
  const { selectedTemplateId, setSelectedTemplateId, handleUseTemplate } = templateSelection;

  return (
    <div className="flex flex-col gap-6">
      <div className="border-border flex w-full items-center justify-between gap-3 border-b pb-3 max-md:flex-col">
        <div>
          <h2 className="text-text text-lg font-semibold">
            Step 2: Choose how to start your message
          </h2>
          <p className="text-text-muted text-sm">
            Select a template below or start with a blank message.
          </p>
        </div>
        <Button variant="outline" onClick={onBack}>
          ← Back to Audience
        </Button>
      </div>

      <AppCard title="Templates & Quick Starts">
        <div className="flex flex-col gap-4">
          <TemplateGrid
            templates={templates.map(mapToMessageTemplate)}
            selectedTemplateId={selectedTemplateId}
            onSelect={(tpl) => {
              setSelectedTemplateId(tpl.id);
            }}
          />
        </div>
      </AppCard>

      <WizardActionBar className="justify-between">
        <Button variant="outline" onClick={onBack}>
          ← Back to Audience
        </Button>
        <Button variant="primary" onClick={handleUseTemplate}>
          {selectedTemplateId === 'blank' ? 'Start Blank Message' : 'Use Template & Continue'}
        </Button>
      </WizardActionBar>
    </div>
  );
}
