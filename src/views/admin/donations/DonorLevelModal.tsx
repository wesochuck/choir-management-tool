import { Modal, Button, FormField, Input, Textarea } from '../../../components/ui';

interface DonorLevelModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingLevel: boolean;
  label: string;
  onLabelChange: (val: string) => void;
  amount: number;
  onAmountChange: (val: number) => void;
  benefit: string;
  onBenefitChange: (val: string) => void;
  onSave: () => void;
  isSaving: boolean;
}

export default function DonorLevelModal({
  isOpen,
  onClose,
  editingLevel,
  label,
  onLabelChange,
  amount,
  onAmountChange,
  benefit,
  onBenefitChange,
  onSave,
  isSaving,
}: DonorLevelModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingLevel ? 'Edit Donor Level' : 'Create Donor Level'}
      maxWidth="500px"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onSave}
            disabled={isSaving || !label.trim() || amount <= 0}
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Saving...
              </span>
            ) : (
              'Save Level'
            )}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <FormField label="Level Label" required>
          <Input
            type="text"
            value={label}
            onChange={(e) => onLabelChange(e.target.value)}
            placeholder="e.g. Bronze, Gold, Supporter..."
            required
          />
        </FormField>
        <FormField label="Minimum Amount ($)" required>
          <Input
            type="number"
            min={1}
            value={amount || ''}
            onChange={(e) => onAmountChange(Math.max(0, Number(e.target.value)))}
            placeholder="e.g. 50"
            required
          />
        </FormField>
        <FormField label="Benefit / Perks (Optional)">
          <Textarea
            rows={3}
            value={benefit}
            onChange={(e) => onBenefitChange(e.target.value)}
            placeholder="e.g. Mention in concert program, early access..."
          />
        </FormField>
      </div>
    </Modal>
  );
}
