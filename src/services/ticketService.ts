import { pb } from '../lib/pocketbase';
import type { RecordModel } from 'pocketbase';
import type { Event } from './eventService';

export interface TicketBundle extends RecordModel {
  title: string;
  priceCents: number;
  capacity: number;
  events: string[];
  saleEndDate: string;
  isActive: boolean;
  publicDetails?: string;
  expand?: {
    events?: Event[];
  };
}

export interface ValidationResult {
  valid: boolean;
  buyerName?: string;
  quantity?: number;
  eventId?: string;
  eventTitle?: string;
  eventDate?: string;
  isBundlePass?: boolean;
  bundleTitle?: string;
  bundleEvents?: { id: string; title: string; date: string }[];
  reason?: string;
}

export interface ScanContext {
  token: string;
  scanUrl: string;
  qrDataUri?: string;
  buyerName: string;
  eventTitle: string;
  eventDate: string;
  isBundlePass: boolean;
  bundleTitle?: string;
}

export interface TicketPurchase extends RecordModel {
  event: string;
  profile?: string;
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
  reminderSent?: boolean;
  fulfilledAt?: string;
  bundle?: string;
  expand?: {
    event?: Event;
    bundle?: TicketBundle;
    profile?: import('./profileService').Profile;
  };
}

export const ticketService = {
  async createCheckoutSession(
    eventId: string,
    quantity: number,
    email: string,
    name: string,
    marketingOptIn: boolean
  ): Promise<{ url: string; sessionId: string }> {
    return await pb.send<{ url: string; sessionId: string }>(
      '/api/checkout/create-tickets-session',
      {
        method: 'POST',
        body: { eventId, quantity, email, name, marketingOptIn },
      }
    );
  },

  async createBundleCheckoutSession(
    bundleId: string,
    quantity: number,
    email: string,
    name: string,
    marketingOptIn: boolean
  ): Promise<{ url: string; sessionId: string }> {
    return await pb.send<{ url: string; sessionId: string }>(
      '/api/checkout/create-bundle-session',
      {
        method: 'POST',
        body: { bundleId, quantity, email, name, marketingOptIn },
      }
    );
  },

  async pollForPurchaseRecord(
    sessionId: string,
    retries = 5,
    delay = 1000
  ): Promise<TicketPurchase | null> {
    // @allow-sequential-await - Sequential polling checks for Stripe fulfillment status.
    for (let i = 0; i < retries; i++) {
      try {
        const record = await pb
          .collection('ticketPurchases')
          .getFirstListItem<TicketPurchase>(
            pb.filter('stripeSessionId = {:sessionId}', { sessionId }),
            { expand: 'event,bundle' }
          );
        if (record) return record;
      } catch {
        // ignore and retry
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    return null;
  },

  async getPurchasesForEvent(eventId: string): Promise<TicketPurchase[]> {
    return await pb.collection('ticketPurchases').getFullList<TicketPurchase>({
      filter: pb.filter('event = {:eventId}', { eventId }),
      sort: 'buyerName',
      expand: 'event,bundle',
    });
  },

  async getPurchasesForProfile(profileId: string): Promise<TicketPurchase[]> {
    return await pb.collection('ticketPurchases').getFullList<TicketPurchase>({
      filter: pb.filter('profile = {:profileId}', { profileId }),
      sort: '-created',
      expand: 'event,bundle',
    });
  },

  async getAllPurchases(): Promise<TicketPurchase[]> {
    return await pb.collection('ticketPurchases').getFullList<TicketPurchase>({
      sort: '-created',
      expand: 'event,bundle',
    });
  },

  async adminRefundTicket(purchaseId: string): Promise<{ success: boolean }> {
    return await pb.send<{ success: boolean }>('/api/admin/refund-ticket', {
      method: 'POST',
      body: { purchaseId },
    });
  },

  async adminRefundBundle(paymentIntentId: string): Promise<{ success: boolean }> {
    return await pb.send<{ success: boolean }>('/api/admin/refund-bundle', {
      method: 'POST',
      body: { paymentIntentId },
    });
  },

  async validateScan(token: string, eventId: string): Promise<ValidationResult> {
    return await pb.send<ValidationResult>('/api/tickets/validate', {
      method: 'POST',
      body: { token, eventId },
    });
  },

  async getScanContext(sessionId: string, purchaseId: string): Promise<ScanContext> {
    return await pb.send<ScanContext>(
      `/api/tickets/scan-context?session_id=${encodeURIComponent(sessionId)}&purchase_id=${encodeURIComponent(purchaseId)}`,
      { method: 'GET' }
    );
  },

  async getPublicBundles(): Promise<TicketBundle[]> {
    return await pb.collection('ticketBundles').getFullList<TicketBundle>({
      filter: 'isActive = true && saleEndDate >= @now',
      sort: 'saleEndDate',
      expand: 'events',
    });
  },

  async getAllBundles(): Promise<TicketBundle[]> {
    return await pb.collection('ticketBundles').getFullList<TicketBundle>({
      sort: '-created',
      expand: 'events',
    });
  },

  async saveBundle(data: Partial<TicketBundle> & { id?: string }): Promise<TicketBundle> {
    const { id, ...rest } = data;
    if (id) {
      return await pb.collection('ticketBundles').update<TicketBundle>(id, rest);
    }
    return await pb.collection('ticketBundles').create<TicketBundle>(rest);
  },

  async deleteBundle(bundleId: string): Promise<void> {
    await pb.collection('ticketBundles').delete(bundleId);
  },

  async adminResendTicketConfirmation(
    purchaseId: string,
    recipientEmail?: string
  ): Promise<{ success: boolean; recipientEmail: string }> {
    return await pb.send<{ success: boolean; recipientEmail: string }>(
      '/api/admin/resend-ticket-confirmation',
      {
        method: 'POST',
        body: {
          purchaseId,
          recipientEmail,
        },
      }
    );
  },

  async hasPaidPurchasesForEvent(eventId: string): Promise<boolean> {
    try {
      await pb
        .collection('ticketPurchases')
        .getFirstListItem(pb.filter('event = {:eventId} && status = "paid"', { eventId }));
      return true;
    } catch {
      return false;
    }
  },
};
