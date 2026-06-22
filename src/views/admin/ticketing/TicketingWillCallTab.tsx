import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ticketService, type TicketPurchase } from '../../../services/ticketService';
import { queryKeys } from '../../../lib/queryKeys';
import { useDialog } from '../../../contexts/DialogContext';
import { formatInTimezone } from '../../../lib/timezone';
import { getFirstName, getLastName } from '../../../lib/stringUtils';
import { AppCard } from '../../../components/common/AppCard';
import { Button, FormField, Badge, Select, Input, DataTable } from '../../../components/ui';
import type { ColumnDef } from '../../../components/ui';
import { useTicketingEvents, TICKETING_REFRESH_INTERVAL_MS } from './ticketingQueries';
import ResendConfirmationModal from './ResendConfirmationModal';
import type { ResendConfirmationTarget } from './ticketingQueries';

const EMPTY_PURCHASES: TicketPurchase[] = [];

export default function TicketingWillCallTab() {
  const dialog = useDialog();
  const queryClient = useQueryClient();
  const [now] = useState(() => Date.now());

  const [showPastAndInactive, setShowPastAndInactive] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'lastName' | 'firstName' | 'saleDate'>('lastName');
  const [resendTarget, setResendTarget] = useState<ResendConfirmationTarget | null>(null);

  const {
    events,
    timezone,
    isLoading: isEventsLoading,
  } = useTicketingEvents({
    includeMissingFromPurchases: true,
  });

  const purchasesQuery = useQuery({
    queryKey: queryKeys.ticketing.purchasesByEvent(selectedEventId),
    queryFn: () => ticketService.getPurchasesForEvent(selectedEventId),
    enabled: !!selectedEventId,
    refetchInterval: TICKETING_REFRESH_INTERVAL_MS,
  });

  const purchases = purchasesQuery.data ?? EMPTY_PURCHASES;
  const loading = isEventsLoading || (selectedEventId ? purchasesQuery.isLoading : false);

  const visibleEvents = useMemo(() => {
    const cutoffTime = now - 3 * 60 * 60 * 1000;
    return events.filter((ev) => {
      if (showPastAndInactive) return true;
      const isUpcoming = new Date(ev.date).getTime() >= cutoffTime;
      const isActive = ev.isTicketingEnabled;
      return isUpcoming && isActive;
    });
  }, [events, showPastAndInactive, now]);

  // Auto-select first event
  useEffect(() => {
    if (visibleEvents.length > 0) {
      const alreadySelected = visibleEvents.some((e) => e.id === selectedEventId);
      if (!alreadySelected) {
        setSelectedEventId(visibleEvents[0].id);
      }
    } else {
      setSelectedEventId('');
    }
  }, [visibleEvents, selectedEventId]);

  const activePurchases = useMemo(() => {
    return purchases.filter((p) => p.status === 'paid');
  }, [purchases]);

  const totalTicketsSold = useMemo(() => {
    return activePurchases.reduce((acc, p) => acc + p.quantity, 0);
  }, [activePurchases]);

  const selectedEvent = useMemo(() => {
    return events.find((e) => e.id === selectedEventId);
  }, [events, selectedEventId]);

  const eventCapacity = selectedEvent?.ticketCapacity || 0;
  const showWarning = eventCapacity > 0 && totalTicketsSold >= eventCapacity * 0.9;

  const refundMutation = useMutation({
    mutationFn: (purchaseId: string) => ticketService.adminRefundTicket(purchaseId),
    onSuccess: () => {
      dialog.showToast('Refund processed successfully.');
      queryClient.invalidateQueries({ queryKey: queryKeys.ticketing.all });
    },
    onError: async () => {
      await dialog.showMessage({
        title: 'Refund Failed',
        message: 'Could not process the refund. Please verify the Stripe Dashboard.',
        variant: 'danger',
      });
    },
  });

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

  const handleRefund = async (purchaseId: string) => {
    const confirmed = await dialog.confirm({
      title: 'Refund Ticket',
      message: 'This will void the ticket on Will Call and issue a refund on Stripe.',
      confirmLabel: 'Refund',
      variant: 'danger',
    });
    if (!confirmed) return;
    dialog.showToast('Processing refund...');
    await refundMutation.mutateAsync(purchaseId);
  };

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

  const handleOpenResendConfirmation = (purchase: TicketPurchase) => {
    setResendTarget({
      purchaseId: purchase.id,
      buyerEmail: purchase.buyerEmail || '',
      buyerName: purchase.buyerName,
    });
  };

  const sortPurchases = useCallback(
    (list: TicketPurchase[]) => {
      return [...list].sort((a, b) => {
        if (sortBy === 'lastName') {
          const lastA = getLastName(a.buyerName).toLowerCase();
          const lastB = getLastName(b.buyerName).toLowerCase();
          if (lastA !== lastB) return lastA.localeCompare(lastB);
          const firstA = getFirstName(a.buyerName).toLowerCase();
          const firstB = getFirstName(b.buyerName).toLowerCase();
          return firstA.localeCompare(firstB);
        }
        if (sortBy === 'firstName') {
          const firstA = getFirstName(a.buyerName).toLowerCase();
          const firstB = getFirstName(b.buyerName).toLowerCase();
          if (firstA !== firstB) return firstA.localeCompare(firstB);
          const lastA = getLastName(a.buyerName).toLowerCase();
          const lastB = getLastName(b.buyerName).toLowerCase();
          return lastA.localeCompare(lastB);
        }
        if (sortBy === 'saleDate') {
          return new Date(b.created).getTime() - new Date(a.created).getTime();
        }
        return 0;
      });
    },
    [sortBy]
  );

  const handleExportCSV = () => {
    const sortedActive = sortPurchases(activePurchases);
    if (sortedActive.length === 0) {
      dialog.showToast('No active purchases to export.');
      return;
    }
    const headers = [
      'ID',
      'Buyer Name',
      'Buyer Email',
      'Quantity',
      'Paid',
      'Status',
      'Created',
      'Type',
    ];
    const rows = sortedActive.map((p) => [
      p.id,
      p.buyerName,
      p.buyerEmail,
      p.quantity,
      (p.amountPaidCents / 100).toFixed(2),
      p.status,
      p.created,
      p.bundle ? `Season Pass (${p.expand?.bundle?.title || 'Pass'})` : 'Concert Ticket',
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        headers.join(','),
        ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')),
      ].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `will_call_${selectedEventId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredPurchases = useMemo(() => {
    const matched = purchases.filter(
      (p) =>
        p.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.buyerEmail.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return sortPurchases(matched);
  }, [purchases, searchQuery, sortPurchases]);

  const willCallColumns: ColumnDef<TicketPurchase>[] = [
    {
      id: 'buyerName',
      header: 'Buyer Name',
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span>{row.original.buyerName}</span>
          {row.original.expand?.bundle && (
            <span className="inline-flex w-fit items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-emerald-700 uppercase">
              Season Ticket: {row.original.expand.bundle.title}
            </span>
          )}
        </div>
      ),
      enableSorting: false,
      meta: { cardSection: 1, cardSide: 'left' },
    },
    {
      id: 'email',
      header: 'Email',
      accessorFn: (p) => p.buyerEmail,
      enableSorting: false,
      meta: { cardSection: 1, cardSide: 'left' },
    },
    {
      id: 'saleDate',
      header: 'Sale Date',
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
      id: 'qty',
      header: 'Qty',
      accessorFn: (p) => p.quantity,
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
              onClick={() => {
                if (row.original.bundle) {
                  handleRefundBundle(row.original.stripePaymentIntentId);
                } else {
                  handleRefund(row.original.id);
                }
              }}
            >
              Refund
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
            <h3 className="text-lg font-bold text-slate-800">Performance Summary</h3>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Choose a performance to view ticket sales, revenue, and will call activity. To enable
              ticketing for an event, go to the{' '}
              <Link
                to="/admin/events"
                className="text-emerald-700 underline hover:text-emerald-800"
              >
                Event Management
              </Link>{' '}
              page, edit the performance, and check the "Enable Online Ticket Sales" option on the
              Tickets tab.
            </p>
          </div>
          {selectedEventId && (
            <div className="shrink-0">
              <Button
                variant="secondary"
                size="small"
                onClick={handleExportCSV}
                disabled={activePurchases.length === 0}
                title="Export Will Call CSV"
                icon={'⬇️'}
              >
                <span className="hidden md:inline">Export Will Call CSV</span>
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6 p-6">
          {/* Performance selection & options grid deck */}
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <FormField label="Select Performance">
                <Select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                >
                  {visibleEvents.map((ev) => {
                    const cutoffTime = now - 3 * 60 * 60 * 1000;
                    const isPast = new Date(ev.date).getTime() < cutoffTime;
                    const isInactive = !ev.isTicketingEnabled;
                    const suffix = isInactive ? ' (Inactive)' : isPast ? ' (Past)' : '';
                    return (
                      <option key={ev.id} value={ev.id}>
                        {ev.title} (
                        {formatInTimezone(ev.date, timezone, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                        ){suffix}
                      </option>
                    );
                  })}
                  {visibleEvents.length === 0 && (
                    <option value="">No ticketing-enabled events</option>
                  )}
                </Select>
              </FormField>
            </div>

            <div className="flex items-end pb-2 md:col-span-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={showPastAndInactive}
                  onChange={(e) => setShowPastAndInactive(e.target.checked)}
                  className="text-primary focus:ring-primary/25 rounded border-slate-300"
                />
                <span className="font-medium text-slate-700">
                  Include past and inactive performances
                </span>
              </label>
            </div>
          </div>

          {selectedEvent && (
            /* Performance Stats Analytics Dashboard */
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {/* Tickets Sold Card */}
              <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <div className="absolute top-0 left-0 h-1.5 w-full bg-slate-400 transition-colors group-hover:bg-slate-500" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                      Tickets Sold
                    </p>
                    <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                      {totalTicketsSold} {eventCapacity > 0 ? `/ ${eventCapacity}` : ''}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 text-slate-500 transition-colors group-hover:bg-slate-100">
                    <span aria-hidden="true">📅</span>
                  </div>
                </div>
              </div>

              {/* Ticket Sales Card */}
              <div className="group relative overflow-hidden rounded-2xl border border-pink-100 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <div className="absolute top-0 left-0 h-1.5 w-full bg-pink-500 transition-colors group-hover:bg-pink-600" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold tracking-wider text-pink-500 uppercase">
                      Ticket Sales
                    </p>
                    <p className="mt-2 text-2xl font-black tracking-tight text-pink-600">
                      $
                      {(
                        activePurchases.reduce((acc, p) => acc + p.unitPriceCents * p.quantity, 0) /
                        100
                      ).toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-pink-50 p-3 text-pink-500 transition-colors group-hover:bg-pink-100/80">
                    <span aria-hidden="true">💵</span>
                  </div>
                </div>
              </div>

              {/* Fees Collected Card */}
              <div className="group relative overflow-hidden rounded-2xl border border-amber-100 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <div className="absolute top-0 left-0 h-1.5 w-full bg-amber-500 transition-colors group-hover:bg-amber-600" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold tracking-wider text-amber-600 uppercase">
                      Fees Collected
                    </p>
                    <p className="mt-2 text-2xl font-black tracking-tight text-amber-700">
                      ${(activePurchases.reduce((acc, p) => acc + p.feeCents, 0) / 100).toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-3 text-amber-600 transition-colors group-hover:bg-amber-100/80">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Total Revenue Card */}
              <div className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <div className="absolute top-0 left-0 h-1.5 w-full bg-emerald-500 transition-colors group-hover:bg-emerald-600" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold tracking-wider text-emerald-700 uppercase">
                      Total Revenue
                    </p>
                    <p className="mt-2 text-2xl font-black tracking-tight text-emerald-700">
                      $
                      {(
                        activePurchases.reduce((acc, p) => acc + p.amountPaidCents, 0) / 100
                      ).toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700 transition-colors group-hover:bg-emerald-100/80">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showWarning && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              ⚠️ Warning: Sold tickets ({totalTicketsSold}) have reached or exceeded 90% of capacity
              ({eventCapacity}).
            </div>
          )}
        </div>
      </AppCard>

      <AppCard noPadding>
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-bold text-slate-800">Will Call Checklist</h3>
          <p className="mt-1 text-sm text-slate-500">
            Search ticket buyers, confirm payment status, and process refunds.
          </p>
        </div>

        <div className="flex flex-col gap-6 p-6">
          {/* Checklist Search and Sort grid deck */}
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <FormField label="Search">
                <Input
                  type="text"
                  placeholder="Search buyer name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                >
                  <span slot="prefix" className="flex items-center text-slate-400">
                    <svg
                      className="size-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </span>
                </Input>
              </FormField>
            </div>
            <div className="md:col-span-1">
              <FormField label="Sort By">
                <Select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as 'lastName' | 'firstName' | 'saleDate')
                  }
                >
                  <option value="lastName">Last Name</option>
                  <option value="firstName">First Name</option>
                  <option value="saleDate">Sale Date</option>
                </Select>
              </FormField>
            </div>
            {searchQuery && (
              <div className="flex items-end gap-2 md:col-span-1">
                <Button
                  variant="outline"
                  onClick={() => setSearchQuery('')}
                  className="flex h-10 items-center justify-center"
                  title="Reset search"
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                </Button>
              </div>
            )}
          </div>

          {/* Will Call - Desktop Table View */}
          <DataTable
            columns={willCallColumns}
            data={filteredPurchases}
            isLoading={loading}
            emptyState={{
              title: 'No Purchases Found',
              description: searchQuery
                ? 'No purchases match your search query.'
                : 'No purchase records are available for this event yet.',
              icon: '🎟️',
              action: searchQuery ? (
                <Button variant="secondary" size="small" onClick={() => setSearchQuery('')}>
                  Reset Search
                </Button>
              ) : undefined,
            }}
            pageSize={20}
            getRowClassName={(p) => (p.status === 'refunded' ? 'opacity-60' : '')}
            renderMobileCard={(p) => (
              <div className={`flex flex-col gap-3 ${p.status === 'refunded' ? 'opacity-60' : ''}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">
                    {formatInTimezone(p.created, timezone, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                  <Badge tone={p.status === 'paid' ? 'success' : 'danger'}>{p.status}</Badge>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-slate-800">{p.buyerName}</span>
                    {p.expand?.bundle && (
                      <span className="inline-flex w-fit items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-emerald-700 uppercase">
                        Season Ticket: {p.expand.bundle.title}
                      </span>
                    )}
                    <span className="text-xs font-medium break-all text-slate-500">
                      {p.buyerEmail}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className="text-sm font-bold text-slate-900">
                      {p.quantity} Ticket{p.quantity !== 1 ? 's' : ''}
                    </span>
                    <span className="text-base font-extrabold text-emerald-700">
                      ${(p.amountPaidCents / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
                {p.status === 'paid' && (
                  <div className="mt-1 flex justify-end gap-2 border-t border-slate-50 pt-1.5">
                    <Button
                      variant="secondary"
                      size="small"
                      className="flex-1"
                      onClick={() => handleOpenResendConfirmation(p)}
                    >
                      Resend
                    </Button>
                    <Button
                      variant="danger"
                      size="small"
                      className="flex-1"
                      onClick={() => {
                        if (p.bundle) {
                          handleRefundBundle(p.stripePaymentIntentId);
                        } else {
                          handleRefund(p.id);
                        }
                      }}
                    >
                      Refund
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
