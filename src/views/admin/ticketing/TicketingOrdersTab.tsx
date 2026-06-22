import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ticketService } from '../../../services/ticketService';
import { queryKeys } from '../../../lib/queryKeys';
import { useDialog } from '../../../contexts/DialogContext';
import { formatInTimezone } from '../../../lib/timezone';
import { AppCard } from '../../../components/common/AppCard';
import { Button, Badge, DataTable } from '../../../components/ui';
import type { ColumnDef } from '../../../components/ui';
import { useTicketingEvents, TICKETING_REFRESH_INTERVAL_MS } from './ticketingQueries';
import type { BundleOrder, ResendConfirmationTarget } from './ticketingQueries';
import ResendConfirmationModal from './ResendConfirmationModal';

export default function TicketingOrdersTab() {
  const dialog = useDialog();
  const queryClient = useQueryClient();

  const { timezone, isLoading: isEventsLoading } = useTicketingEvents({
    includeMissingFromPurchases: false,
  });

  const allPurchasesQuery = useQuery({
    queryKey: queryKeys.ticketing.allPurchases(),
    queryFn: () => ticketService.getAllPurchases(),
    refetchInterval: TICKETING_REFRESH_INTERVAL_MS,
  });

  const [resendTarget, setResendTarget] = useState<ResendConfirmationTarget | null>(null);

  const allPurchases = useMemo(() => allPurchasesQuery.data ?? [], [allPurchasesQuery.data]);
  const loading = isEventsLoading || allPurchasesQuery.isLoading;

  const refundBundleMutation = useMutation({
    mutationFn: (paymentIntentId: string) => ticketService.adminRefundBundle(paymentIntentId),
    onSuccess: () => {
      dialog.showToast('Bundle refunded successfully.');
      queryClient.invalidateQueries({ queryKey: queryKeys.ticketing.all });
    },
    onError: async () => {
      await dialog.showMessage({
        title: 'Refund Failed',
        message: 'Could not process the bundle refund. Please verify the Stripe Dashboard.',
        variant: 'danger',
      });
    },
  });

  const handleRefundBundle = async (paymentIntentId: string) => {
    const confirmed = await dialog.confirm({
      title: 'Refund Bundle Purchase',
      message:
        'Are you sure you want to refund this bundle purchase? This will issue a full Stripe refund and void all associated individual tickets on the Will Call lists. This action is permanent and cannot be undone.',
      confirmLabel: 'Refund Bundle',
      variant: 'danger',
    });
    if (!confirmed) return;
    dialog.showToast('Processing bundle refund...');
    await refundBundleMutation.mutateAsync(paymentIntentId);
  };

  const handleOpenResendConfirmation = (order: BundleOrder) => {
    setResendTarget({
      purchaseId: order.purchaseId,
      buyerEmail: order.buyerEmail,
      buyerName: order.buyerName,
    });
  };

  const bundleOrders = useMemo(() => {
    const map = new Map<string, BundleOrder>();

    allPurchases.forEach((p) => {
      if (p.bundle) {
        const key = p.stripeSessionId;
        if (!map.has(key)) {
          map.set(key, {
            purchaseId: p.id,
            stripeSessionId: p.stripeSessionId,
            stripePaymentIntentId: p.stripePaymentIntentId,
            buyerName: p.buyerName,
            buyerEmail: p.buyerEmail,
            quantity: p.quantity,
            amountPaidCents: p.amountPaidCents,
            created: p.created,
            status: p.status,
            bundleTitle: p.expand?.bundle?.title || 'Unknown Bundle',
            bundleId: p.bundle,
          });
        }
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
    );
  }, [allPurchases]);

  const ordersColumns: ColumnDef<BundleOrder>[] = [
    {
      id: 'buyerName',
      header: 'Buyer Name',
      accessorFn: (o) => o.buyerName,
      enableSorting: false,
      meta: { cardSection: 1, cardSide: 'left' },
    },
    {
      id: 'email',
      header: 'Email',
      accessorFn: (o) => o.buyerEmail,
      enableSorting: false,
      meta: { cardSection: 1, cardSide: 'left' },
    },
    {
      id: 'purchaseDate',
      header: 'Purchase Date',
      cell: ({ row }) =>
        formatInTimezone(row.original.created, timezone, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
      enableSorting: false,
      meta: { cardSection: 0, cardSide: 'left' },
    },
    {
      id: 'bundleTitle',
      header: 'Season Bundle',
      accessorFn: (o) => o.bundleTitle,
      enableSorting: false,
      meta: { cardSection: 1, cardSide: 'left' },
    },
    {
      id: 'qty',
      header: 'Qty',
      accessorFn: (o) => o.quantity,
      enableSorting: false,
      meta: { cardSection: 1, cardSide: 'right' },
    },
    {
      id: 'amountPaid',
      header: 'Amount Paid',
      cell: ({ row }) => (
        <span className="font-extrabold">${(row.original.amountPaidCents / 100).toFixed(2)}</span>
      ),
      enableSorting: false,
      meta: { align: 'right', cardSection: 1, cardSide: 'right', cardLabel: 'Amount' },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge tone={row.original.status === 'paid' ? 'success' : 'danger'}>
          {row.original.status}
        </Badge>
      ),
      enableSorting: false,
      meta: { align: 'center', cardSection: 0, cardSide: 'right' },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) =>
        row.original.status === 'paid' ? (
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="small"
              onClick={() => handleOpenResendConfirmation(row.original)}
            >
              Resend
            </Button>

            <Button
              variant="danger"
              size="small"
              onClick={() => handleRefundBundle(row.original.stripePaymentIntentId)}
            >
              Refund Bundle
            </Button>
          </div>
        ) : null,
      enableSorting: false,
      meta: { align: 'right', cardSection: 1, cardSide: 'right' },
    },
  ];

  return (
    <>
      <AppCard noPadding>
        <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Season Pass Orders</h3>
            <p className="mt-1 text-sm font-medium text-slate-500">
              View and manage transactions of season bundle ticket pass purchases.
            </p>
          </div>
        </div>

        <div className="p-6">
          <DataTable<BundleOrder>
            columns={ordersColumns}
            data={bundleOrders}
            isLoading={loading}
            emptyState={{
              title: 'No Orders Found',
              description: 'No season pass orders have been placed yet.',
              icon: '🎫',
            }}
            pageSize={20}
            getRowClassName={(o) => (o.status === 'refunded' ? 'opacity-60' : '')}
            renderMobileCard={(order) => (
              <div
                className={`flex flex-col gap-3 ${order.status === 'refunded' ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">
                    {formatInTimezone(order.created, timezone, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                  <Badge tone={order.status === 'paid' ? 'success' : 'danger'}>
                    {order.status}
                  </Badge>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-slate-800">{order.buyerName}</span>
                    <span className="text-xs font-medium break-all text-slate-500">
                      {order.buyerEmail}
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-slate-600">
                      Bundle: {order.bundleTitle}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className="text-sm font-bold text-slate-900">
                      {order.quantity} Pass{order.quantity !== 1 ? 'es' : ''}
                    </span>
                    <span className="text-base font-extrabold text-emerald-700">
                      ${(order.amountPaidCents / 100).toFixed(2)}
                    </span>
                  </div>
                </div>

                {order.status === 'paid' && (
                  <div className="mt-1 flex justify-end gap-2 border-t border-slate-50 pt-1.5">
                    <Button
                      variant="secondary"
                      size="small"
                      className="flex-1"
                      onClick={() => handleOpenResendConfirmation(order)}
                    >
                      Resend
                    </Button>
                    <Button
                      variant="danger"
                      size="small"
                      className="flex-1"
                      onClick={() => handleRefundBundle(order.stripePaymentIntentId)}
                    >
                      Refund Bundle
                    </Button>
                  </div>
                )}
              </div>
            )}
          />
        </div>
      </AppCard>

      <ResendConfirmationModal
        isOpen={resendTarget !== null}
        target={resendTarget}
        onClose={() => setResendTarget(null)}
      />
    </>
  );
}
