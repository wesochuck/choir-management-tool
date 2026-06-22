import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDialog } from '../../../contexts/DialogContext';
import { ticketService } from '../../../services/ticketService';
import { queryKeys } from '../../../lib/queryKeys';
import { Modal, FormField, Input, Button } from '../../../components/ui';
import type { ResendConfirmationTarget } from './ticketingQueries';

interface ResendConfirmationModalProps {
  isOpen: boolean;
  target: ResendConfirmationTarget | null;
  onClose: () => void;
}

export default function ResendConfirmationModal({
  isOpen,
  target,
  onClose,
}: ResendConfirmationModalProps) {
  const dialog = useDialog();
  const queryClient = useQueryClient();
  const [resendEmail, setResendEmail] = useState('');

  useEffect(() => {
    if (target) {
      setResendEmail(target.buyerEmail);
    } else {
      setResendEmail('');
    }
  }, [target]);

  const resendConfirmationMutation = useMutation({
    mutationFn: ({ purchaseId, recipientEmail }: { purchaseId: string; recipientEmail?: string }) =>
      ticketService.adminResendTicketConfirmation(purchaseId, recipientEmail),
    onSuccess: (result) => {
      dialog.showToast(`Ticket confirmation sent to ${result.recipientEmail}.`);
      onClose();
      queryClient.invalidateQueries({ queryKey: queryKeys.ticketing.all });
    },
    onError: async (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      await dialog.showMessage({
        title: 'Resend Failed',
        message,
        variant: 'danger',
      });
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!target) return;
    resendConfirmationMutation.mutate({
      purchaseId: target.purchaseId,
      recipientEmail: resendEmail.trim(),
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Resend Ticket Confirmation">
      {target && (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="text-text-muted text-sm">
            Resend the ticket confirmation for <strong>{target.buyerName || 'this buyer'}</strong>.
          </div>

          <FormField label="Recipient email">
            <Input
              type="email"
              value={resendEmail}
              onChange={(event) => setResendEmail(event.target.value)}
              required
            />
          </FormField>

          <p className="text-text-muted text-xs">
            Change this email if the buyer typed their address incorrectly. This does not update the
            original purchase record.
          </p>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              disabled={resendConfirmationMutation.isPending}
              className="w-full sm:w-auto"
            >
              {resendConfirmationMutation.isPending ? 'Sending...' : 'Send Confirmation'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
