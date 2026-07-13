import type { DeliverySummary, MessageRecord } from '../../../services/communicationService';

/**
 * Composite display state, merging the message lifecycle with queue tracking state.
 * Archived always wins. If no summary exists, the message predates tracking.
 */
export type DeliveryDisplayState =
  | 'archived'
  | 'queued'
  | 'sending'
  | 'sent'
  | 'partial'
  | 'failed'
  | 'tracking-unavailable';

/** A delivery status filter that can be applied to the current page of history. */
export type DeliveryStatusFilter = 'all' | DeliveryDisplayState;

/**
 * Resolves a combined display state from the message record and its delivery summary.
 * - Archived messages always show as archived regardless of queue state.
 * - Messages without a summary default to tracking-unavailable (pre-Phase 3 sends).
 */
export function resolveDeliveryDisplayState(
  message: Pick<MessageRecord, 'status'>,
  summary: DeliverySummary | undefined
): DeliveryDisplayState {
  if (message.status === 'Archived') return 'archived';
  return summary?.state ?? 'tracking-unavailable';
}

/**
 * Formats a human-readable progress string from a delivery summary.
 * Used in the status column beneath the status badge.
 */
export function formatDeliveryProgress(summary: DeliverySummary): string {
  const { total } = summary;
  switch (summary.state) {
    case 'queued':
      return 'Queued';
    case 'sending':
      return `Sending: ${total.sent} of ${total.total} sent`;
    case 'sent':
      return `${total.sent} of ${total.total} sent`;
    case 'partial':
      return `${total.sent} of ${total.total} sent · ${total.failed} failed`;
    case 'failed':
      return `${total.failed} failed`;
    case 'tracking-unavailable':
      return 'Tracking unavailable';
  }
}
