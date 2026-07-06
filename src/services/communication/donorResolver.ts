import { pb } from '../../lib/pocketbase';
import type { DonationRecord } from '../donationService';
import type { CommunicationRecipient } from './types';

export async function resolveDonors(optInOnly = false): Promise<CommunicationRecipient[]> {
  let filter = "status = 'paid'";
  const params: { [key: string]: string | boolean } = {};
  if (optInOnly) {
    filter += ' && marketingOptIn = {:optIn}';
    params.optIn = true;
  }

  const donations = await pb.collection('donations').getFullList<DonationRecord>({
    filter: pb.filter(filter, params),
    sort: 'donorName',
  });

  const unique = new Map<string, CommunicationRecipient>();
  donations.forEach((d) => {
    if (!unique.has(d.donorEmail)) {
      unique.set(d.donorEmail, {
        id: d.id,
        name: d.donorName,
        email: d.donorEmail,
        phone: '',
        voicePart: 'Donor',
        globalStatus: 'Paid',
      });
    }
  });

  return Array.from(unique.values());
}
