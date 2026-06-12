import React, { useEffect, useState, useMemo } from 'react';
import { ticketService } from '../../services/ticketService';
import { donationService } from '../../services/donationService';
import { formatInTimezone } from '../../lib/timezone';
import { pb } from '../../lib/pocketbase';

interface SingerPatronageHistoryTabProps {
  profileId: string;
  isOpen: boolean;
  isActive: boolean;
}

interface PatronageHistoryItem {
  type: 'ticket' | 'donation';
  id: string;
  amountPaidCents: number;
  date: string;
  description: string;
  status: string;
}

export const SingerPatronageHistoryTab: React.FC<SingerPatronageHistoryTabProps> = ({ profileId, isOpen, isActive }) => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PatronageHistoryItem[]>([]);

  useEffect(() => {
    if (isOpen && isActive) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const [purchases, donations] = await Promise.all([
            ticketService.getPurchasesForProfile(profileId),
            donationService.getDonations(pb.filter('profile = {:profileId}', { profileId }))
          ]);

          const ticketItems: PatronageHistoryItem[] = purchases.map(p => ({
            type: 'ticket',
            id: p.id,
            amountPaidCents: p.amountPaidCents,
            date: p.created,
            description: `Purchased ${p.quantity} ticket${p.quantity > 1 ? 's' : ''} for ${p.expand?.event?.title || 'Unknown Event'}`,
            status: p.status
          }));

          const donationItems: PatronageHistoryItem[] = donations.map(d => ({
            type: 'donation',
            id: d.id,
            amountPaidCents: d.amountPaidCents,
            date: d.created,
            description: `Donated $${(d.amountPaidCents / 100).toLocaleString()}`,
            status: d.status
          }));

          const combined = [...ticketItems, ...donationItems].sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );

          setItems(combined);
        } catch (err) {
          console.error('Failed to fetch patronage history:', err);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }
  }, [profileId, isOpen, isActive]);

  const ltvCents = useMemo(() => {
    return items
      .filter(item => item.status === 'paid')
      .reduce((sum, item) => sum + item.amountPaidCents, 0);
  }, [items]);

  if (loading) {
    return (
      <div className="text-muted p-4 text-sm">
        Loading patronage history...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 rounded-xl border border-[rgb(74_117_89_/_20%)] bg-primary-light p-4">
        <div className="text-xs font-semibold tracking-wider text-primary-deep uppercase">Lifetime Value</div>
        <div className="text-2xl font-extrabold text-primary">
          ${(ltvCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
      </div>

      <div>
        <h4 className="m-0 mb-2 text-xs tracking-wider text-text-muted uppercase">
          Transaction History ({items.length})
        </h4>
        <div className="flex flex-col gap-2">
          {items.length === 0 ? (
            <p className="text-muted m-0 text-sm">No patronage history found.</p>
          ) : (
            items.map((item) => (
              <div key={`${item.type}-${item.id}`} className="m-0 rounded-xl border border-border bg-surface p-3 px-4 shadow-none">
                <div className="flex flex-row items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{item.description}</span>
                    <span className="text-muted text-xs">
                      {formatInTimezone(item.date, 'America/New_York', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex flex-col items-end text-right">
                    <span className="text-sm font-bold">${(item.amountPaidCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    <span className={`text-xs font-bold uppercase ${item.status === 'paid' ? 'text-success-text' : 'text-danger-text'}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
