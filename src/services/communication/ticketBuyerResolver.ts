import { pb } from '../../lib/pocketbase';
import type { TicketPurchase } from '../ticketService';
import type { CommunicationRecipient } from './types';

export async function resolveTicketBuyers(
  eventId?: string,
  optInOnly = false
): Promise<CommunicationRecipient[]> {
  let filter = "status = 'paid'";
  const params: { [key: string]: string | boolean } = {};
  if (eventId) {
    filter += ' && event = {:eventId}';
    params.eventId = eventId;
  }
  if (optInOnly) {
    filter += ' && marketingOptIn = {:optIn}';
    params.optIn = true;
  }

  const purchases = await pb.collection('ticketPurchases').getFullList<TicketPurchase>({
    filter: pb.filter(filter, params),
    sort: 'buyerName',
  });

  const unique = new Map<string, CommunicationRecipient>();
  purchases.forEach((p) => {
    if (!unique.has(p.buyerEmail)) {
      unique.set(p.buyerEmail, {
        id: p.id,
        name: p.buyerName,
        email: p.buyerEmail,
        phone: '',
        voicePart: 'Ticket Buyer',
        globalStatus: 'Paid',
      });
    }
  });

  return Array.from(unique.values());
}
