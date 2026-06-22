import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDialog } from '../../../contexts/DialogContext';
import { queryKeys } from '../../../lib/queryKeys';
import { AppCard } from '../../../components/common/AppCard';
import { FormField, Input, Textarea, Button } from '../../../components/ui';
import {
  getTicketConfirmationPageSettings,
  saveTicketConfirmationPageSettings,
  type TicketConfirmationPageSettings,
} from '../../../services/settingsService';

export default function TicketingConfirmationSettings() {
  const dialog = useDialog();
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: queryKeys.ticketing.confirmationPage(),
    queryFn: getTicketConfirmationPageSettings,
    staleTime: 5 * 60_000,
  });

  const [form, setForm] = useState<TicketConfirmationPageSettings | null>(null);

  useEffect(() => {
    if (settingsQuery.data && !form) {
      setForm(settingsQuery.data);
    }
  }, [settingsQuery.data, form]);

  const saveMutation = useMutation({
    mutationFn: (value: TicketConfirmationPageSettings) =>
      saveTicketConfirmationPageSettings(value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ticketing.confirmationPage() });
      dialog.showToast('Confirmation page settings saved.');
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to save.';
      void dialog.showMessage({ title: 'Error', message, variant: 'danger' });
    },
  });

  const updateField = (field: keyof TicketConfirmationPageSettings, value: string) => {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSave = () => {
    if (!form) return;
    saveMutation.mutate(form);
  };

  const isDirty =
    !!form &&
    settingsQuery.data &&
    (form.successMessage !== settingsQuery.data.successMessage ||
      form.pendingMessage !== settingsQuery.data.pendingMessage ||
      form.willCallInstructions !== settingsQuery.data.willCallInstructions ||
      form.qrInstructions !== settingsQuery.data.qrInstructions);

  if (!form) {
    return (
      <div className="flex flex-col gap-6">
        <div className="border-border bg-surface rounded-xl border p-6">
          <p className="text-text-muted text-sm">Loading confirmation page settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      <AppCard title="Confirmation Page Text">
        <p className="text-text-muted mb-4 text-sm">
          Customize the text displayed on the ticket purchase confirmation page. These fields
          replace the default instructional messages shown to buyers after a successful purchase.
        </p>

        <div className="flex flex-col gap-5">
          <FormField label="Success Message">
            <Input
              type="text"
              value={form.successMessage}
              onChange={(e) => updateField('successMessage', e.target.value)}
              placeholder="e.g. Your purchase has been successfully processed."
              className="max-w-lg"
            />
          </FormField>

          <FormField label="Pending / Unverified Message">
            <Textarea
              value={form.pendingMessage}
              onChange={(e) => updateField('pendingMessage', e.target.value)}
              placeholder="e.g. We could not load the full ticket details yet..."
              className="max-w-lg"
            />
          </FormField>

          <FormField label="Will Call Instructions">
            <Textarea
              value={form.willCallInstructions}
              onChange={(e) => updateField('willCallInstructions', e.target.value)}
              placeholder="e.g. A confirmation email has been sent..."
              className="max-w-lg"
            />
          </FormField>

          <FormField label="QR Code Instructions">
            <Textarea
              value={form.qrInstructions}
              onChange={(e) => updateField('qrInstructions', e.target.value)}
              placeholder="e.g. Print or screenshot this entire page..."
              className="max-w-lg"
            />
          </FormField>
        </div>

        <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-4">
          <Button
            onClick={handleSave}
            variant="primary"
            disabled={saveMutation.isPending || !isDirty}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
          {isDirty && (
            <span className="text-xs font-medium text-amber-600">You have unsaved changes</span>
          )}
        </div>
      </AppCard>
    </div>
  );
}
