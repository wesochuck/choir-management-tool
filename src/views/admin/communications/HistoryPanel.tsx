import { useMemo, useState, useEffect } from 'react';
import { MessageHistory, type SourceFilter } from '../../../components/admin/MessageHistory';
import type { MessageRecord, CommunicationRecipient } from '../../../services/communicationService';
import type { Event } from '../../../services/eventService';
import type { CommunicationSettings } from '../../../services/settingsService';
import { useDeliverySummaries } from './useDeliverySummaries';
import type { DeliveryStatusFilter } from './deliveryPresentation';
import { useDialog } from '../../../contexts/DialogContext';
import { MessageDetailsModal } from './MessageDetailsModal';

interface HistoryPanelProps {
  history: MessageRecord[];
  historyPage: number;
  totalPages: number;
  setHistoryPage: (page: number) => void;
  historySearchQuery: string;
  onHistorySearchChange: (query: string) => void;
  events: Event[];
  commSettings: CommunicationSettings;
  onCopyDraft: (message: MessageRecord) => void;
  onViewRecipients: (recipients: CommunicationRecipient[], title: string) => void;
  onNewMessage: () => void;
}

export function HistoryPanel({
  history,
  historyPage,
  totalPages,
  setHistoryPage,
  historySearchQuery,
  onHistorySearchChange,
  events,
  commSettings,
  onCopyDraft,
  onViewRecipients,
  onNewMessage,
}: HistoryPanelProps) {
  const dialog = useDialog();
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [statusFilter, setStatusFilter] = useState<DeliveryStatusFilter>('all');
  const [selectedMessage, setSelectedMessage] = useState<MessageRecord | null>(null);

  // Collect non-archived message IDs for the current page
  const messageIds = useMemo(
    () => history.filter((m) => m.status !== 'Archived').map((m) => m.id),
    [history]
  );

  const delivery = useDeliverySummaries(messageIds);

  // Reset status filter when the page changes
  useEffect(() => {
    setStatusFilter('all');
  }, [historyPage]);

  const handleRetryFailed = async (message: MessageRecord, explicitFailedCount?: number) => {
    const count = explicitFailedCount ?? delivery.summaries[message.id]?.total.failed ?? 0;
    const confirmed = await dialog.confirm({
      title: 'Retry Failed Deliveries?',
      message: `Retry ${count} failed ${count === 1 ? 'delivery' : 'deliveries'} for "${message.subject || 'SMS message'}"? Successful deliveries will not be resent.`,
      confirmLabel: 'Retry failed deliveries',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      const result = await delivery.retryFailed(message.id);
      dialog.showToast(
        `${result.retriedCount} failed ${result.retriedCount === 1 ? 'delivery' : 'deliveries'} queued for retry.`
      );
    } catch (err: unknown) {
      await dialog.showMessage({
        title: 'Retry Failed',
        message:
          typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'An unexpected error occurred while retrying deliveries.',
        variant: 'danger',
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <MessageHistory
        history={history}
        currentPage={historyPage}
        totalPages={totalPages}
        onPageChange={setHistoryPage}
        historySearchQuery={historySearchQuery}
        onHistorySearchChange={onHistorySearchChange}
        sourceFilter={sourceFilter}
        onSourceFilterChange={setSourceFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        summaries={delivery.summaries}
        isSummariesLoading={delivery.isLoading}
        onViewDetails={(message) => setSelectedMessage(message)}
        onCopyDraft={onCopyDraft}
        onViewRecipients={onViewRecipients}
        onNewMessage={onNewMessage}
        onRetryFailed={handleRetryFailed}
        events={events}
        commSettings={commSettings}
      />
      <MessageDetailsModal
        message={selectedMessage}
        summary={selectedMessage ? delivery.summaries[selectedMessage.id] : undefined}
        events={events}
        commSettings={commSettings}
        isRetrying={delivery.isRetrying}
        onClose={() => setSelectedMessage(null)}
        onCopyDraft={onCopyDraft}
        onRetryFailed={handleRetryFailed}
      />
    </div>
  );
}
