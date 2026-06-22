import { AppCard } from '../../../components/common/AppCard';
import { Button, FormField, Input, Textarea } from '../../../components/ui';

interface PortalConfigCardProps {
  buttonText: string;
  description: string;
  onChangeButtonText: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onSave: () => void;
  isSaving: boolean;
}

export default function PortalConfigCard({
  buttonText,
  description,
  onChangeButtonText,
  onChangeDescription,
  onSave,
  isSaving,
}: PortalConfigCardProps) {
  return (
    <AppCard>
      <div className="border-b border-slate-100 pb-3">
        <h3 className="text-lg font-bold text-slate-800">Portal Configuration</h3>
      </div>
      <div className="mt-2 flex flex-col gap-5">
        <p className="text-xs leading-relaxed text-slate-500">
          Customize the heading text and detailed descriptive message shown to users on your
          public-facing checkout/donation webpage.
        </p>
        <FormField label="Call-to-Action Heading" required>
          <Input
            type="text"
            value={buttonText}
            onChange={(e) => onChangeButtonText(e.target.value)}
            placeholder="e.g. Support our Music"
            required
          />
        </FormField>
        <FormField label="Portal Description">
          <Textarea
            rows={5}
            value={description}
            onChange={(e) => onChangeDescription(e.target.value)}
            placeholder="e.g. Your contribution helps us keep the music playing..."
          />
        </FormField>
        <Button
          variant="primary"
          className="mt-2 w-full"
          onClick={onSave}
          disabled={isSaving || !buttonText.trim()}
        >
          {isSaving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Saving Settings...
            </span>
          ) : (
            'Save Settings'
          )}
        </Button>
      </div>
    </AppCard>
  );
}
