import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { ticketService } from '../../services/ticketService';
import { donationService } from '../../services/donationService';
import { formatInTimezone } from '../../lib/timezone';
import { pb } from '../../lib/pocketbase';
import { DataTable, type ColumnDef } from '../ui';

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

export const SingerPatronageHistoryTab: React.FC<SingerPatronageHistoryTabProps> = ({
  profileId,
  isOpen,
  isActive,
}) => {
  const { data: items = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.purchases.byProfile(profileId),
    queryFn: async () => {
      const [purchases, donations] = await Promise.all([
        ticketService.getPurchasesForProfile(profileId),
        donationService.getDonations(pb.filter('profile = {:profileId}', { profileId })),
      ]);

      const ticketItems: PatronageHistoryItem[] = purchases.map((p) => ({
        type: 'ticket',
        id: p.id,
        amountPaidCents: p.amountPaidCents,
        date: p.created,
        description: `Purchased ${p.quantity} ticket${p.quantity > 1 ? 's' : ''} for ${p.expand?.event?.title || 'Unknown Event'}`,
        status: p.status,
      }));

      const donationItems: PatronageHistoryItem[] = donations.map((d) => ({
        type: 'donation',
        id: d.id,
        amountPaidCents: d.amountPaidCents,
        date: d.created,
        description: `Donated $${(d.amountPaidCents / 100).toLocaleString()}`,
        status: d.status,
      }));

      const combined = [...ticketItems, ...donationItems].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      return combined;
    },
    enabled: isOpen && isActive,
  });

  const ltvCents = useMemo(() => {
    return items
      .filter((item) => item.status === 'paid')
      .reduce((sum, item) => sum + item.amountPaidCents, 0);
  }, [items]);

  const columns: ColumnDef<PatronageHistoryItem>[] = [
    {
      id: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{row.original.description}</span>
          <span className="text-muted text-xs">
            {formatInTimezone(row.original.date, 'America/New_York', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>
      ),
      meta: {
        cardSection: 0,
        cardSide: 'left',
      },
    },
    {
      id: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="text-sm font-bold">
          $
          {(row.original.amountPaidCents / 100).toLocaleString(undefined, {
            minimumFractionDigits: 2,
          })}
        </span>
      ),
      meta: {
        cardSection: 0,
        cardSide: 'right',
        align: 'right',
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span
          className={`text-xs font-bold uppercase ${row.original.status === 'paid' ? 'text-success-text' : 'text-danger-text'}`}
        >
          {row.original.status}
        </span>
      ),
      meta: {
        cardSection: 1,
        cardSide: 'right',
        cardLabel: 'Status',
      },
    },
  ];

  if (loading) {
    return <div className="text-muted p-4 text-sm">Loading patronage history...</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-primary-light flex flex-col gap-1 rounded-xl border border-[rgb(74_117_89_/_20%)] p-4">
        <div className="text-primary-deep text-xs font-semibold tracking-wider uppercase">
          Lifetime Value
        </div>
        <div className="text-primary text-2xl font-extrabold">
          ${(ltvCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
      </div>

      <div>
        <h4 className="text-text-muted m-0 mb-2 text-xs tracking-wider uppercase">
          Transaction History ({items.length})
        </h4>
        <DataTable
          columns={columns}
          data={items}
          isLoading={false}
          emptyState={{
            title: 'No patronage history found.',
            icon: (
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-text-muted"
              >
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            ),
          }}
          hidePagination
        />
      </div>
    </div>
  );
};
