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

  const handleRetryFailed = async (message: MessageRecord) => {
    const summary = delivery.summaries[message.id];
    const failedCount = summary?.total.failed ?? 0;
    const confirmed = await dialog.confirm({
      title: 'Retry Failed Deliveries?',
      message: `Retry ${failedCount} failed ${failedCount === 1 ? 'delivery' : 'deliveries'} for "${message.subject || 'SMS message'}"? Successful deliveries will not be resent.`,
      confirmLabel: 'Retry failed deliveries',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) return;
    const result = await delivery.retryFailed(message.id);
    dialog.showToast(
      `${result.retriedCount} failed ${result.retriedCount === 1 ? 'delivery' : 'deliveries'} queued for retry.`
    );
  };

  const handleModalRetryFailed = async (message: MessageRecord, failedCount: number) => {
    const confirmed = await dialog.confirm({
      title: 'Retry Failed Deliveries?',
      message: `Retry ${failedCount} failed ${failedCount === 1 ? 'delivery' : 'deliveries'} for "${message.subject || 'SMS message'}"? Successful deliveries will not be resent.`,
      confirmLabel: 'Retry failed deliveries',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) return;
    const result = await delivery.retryFailed(message.id);
    dialog.showToast(
      `${result.retriedCount} failed ${result.retriedCount === 1 ? 'delivery' : 'deliveries'} queued for retry.`
    );
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
        onRetryFailed={handleModalRetryFailed}
      />
    </div>
  );
}
