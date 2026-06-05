import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';
import type { Event } from './eventService';

export interface TicketPurchase extends RecordModel {
  event: string;
  buyerName: string;
  buyerEmail: string;
  quantity: number;
  unitPriceCents: number;
  feeCents: number;
  amountPaidCents: number;
  currency: string;
  stripeSessionId: string;
  stripePaymentIntentId: string;
  stripeCustomerId?: string;
  status: 'paid' | 'refunded' | 'pending';
  marketingOptIn: boolean;
  fulfilledAt?: string;
  expand?: {
    event?: Event;
  };
}

export const ticketService = {
  async createCheckoutSession(eventId: string, quantity: number, email: string, name: string): Promise<{ url: string; sessionId: string }> {
    return await pb.send<{ url: string; sessionId: string }>('/api/checkout/create-tickets-session', {
      method: 'POST',
      body: { eventId, quantity, email, name }
    });
  },

  async pollForPurchaseRecord(sessionId: string, retries = 5, delay = 1000): Promise<TicketPurchase | null> {
    // @allow-sequential-await - Sequential polling checks for Stripe fulfillment status.
    for (let i = 0; i < retries; i++) {
      try {
        const record = await pb.collection('ticketPurchases').getFirstListItem<TicketPurchase>(
          pb.filter('stripeSessionId = {:sessionId}', { sessionId })
        );
        if (record) return record;
      } catch {
        // ignore and retry
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    return null;
  },

  async getPurchasesForEvent(eventId: string): Promise<TicketPurchase[]> {
    return await pb.collection('ticketPurchases').getFullList<TicketPurchase>({
      filter: pb.filter('event = {:eventId}', { eventId }),
      sort: 'buyerName',
      expand: 'event'
    });
  },

  async getAllPurchases(): Promise<TicketPurchase[]> {
    return await pb.collection('ticketPurchases').getFullList<TicketPurchase>({
      sort: '-created',
      expand: 'event'
    });
  },

  async adminRefundTicket(purchaseId: string): Promise<{ success: boolean }> {
    return await pb.send<{ success: boolean }>('/api/admin/refund-ticket', {
      method: 'POST',
      body: { purchaseId }
    });
  }
};
