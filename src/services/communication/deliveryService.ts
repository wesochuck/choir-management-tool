import { pb } from '../../lib/pocketbase';
import type { DeliverySummaryResponse, RetryFailedResponse } from './types';

/**
 * Fetches aggregated delivery summaries for a batch of message IDs.
 * The server hard-caps input at 10 IDs and 10,000 queue rows per message.
 */
export async function getDeliverySummaries(messageIds: string[]): Promise<DeliverySummaryResponse> {
  return pb.send<DeliverySummaryResponse>('/api/admin/communications/delivery-summary', {
    method: 'POST',
    body: { messageIds },
  });
}

/**
 * Resets only Failed emailQueue rows for one message back to Pending.
 * Successful rows are never touched.
 */
export async function retryFailedDeliveries(messageId: string): Promise<RetryFailedResponse> {
  return pb.send<RetryFailedResponse>('/api/admin/communications/retry-failed', {
    method: 'POST',
    body: { messageId },
  });
}
