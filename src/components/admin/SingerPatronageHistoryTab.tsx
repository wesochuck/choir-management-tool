import React, { useEffect, useState, useMemo } from 'react';
import { ticketService, type TicketPurchase } from '../../services/ticketService';
import { donationService, type DonationRecord } from '../../services/donationService';
import { formatInTimezone } from '../../lib/timezone';
import { pb } from '../../lib/pocketbase';
import './RosterUtils.css';

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
      <div className="text-sm text-muted roster-ut-history-loading">
        Loading patronage history...
      </div>
    );
  }

  return (
    <div className="flex-col roster-ut-history-container">
      <div className="card roster-ut-patronage-summary">
        <div className="roster-ut-patronage-summary-label">Lifetime Value</div>
        <div className="roster-ut-patronage-summary-value">
          ${(ltvCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
      </div>

      <div>
        <h4 className="roster-ut-history-header">
          Transaction History ({items.length})
        </h4>
        <div className="flex-col roster-ut-history-list">
          {items.length === 0 ? (
            <p className="text-sm text-muted roster-ut-margin-0">No patronage history found.</p>
          ) : (
            items.map((item) => (
              <div key={`${item.type}-${item.id}`} className="card roster-ut-history-row">
                <div className="flex-row justify-between align-center">
                  <div className="flex-col">
                    <span className="text-sm font-medium">{item.description}</span>
                    <span className="text-xs text-muted">
                      {formatInTimezone(item.date, 'America/New_York', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex-col roster-ut-align-right">
                    <span className="text-sm font-bold">${(item.amountPaidCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    <span className={`text-xs uppercase font-bold ${item.status === 'paid' ? 'text-success' : 'text-danger'}`}>
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
