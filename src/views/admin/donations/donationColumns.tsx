import type { ColumnDef } from '../../../components/ui';
import type { DonationRecord } from '../../../services/donationService';
import { formatInTimezone } from '../../../lib/timezone';
import { Badge, Button } from '../../../components/ui';

export function createDonationColumns(
  timezone: string,
  onRefund: (id: string) => void
): ColumnDef<DonationRecord>[] {
  return [
    {
      id: 'date',
      header: 'Date',
      cell: ({ row }) =>
        formatInTimezone(row.original.created, timezone, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
      enableSorting: false,
      meta: {
        cardSection: 0,
        cardSide: 'left',
      },
    },
    {
      id: 'donor',
      header: 'Donor',
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span>{row.original.donorName}</span>
          {row.original.isAnonymous && (
            <span className="inline-flex w-fit items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-slate-600 uppercase">
              Anonymous
            </span>
          )}
        </div>
      ),
      enableSorting: false,
      meta: {
        cardSection: 1,
        cardSide: 'left',
      },
    },
    {
      id: 'email',
      header: 'Email',
      accessorFn: (d) => d.donorEmail,
      enableSorting: false,
      meta: {
        cardSection: 1,
        cardSide: 'left',
      },
    },
    {
      id: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="font-extrabold">${(row.original.amountPaidCents / 100).toFixed(2)}</span>
      ),
      enableSorting: false,
      meta: {
        align: 'right',
        cardSection: 1,
        cardSide: 'right',
        cardLabel: 'Amount',
      },
    },
    {
      id: 'tribute',
      header: 'Tribute',
      cell: ({ row }) =>
        row.original.tributeType !== 'none' ? (
          <span className="inline-flex flex-wrap items-center gap-1">
            <span className="text-slate-400">
              In {row.original.tributeType === 'memory' ? 'Memory' : 'Honor'} of
            </span>
            <strong className="font-semibold text-slate-700">{row.original.tributeName}</strong>
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
      enableSorting: false,
      meta: {
        cardSection: 1,
        cardSide: 'left',
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge
          tone={
            row.original.status === 'paid'
              ? 'success'
              : row.original.status === 'refunded'
                ? 'danger'
                : 'neutral'
          }
        >
          {row.original.status}
        </Badge>
      ),
      enableSorting: false,
      meta: {
        align: 'center',
        cardSection: 0,
        cardSide: 'right',
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) =>
        row.original.status === 'paid' ? (
          <Button variant="danger" size="small" onClick={() => onRefund(row.original.id)}>
            Refund
          </Button>
        ) : null,
      enableSorting: false,
      meta: {
        align: 'right',
        cardSection: 1,
        cardSide: 'right',
      },
    },
  ];
}
