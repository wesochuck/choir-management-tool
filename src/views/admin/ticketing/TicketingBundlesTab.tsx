import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ticketService, type TicketBundle } from '../../../services/ticketService';
import { queryKeys } from '../../../lib/queryKeys';
import { useDialog } from '../../../contexts/DialogContext';
import { formatInTimezone } from '../../../lib/timezone';
import { AppCard } from '../../../components/common/AppCard';
import { Button, Badge, ProgressBar, DataTable } from '../../../components/ui';
import type { ColumnDef } from '../../../components/ui';
import { useTicketingEvents, TICKETING_REFRESH_INTERVAL_MS } from './ticketingQueries';
import BundleFormModal from './BundleFormModal';

const EMPTY_BUNDLES: TicketBundle[] = [];

export default function TicketingBundlesTab() {
  const dialog = useDialog();
  const queryClient = useQueryClient();

  const { timezone, isLoading: isEventsLoading } = useTicketingEvents({
    includeMissingFromPurchases: false,
  });

  const bundlesQuery = useQuery({
    queryKey: queryKeys.ticketing.bundles(),
    queryFn: () => ticketService.getAllBundles(),
    staleTime: 30_000,
  });

  const allPurchasesQuery = useQuery({
    queryKey: queryKeys.ticketing.allPurchases(),
    queryFn: () => ticketService.getAllPurchases(),
    staleTime: 30_000,
    refetchInterval: TICKETING_REFRESH_INTERVAL_MS,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<TicketBundle | null>(null);

  const bundles = bundlesQuery.data ?? EMPTY_BUNDLES;
  const allPurchases = allPurchasesQuery.data ?? [];
  const loading = isEventsLoading || bundlesQuery.isLoading || allPurchasesQuery.isLoading;

  const deleteBundleMutation = useMutation({
    mutationFn: (bundleId: string) => ticketService.deleteBundle(bundleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ticketing.all });
    },
  });

  const getBundleSoldQty = (bundleId: string, bundleEvents: string[]) => {
    if (!bundleEvents || bundleEvents.length === 0) return 0;
    const firstEventId = bundleEvents[0];
    const matched = allPurchases.filter(
      (p) => p.bundle === bundleId && p.event === firstEventId && p.status === 'paid'
    );
    return matched.reduce((acc, curr) => acc + curr.quantity, 0);
  };

  const handleOpenCreateModal = () => {
    setEditingBundle(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (bundle: TicketBundle) => {
    setEditingBundle(bundle);
    setIsModalOpen(true);
  };

  const handleDeleteBundle = async (bundleId: string, bundleEvents: string[]) => {
    const soldQty = getBundleSoldQty(bundleId, bundleEvents);
    if (soldQty > 0) {
      await dialog.showMessage({
        title: 'Delete Prevented',
        message: 'This bundle has active purchases and cannot be deleted.',
        variant: 'danger',
      });
      return;
    }

    const confirmed = await dialog.confirm({
      title: 'Delete Bundle',
      message:
        'Are you sure you want to delete this season ticket bundle? This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      await deleteBundleMutation.mutateAsync(bundleId);
      dialog.showToast('Bundle deleted successfully.');
    } catch (err) {
      console.error(err);
      dialog.showToast('Failed to delete bundle.');
    }
  };

  const bundlesColumns: ColumnDef<TicketBundle>[] = [
    {
      id: 'title',
      header: 'Bundle Title',
      accessorFn: (b) => b.title,
      enableSorting: false,
      meta: { cardSection: 1, cardSide: 'left' },
    },
    {
      id: 'price',
      header: 'Price',
      cell: ({ row }) => (
        <span className="font-extrabold">${(row.original.priceCents / 100).toFixed(2)}</span>
      ),
      enableSorting: false,
      meta: { align: 'right', cardSection: 1, cardSide: 'right', cardLabel: 'Price' },
    },
    {
      id: 'active',
      header: 'Active',
      cell: ({ row }) => (
        <Badge tone={row.original.isActive ? 'success' : 'neutral'}>
          {row.original.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
      enableSorting: false,
      meta: { align: 'center', cardSection: 0, cardSide: 'left' },
    },
    {
      id: 'capacitySold',
      header: 'Capacity Sold',
      cell: ({ row }) => {
        const sold = getBundleSoldQty(row.original.id, row.original.events);
        return (
          <div className="flex flex-col gap-1">
            <span className="font-medium text-slate-800">
              {sold} / {row.original.capacity} sold
            </span>
            <ProgressBar
              value={Math.min(100, (sold / row.original.capacity) * 100)}
              className="h-1.5 w-[100px] [&::part(base)]:rounded"
            />
          </div>
        );
      },
      enableSorting: false,
      meta: { cardSection: 1, cardSide: 'left' },
    },
    {
      id: 'saleEndDate',
      header: 'Sale End Date',
      cell: ({ row }) =>
        formatInTimezone(row.original.saleEndDate, timezone, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
      enableSorting: false,
      meta: { cardSection: 0, cardSide: 'right', cardLabel: 'Ends:' },
    },
    {
      id: 'includedEvents',
      header: 'Included Events',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.expand?.events?.map((ev) => (
            <span
              key={ev.id}
              className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide whitespace-nowrap text-slate-700 uppercase"
            >
              {ev.title}
            </span>
          ))}
        </div>
      ),
      enableSorting: false,
      meta: { cardSection: 1, cardSide: 'left' },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button
            onClick={() => handleOpenEditModal(row.original)}
            variant="secondary"
            size="small"
          >
            Edit
          </Button>
          <Button
            onClick={() => handleDeleteBundle(row.original.id, row.original.events)}
            variant="danger"
            size="small"
          >
            Delete
          </Button>
        </div>
      ),
      enableSorting: false,
      meta: { align: 'right', cardSection: 1, cardSide: 'right' },
    },
  ];

  return (
    <>
      <AppCard noPadding>
        <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Season Bundles Configuration</h3>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Create and manage season ticket packages containing multiple concerts at a discount.
            </p>
          </div>
          <div className="shrink-0">
            <Button
              variant="primary"
              size="small"
              onClick={handleOpenCreateModal}
              title="Create New Bundle"
              icon={'➕'}
            >
              Create New Bundle
            </Button>
          </div>
        </div>

        <div className="p-6">
          <DataTable
            columns={bundlesColumns}
            data={bundles}
            isLoading={loading}
            emptyState={{
              title: 'No Season Bundles Configured',
              description:
                'Create recognition tiers or pass bundles to offer discount packages to your ticket buyers.',
              icon: '🎟️',
              action: (
                <Button variant="primary" size="small" onClick={handleOpenCreateModal}>
                  + Create New Bundle
                </Button>
              ),
            }}
            pageSize={20}
            renderMobileCard={(b) => {
              const sold = getBundleSoldQty(b.id, b.events);
              return (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <Badge tone={b.isActive ? 'success' : 'neutral'}>
                      {b.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <span className="text-xs font-medium text-slate-400">
                      Ends:{' '}
                      {formatInTimezone(b.saleEndDate, timezone, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-bold text-slate-800">{b.title}</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {b.expand?.events?.map((ev) => (
                          <span
                            key={ev.id}
                            className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide whitespace-nowrap text-slate-600 uppercase"
                          >
                            {ev.title}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="text-base font-extrabold text-emerald-700">
                        ${(b.priceCents / 100).toFixed(2)}
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        {sold} / {b.capacity} Sold
                      </span>
                    </div>
                  </div>

                  <div className="mt-1 flex justify-end gap-2 border-t border-slate-50 pt-1.5">
                    <Button variant="secondary" size="small" onClick={() => handleOpenEditModal(b)}>
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="small"
                      onClick={() => handleDeleteBundle(b.id, b.events)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              );
            }}
          />
        </div>
      </AppCard>

      <BundleFormModal
        isOpen={isModalOpen}
        bundle={editingBundle}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
