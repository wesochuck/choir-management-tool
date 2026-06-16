import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ticketService, type TicketPurchase, type TicketBundle } from '../../services/ticketService';
import { pb } from '../../lib/pocketbase';
import type { Event } from '../../services/eventService';
import { queryKeys } from '../../lib/queryKeys';
import { AppCard } from '../../components/common/AppCard';
import { useDialog } from '../../contexts/DialogContext';
import { fetchChoirTimezone, formatInTimezone } from '../../lib/timezone';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { getFirstName, getLastName } from '../../lib/stringUtils';
import { Modal, Button, FormField, Badge, EmptyState, Select, Input } from '../../components/ui';
import SlProgressBar from '@shoelace-style/shoelace/dist/react/progress-bar/index.js';
import { QRCodeShareCard } from '../../components/admin/QRCodeShareCard';
import { settingsService } from '../../services/settingsService';

interface TicketingData {
  allEvents: Event[];
  purchases: TicketPurchase[];
  allPurchases: TicketPurchase[];
  bundles: TicketBundle[];
  tz: string;
}

export default function TicketingView() {
  useDocumentTitle('Ticketing');
  const queryClient = useQueryClient();
  const dialog = useDialog();
  const [now] = useState(() => Date.now());
  const [activeTab, setActiveTab] = useState<'willcall' | 'bundles' | 'orders' | 'share'>('willcall');

  const [showPastAndInactive, setShowPastAndInactive] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'lastName' | 'firstName' | 'saleDate'>('lastName');

  const ticketingQuery = useQuery({
    queryKey: queryKeys.ticketing.main(selectedEventId),
    queryFn: async (): Promise<TicketingData> => {
      const [eventsEnabled, purchasesRes, allPurchasesRes, bundlesRes, tz] = await Promise.all([
        pb.collection('events').getFullList<Event>({
          filter: 'isTicketingEnabled = true',
          sort: '-date'
        }),
        selectedEventId ? ticketService.getPurchasesForEvent(selectedEventId) : Promise.resolve([]),
        ticketService.getAllPurchases(),
        pb.collection('ticketBundles').getFullList<TicketBundle>({
          sort: '-created',
          expand: 'events'
        }),
        fetchChoirTimezone().catch(() => 'America/New_York')
      ]);

      const enabledIds = new Set(eventsEnabled.map(e => e.id));
      const eventIdsWithPurchases = Array.from(new Set(allPurchasesRes.map(p => p.event)));
      const missingEventIds = eventIdsWithPurchases.filter(id => !enabledIds.has(id));
      let allEvents = [...eventsEnabled];
      if (missingEventIds.length > 0) {
        const chunks: string[][] = [];
        for (let i = 0; i < missingEventIds.length; i += 50) {
          chunks.push(missingEventIds.slice(i, i + 50));
        }
        const missingEventsPromises = chunks.map(chunk => {
          const filterStr = chunk.map((_, idx) => `id = {:id_${idx}}`).join(' || ');
          const placeholders = chunk.reduce((acc, id, idx) => {
            acc[`id_${idx}`] = id;
            return acc;
          }, {} as Record<string, string>);
          return pb.collection('events').getFullList<Event>({
            filter: pb.filter(filterStr, placeholders)
          });
        });
        const missingEventsResults = await Promise.all(missingEventsPromises);
        const missingEvents = missingEventsResults.flat();
        allEvents = [...allEvents, ...missingEvents];
      }
      allEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return { allEvents, purchases: purchasesRes, allPurchases: allPurchasesRes, bundles: bundlesRes, tz };
    },
  });

  const events = ticketingQuery.data?.allEvents ?? [];
  const purchases = ticketingQuery.data?.purchases ?? [];
  const allPurchases = ticketingQuery.data?.allPurchases ?? [];
  const bundles = ticketingQuery.data?.bundles ?? [];
  const timezone = ticketingQuery.data?.tz ?? 'America/New_York';
  const loading = ticketingQuery.isLoading;

  const logoQuery = useQuery({
    queryKey: queryKeys.ticketing.logoUrl,
    queryFn: () => settingsService.getLogoUrl().then(url => url ?? null).catch(() => null),
  });
  const logoUrl = logoQuery.data ?? null;

  const visibleEvents = useMemo(() => {
    const cutoffTime = now - 3 * 60 * 60 * 1000;
    return events.filter(ev => {
      if (showPastAndInactive) return true;
      const isUpcoming = new Date(ev.date).getTime() >= cutoffTime;
      const isActive = ev.isTicketingEnabled;
      return isUpcoming && isActive;
    });
  }, [events, showPastAndInactive, now]);

  const upcomingTicketingEvents = useMemo(() => {
    const cutoffTime = now - 3 * 60 * 60 * 1000;
    return events.filter(ev => {
      const isUpcoming = new Date(ev.date).getTime() >= cutoffTime;
      return isUpcoming && ev.isTicketingEnabled;
    });
  }, [events, now]);

  const activeBundles = useMemo(() => {
    return bundles.filter(b => b.isActive);
  }, [bundles]);

  // Auto-select first event
  useEffect(() => {
    if (visibleEvents.length > 0) {
      const alreadySelected = visibleEvents.some(e => e.id === selectedEventId);
      if (!alreadySelected) {
        setSelectedEventId(visibleEvents[0].id);
      }
    } else {
      setSelectedEventId('');
    }
  }, [visibleEvents, selectedEventId]);

  const activePurchases = purchases.filter(p => p.status === 'paid');
  const totalTicketsSold = activePurchases.reduce((acc, p) => acc + p.quantity, 0);

  const selectedEvent = events.find(e => e.id === selectedEventId);
  const eventCapacity = selectedEvent?.ticketCapacity || 0;
  const showWarning = eventCapacity > 0 && totalTicketsSold >= (eventCapacity * 0.9);

  const invalidateTicketing = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.ticketing.all });

  const refundMutation = useMutation({
    mutationFn: (purchaseId: string) => ticketService.adminRefundTicket(purchaseId),
    onSuccess: () => {
      dialog.showToast('Refund processed successfully.');
      invalidateTicketing();
    },
    onError: async () => {
      await dialog.showMessage({
        title: 'Refund Failed',
        message: 'Could not process the refund. Please verify the Stripe Dashboard.',
        variant: 'danger'
      });
    },
  });

  const refundBundleMutation = useMutation({
    mutationFn: (paymentIntentId: string) => ticketService.adminRefundBundle(paymentIntentId),
    onSuccess: () => {
      dialog.showToast('Bundle refunded successfully.');
      invalidateTicketing();
    },
    onError: async () => {
      await dialog.showMessage({
        title: 'Refund Failed',
        message: 'Could not process the bundle refund. Please verify the Stripe Dashboard.',
        variant: 'danger'
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

  const sortPurchases = (list: TicketPurchase[]) => {
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
  };

  const handleExportCSV = () => {
    const sortedActive = sortPurchases(activePurchases);
    if (sortedActive.length === 0) {
      dialog.showToast('No active purchases to export.');
      return;
    }
    const headers = ["ID", "Buyer Name", "Buyer Email", "Quantity", "Paid", "Status", "Created", "Type"];
    const rows = sortedActive.map(p => [
      p.id,
      p.buyerName,
      p.buyerEmail,
      p.quantity,
      (p.amountPaidCents / 100).toFixed(2),
      p.status,
      p.created,
      p.bundle ? `Season Pass (${p.expand?.bundle?.title || 'Pass'})` : 'Concert Ticket'
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `will_call_${selectedEventId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredPurchases = sortPurchases(
    purchases.filter(p =>
      p.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.buyerEmail.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // Bundle sold quantity helper
  const getBundleSoldQty = (bundleId: string, bundleEvents: string[]) => {
    if (!bundleEvents || bundleEvents.length === 0) return 0;
    const firstEventId = bundleEvents[0];
    const matched = allPurchases.filter(
      p => p.bundle === bundleId && p.event === firstEventId && p.status === 'paid'
    );
    return matched.reduce((acc, curr) => acc + curr.quantity, 0);
  };

  // Grouped bundle orders
  const bundleOrders = useMemo(() => {
    const map = new Map<string, {
      stripeSessionId: string;
      stripePaymentIntentId: string;
      buyerName: string;
      buyerEmail: string;
      quantity: number;
      amountPaidCents: number;
      created: string;
      status: string;
      bundleTitle: string;
      bundleId: string;
    }>();

    allPurchases.forEach(p => {
      if (p.bundle) {
        const key = p.stripeSessionId;
        if (!map.has(key)) {
          map.set(key, {
            stripeSessionId: p.stripeSessionId,
            stripePaymentIntentId: p.stripePaymentIntentId,
            buyerName: p.buyerName,
            buyerEmail: p.buyerEmail,
            quantity: p.quantity,
            amountPaidCents: p.amountPaidCents,
            created: p.created,
            status: p.status,
            bundleTitle: p.expand?.bundle?.title || 'Unknown Bundle',
            bundleId: p.bundle
          });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
  }, [allPurchases]);

  // Bundle CRUD state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<TicketBundle | null>(null);
  const [bundleTitle, setBundleTitle] = useState('');
  const [price, setPrice] = useState(0);
  const [capacity, setCapacity] = useState(0);
  const [saleEndDate, setSaleEndDate] = useState('');
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const selectedEventIdsSet = useMemo(() => new Set(selectedEventIds), [selectedEventIds]);
  const [bundleIsActive, setBundleIsActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publicDetails, setPublicDetails] = useState('');

  const saveBundleMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      data.id
        ? pb.collection('ticketBundles').update(data.id as string, data)
        : pb.collection('ticketBundles').create(data),
    onSuccess: () => {
      invalidateTicketing();
    },
  });

  const deleteBundleMutation = useMutation({
    mutationFn: (bundleId: string) => pb.collection('ticketBundles').delete(bundleId),
    onSuccess: invalidateTicketing,
  });

  // Bundle refund handler
  const handleRefundBundle = async (paymentIntentId: string) => {
    const confirmed = await dialog.confirm({
      title: 'Refund Bundle Purchase',
      message: 'Are you sure you want to refund this bundle purchase? This will issue a full Stripe refund and void all associated individual tickets on the Will Call lists. This action is permanent and cannot be undone.',
      confirmLabel: 'Refund Bundle',
      variant: 'danger',
    });
    if (!confirmed) return;
    dialog.showToast('Processing bundle refund...');
    await refundBundleMutation.mutateAsync(paymentIntentId);
  };

  // Bundle CRUD handlers
  const handleOpenCreateModal = () => {
    setEditingBundle(null);
    setBundleTitle('');
    setPrice(0);
    setCapacity(0);
    setSaleEndDate('');
    setSelectedEventIds([]);
    setBundleIsActive(false);
    setPublicDetails('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (bundle: TicketBundle) => {
    setEditingBundle(bundle);
    setBundleTitle(bundle.title);
    setPrice(bundle.priceCents / 100);
    setCapacity(bundle.capacity);
    
    if (bundle.saleEndDate) {
      const dateObj = new Date(bundle.saleEndDate);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');
      setSaleEndDate(`${year}-${month}-${day}T${hours}:${minutes}`);
    } else {
      setSaleEndDate('');
    }

    setSelectedEventIds(bundle.events || []);
    setBundleIsActive(bundle.isActive);
    setPublicDetails(bundle.publicDetails || '');
    setIsModalOpen(true);
  };

  const handleSaveBundle = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    if (!bundleTitle.trim() || price <= 0 || capacity <= 0 || selectedEventIds.length === 0 || !saleEndDate) {
      dialog.showToast('Please fill out all required fields and select at least one event.');
      return;
    }

    setSaving(true);
    try {
      const data: Record<string, unknown> = {
        title: bundleTitle.trim(),
        priceCents: Math.round(price * 100),
        capacity: Number(capacity),
        events: selectedEventIds,
        saleEndDate: new Date(saleEndDate).toISOString(),
        isActive: bundleIsActive,
        publicDetails: publicDetails.trim()
      };

      if (editingBundle) {
        data.id = editingBundle.id;
        dialog.showToast('Bundle updated successfully.');
      } else {
        dialog.showToast('Bundle created successfully.');
      }
      await saveBundleMutation.mutateAsync(data);
      setIsModalOpen(false);
    } catch (err: unknown) {
      console.error(err);
      dialog.showToast('Failed to save bundle.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBundle = async (bundleId: string, bundleEvents: string[]) => {
    const soldQty = getBundleSoldQty(bundleId, bundleEvents);
    if (soldQty > 0) {
      await dialog.showMessage({
        title: 'Delete Prevented',
        message: 'This bundle has active purchases and cannot be deleted.',
        variant: 'danger'
      });
      return;
    }

    const confirmed = await dialog.confirm({
      title: 'Delete Bundle',
      message: 'Are you sure you want to delete this season ticket bundle? This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger'
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

  // Auto-populate saleEndDate to 11:59 PM of the chronologically first event in creation mode
  useEffect(() => {
    if (isModalOpen && !editingBundle && selectedEventIds.length > 0) {
      const selectedConcerts = events.filter(e => selectedEventIdsSet.has(e.id));
      if (selectedConcerts.length > 0) {
        selectedConcerts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const firstEventDate = new Date(selectedConcerts[0].date);
        const year = firstEventDate.getFullYear();
        const month = String(firstEventDate.getMonth() + 1).padStart(2, '0');
        const day = String(firstEventDate.getDate()).padStart(2, '0');
        setSaleEndDate(`${year}-${month}-${day}T23:59`);
      }
    }
  }, [selectedEventIds, selectedEventIdsSet, isModalOpen, editingBundle, events]);

  const hasPurchases = editingBundle ? getBundleSoldQty(editingBundle.id, editingBundle.events) > 0 : false;

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Header Area */}
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
          Ticketing Dashboard
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
          Manage ticket sales, configure season bundles, and view check-in checklists.
        </p>
      </div>

      {/* Tabs / Actions Navigation Bar */}
      <div className="flex w-full flex-row items-center justify-between border-b border-slate-200 pb-px">
        <div className="flex gap-3 md:gap-6">
          <button
            type="button"
            className={`flex min-h-[44px] cursor-pointer items-center justify-center border-b-2 px-1 py-2.5 text-sm font-semibold transition-all duration-200 ${
              activeTab === 'willcall'
                ? 'border-primary font-bold text-primary'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900'
            }`}
            onClick={() => setActiveTab('willcall')}
          >
            Concert Will Call
          </button>
          <button
            type="button"
            className={`flex min-h-[44px] cursor-pointer items-center justify-center border-b-2 px-1 py-2.5 text-sm font-semibold transition-all duration-200 ${
              activeTab === 'bundles'
                ? 'border-primary font-bold text-primary'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900'
            }`}
            onClick={() => setActiveTab('bundles')}
          >
            Season Bundles
          </button>
          <button
            type="button"
            className={`flex min-h-[44px] cursor-pointer items-center justify-center border-b-2 px-1 py-2.5 text-sm font-semibold transition-all duration-200 ${
              activeTab === 'orders'
                ? 'border-primary font-bold text-primary'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900'
            }`}
            onClick={() => setActiveTab('orders')}
          >
            Bundle Orders
          </button>
          <button
            type="button"
            className={`flex min-h-[44px] cursor-pointer items-center justify-center border-b-2 px-1 py-2.5 text-sm font-semibold transition-all duration-200 ${
              activeTab === 'share'
                ? 'border-primary font-bold text-primary'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900'
            }`}
            onClick={() => setActiveTab('share')}
          >
            Share & QR Codes
          </button>
        </div>

        <div className="flex items-center gap-2 pb-1.5">
          <Button
            as={Link}
            to="/admin/tickets/scan"
            variant="primary"
            size="small"
            className="no-underline"
          >
            Scan Tickets
          </Button>
          {activeTab === 'bundles' && (
            <Button
              variant="primary"
              className="animate-pulse-once px-3 font-semibold md:px-6"
              onClick={handleOpenCreateModal}
              title="Create New Bundle"
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              }
            >
              <span className="hidden md:inline">Create New Bundle</span>
            </Button>
          )}
          {activeTab === 'willcall' && selectedEventId && (
            <Button
              variant="secondary"
              className="px-3 font-semibold md:px-6"
              onClick={handleExportCSV}
              disabled={activePurchases.length === 0}
              title="Export Will Call CSV"
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              }
            >
              <span className="hidden md:inline">Export Will Call CSV</span>
            </Button>
          )}
        </div>
      </div>

      {activeTab === 'willcall' && (
        <>
          <AppCard noPadding>
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-800">Performance Summary</h3>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Choose a performance to view ticket sales, revenue, and will call activity. To enable ticketing for an event, go to the{' '}
                <Link to="/admin/events" className="text-emerald-700 underline hover:text-emerald-800">
                  Event Management
                </Link>{' '}
                page, edit the performance, and check the "Enable Online Ticket Sales" option on the Tickets tab.
              </p>
            </div>

            <div className="flex flex-col gap-6 p-6">
              {/* Performance selection & options grid deck */}
              <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4 md:grid-cols-4">
                <div className="md:col-span-2">
                  <FormField label="Select Performance">
                    <Select
                      value={selectedEventId}
                      onChange={e => setSelectedEventId(e.target.value)}
                    >
                      {visibleEvents.map(ev => {
                        const cutoffTime = now - 3 * 60 * 60 * 1000;
                        const isPast = new Date(ev.date).getTime() < cutoffTime;
                        const isInactive = !ev.isTicketingEnabled;
                        const suffix = isInactive ? ' (Inactive)' : isPast ? ' (Past)' : '';
                        return (
                          <option key={ev.id} value={ev.id}>
                            {ev.title} ({formatInTimezone(ev.date, timezone, { month: 'short', day: 'numeric', year: 'numeric' })}){suffix}
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
                      onChange={e => setShowPastAndInactive(e.target.checked)}
                      className="rounded border-slate-300 text-primary focus:ring-primary/25"
                    />
                    <span className="font-medium text-slate-700">Include past and inactive performances</span>
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
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
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
                          ${(activePurchases.reduce((acc, p) => acc + (p.unitPriceCents * p.quantity), 0) / 100).toFixed(2)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-pink-50 p-3 text-pink-500 transition-colors group-hover:bg-pink-100/80">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="1" x2="12" y2="23" />
                          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
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
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                          ${(activePurchases.reduce((acc, p) => acc + p.amountPaidCents, 0) / 100).toFixed(2)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700 transition-colors group-hover:bg-emerald-100/80">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {showWarning && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                  ⚠️ Warning: Sold tickets ({totalTicketsSold}) have reached or exceeded 90% of capacity ({eventCapacity}).
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
                      onChange={e => setSearchQuery(e.target.value)}
                    >
                      <span slot="prefix" className="flex items-center text-slate-400">
                        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                      onChange={e => setSortBy(e.target.value as 'lastName' | 'firstName' | 'saleDate')}
                    >
                      <option value="lastName">Last Name</option>
                      <option value="firstName">First Name</option>
                      <option value="saleDate">Sale Date</option>
                    </Select>
                  </FormField>
                </div>
                {(searchQuery) && (
                  <div className="flex items-end gap-2 md:col-span-1">
                    <Button 
                      variant="outline" 
                      onClick={() => setSearchQuery('')}
                      className="flex h-10 items-center justify-center px-3 font-semibold"
                      title="Reset search"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                      </svg>
                    </Button>
                  </div>
                )}
              </div>

              {/* Will Call - Desktop Table View */}
              <div className="hidden overflow-x-auto rounded-xl border border-slate-100 shadow-sm md:block">
                <table className="min-w-full divide-y divide-slate-100 text-left">
                  <thead className="bg-slate-50/75">
                    <tr>
                      <th className="px-6 py-3.5 text-left text-xs font-bold tracking-wider text-slate-500 uppercase">Buyer Name</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold tracking-wider text-slate-500 uppercase">Email</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold tracking-wider text-slate-500 uppercase">Sale Date</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold tracking-wider text-slate-500 uppercase">Qty</th>
                      <th className="px-6 py-3.5 text-right text-xs font-bold tracking-wider text-slate-500 uppercase">Amount Paid</th>
                      <th className="px-6 py-3.5 text-center text-xs font-bold tracking-wider text-slate-500 uppercase">Status</th>
                      <th className="px-6 py-3.5 text-right text-xs font-bold tracking-wider text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-sm font-medium text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <span className="size-6 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
                            Loading purchases...
                          </div>
                        </td>
                      </tr>
                    ) : filteredPurchases.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <EmptyState
                            title="No Purchases Found"
                            description={
                              searchQuery
                                ? "No purchases match your search query."
                                : "No purchase records are available for this event yet."
                            }
                            icon="🎟️"
                            action={
                              searchQuery ? (
                                <Button variant="secondary" size="small" onClick={() => setSearchQuery('')}>
                                  Reset Search
                                </Button>
                              ) : undefined
                            }
                          />
                        </td>
                      </tr>
                    ) : (
                      filteredPurchases.map(p => {
                        const isRefunded = p.status === 'refunded';
                        return (
                          <tr
                            key={p.id}
                            className={`transition-colors hover:bg-slate-50/40 ${isRefunded ? 'text-text-muted opacity-60' : ''}`}
                          >
                            <td className="px-6 py-4 text-sm font-semibold whitespace-nowrap text-slate-800">
                              <div className="flex flex-col gap-0.5">
                                <span>{p.buyerName}</span>
                                {p.expand?.bundle && (
                                  <span className="inline-flex w-fit items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-emerald-700 uppercase">
                                    Season Ticket: {p.expand.bundle.title}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-slate-500">
                              {p.buyerEmail}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-slate-500">
                              {formatInTimezone(p.created, timezone, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-slate-500">
                              {p.quantity}
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-extrabold text-slate-950">
                              ${(p.amountPaidCents / 100).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-center text-sm">
                              <Badge tone={p.status === 'paid' ? 'success' : 'danger'}>
                                {p.status}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-right text-sm whitespace-nowrap">
                              {p.status === 'paid' && (
                                <Button
                                  variant="danger"
                                  size="small"
                                  className="font-semibold"
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
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Will Call - Mobile Card List View */}
              <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm md:hidden">
                <div className="divide-y divide-slate-100">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-sm font-medium text-slate-400">
                      <span className="size-6 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
                      Loading purchases...
                    </div>
                  ) : filteredPurchases.length === 0 ? (
                    <div className="p-6 text-center">
                      <EmptyState
                        title="No Purchases Found"
                        description={
                          searchQuery
                            ? "No purchases match your search query."
                            : "No purchase records are available for this event yet."
                        }
                        icon="🎟️"
                        action={
                          searchQuery ? (
                            <Button variant="secondary" size="small" onClick={() => setSearchQuery('')}>
                              Reset Search
                            </Button>
                          ) : undefined
                        }
                      />
                    </div>
                  ) : (
                    filteredPurchases.map(p => {
                      const isRefunded = p.status === 'refunded';
                      return (
                        <div 
                          key={p.id} 
                          className={`flex flex-col gap-3 p-4 transition-colors hover:bg-slate-50/40 ${isRefunded ? 'opacity-60' : ''}`}
                        >
                          {/* Row 1: Sale Date & Status Badge */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-400">
                              {formatInTimezone(p.created, timezone, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            </span>
                            <Badge tone={p.status === 'paid' ? 'success' : 'danger'}>
                              {p.status}
                            </Badge>
                          </div>

                          {/* Row 2: Buyer Info & Tickets Qty/Paid */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-sm font-bold text-slate-800">
                                {p.buyerName}
                              </span>
                              {p.expand?.bundle && (
                                <span className="inline-flex w-fit items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-emerald-700 uppercase">
                                  Season Ticket: {p.expand.bundle.title}
                                </span>
                              )}
                              <span className="text-xs font-medium break-all text-slate-500">{p.buyerEmail}</span>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-0.5">
                              <span className="text-sm font-bold text-slate-900">{p.quantity} Ticket{p.quantity !== 1 ? 's' : ''}</span>
                              <span className="text-base font-extrabold text-emerald-700">
                                ${(p.amountPaidCents / 100).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Row 3: Refund Actions */}
                          {p.status === 'paid' && (
                            <div className="mt-1 flex justify-end border-t border-slate-50 pt-1.5">
                              <Button
                                variant="danger"
                                size="small"
                                className="w-full py-1.5 text-xs font-semibold"
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
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </AppCard>
        </>
      )}

      {activeTab === 'bundles' && (
        <AppCard noPadding>
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="text-lg font-bold text-slate-800">Season Bundles Configuration</h3>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Create and manage season ticket packages containing multiple concerts at a discount.
            </p>
          </div>
          
          <div className="p-6">
            {/* Season Bundles - Desktop Table View */}
            <div className="hidden overflow-x-auto rounded-xl border border-slate-100 shadow-sm md:block">
              {loading ? (
                <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center text-sm font-medium text-slate-400">
                  <span className="size-6 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
                  Loading bundles...
                </div>
              ) : bundles.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <EmptyState
                    title="No Season Bundles Configured"
                    description="Create recognition tiers or pass bundles to offer discount packages to your ticket buyers."
                    icon="🎟️"
                    action={
                      <Button variant="primary" size="small" className="font-semibold" onClick={handleOpenCreateModal}>
                        + Create New Bundle
                      </Button>
                    }
                  />
                </div>
              ) : (
                <table className="min-w-full divide-y divide-slate-100 text-left">
                  <thead className="bg-slate-50/75">
                    <tr>
                      <th className="px-6 py-3.5 text-left text-xs font-bold tracking-wider text-slate-500 uppercase">Bundle Title</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold tracking-wider text-slate-500 uppercase">Price</th>
                      <th className="px-6 py-3.5 text-center text-xs font-bold tracking-wider text-slate-500 uppercase">Active</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold tracking-wider text-slate-500 uppercase">Capacity Sold</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold tracking-wider text-slate-500 uppercase">Sale End Date</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold tracking-wider text-slate-500 uppercase">Included Events</th>
                      <th className="px-6 py-3.5 text-right text-xs font-bold tracking-wider text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {bundles.map(b => {
                      const sold = getBundleSoldQty(b.id, b.events);
                      return (
                        <tr key={b.id} className="transition-colors hover:bg-slate-50/40">
                          <td className="px-6 py-4 text-sm font-semibold text-slate-800">{b.title}</td>
                          <td className="px-6 py-4 text-sm font-extrabold whitespace-nowrap text-slate-900">${(b.priceCents / 100).toFixed(2)}</td>
                          <td className="px-6 py-4 text-center text-sm">
                            <Badge tone={b.isActive ? 'success' : 'neutral'}>
                              {b.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <span className="font-medium text-slate-800">{sold} / {b.capacity} sold</span>
                              <SlProgressBar value={Math.min(100, (sold / b.capacity) * 100)} className="h-1.5 w-[100px] [&::part(base)]:rounded" />
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-slate-500">
                            {formatInTimezone(b.saleEndDate, timezone, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </td>
                          <td className="max-w-[240px] px-6 py-4 text-sm whitespace-normal">
                            <div className="flex flex-wrap gap-1">
                              {b.expand?.events?.map(ev => (
                                <span key={ev.id} className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide whitespace-nowrap text-slate-700 uppercase">
                                  {ev.title}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right text-sm whitespace-nowrap">
                            <div className="flex justify-end gap-2">
                              <Button
                                onClick={() => handleOpenEditModal(b)}
                                variant="secondary"
                                size="small"
                                className="font-semibold"
                              >
                                Edit
                              </Button>
                              <Button
                                onClick={() => handleDeleteBundle(b.id, b.events)}
                                variant="danger"
                                size="small"
                                className="font-semibold"
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Season Bundles - Mobile Card View */}
            <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm md:hidden">
              <div className="divide-y divide-slate-100">
                {loading ? (
                  <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-sm font-medium text-slate-400">
                    <span className="size-6 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
                    Loading bundles...
                  </div>
                ) : bundles.length === 0 ? (
                  <div className="p-6 text-center">
                    <EmptyState
                      title="No Season Bundles Configured"
                      description="Create recognition tiers or pass bundles to offer discount packages to your ticket buyers."
                      icon="🎟️"
                      action={
                        <Button variant="primary" size="small" className="font-semibold" onClick={handleOpenCreateModal}>
                          + Create New Bundle
                        </Button>
                      }
                    />
                  </div>
                ) : (
                  bundles.map(b => {
                    const sold = getBundleSoldQty(b.id, b.events);
                    return (
                      <div key={b.id} className="flex flex-col gap-3 p-4 transition-colors hover:bg-slate-50/40">
                        {/* Row 1: Active status & Sale end date */}
                        <div className="flex items-center justify-between">
                          <Badge tone={b.isActive ? 'success' : 'neutral'}>
                            {b.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <span className="text-xs font-medium text-slate-400">
                            Ends: {formatInTimezone(b.saleEndDate, timezone, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Row 2: Title & Price & Capacity */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-bold text-slate-800">{b.title}</span>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {b.expand?.events?.map(ev => (
                                <span key={ev.id} className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide whitespace-nowrap text-slate-600 uppercase">
                                  {ev.title}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-0.5">
                            <span className="text-base font-extrabold text-emerald-700">
                              ${(b.priceCents / 100).toFixed(2)}
                            </span>
                            <span className="text-xs font-medium text-slate-500">{sold} / {b.capacity} Sold</span>
                          </div>
                        </div>

                        {/* Row 3: Actions */}
                        <div className="mt-1 flex justify-end gap-2 border-t border-slate-50 pt-1.5">
                          <Button variant="secondary" size="small" onClick={() => handleOpenEditModal(b)}>
                            Edit
                          </Button>
                          <Button variant="danger" size="small" onClick={() => handleDeleteBundle(b.id, b.events)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </AppCard>
      )}

      {activeTab === 'orders' && (
        <AppCard noPadding>
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="text-lg font-bold text-slate-800">Season Pass Orders</h3>
            <p className="mt-1 text-sm font-medium text-slate-500">
              View and manage transactions of season bundle ticket pass purchases.
            </p>
          </div>
          
          <div className="p-6">
            {/* Season Pass Orders - Desktop Table View */}
            <div className="hidden overflow-x-auto rounded-xl border border-slate-100 shadow-sm md:block">
              {loading ? (
                <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center text-sm font-medium text-slate-400">
                  <span className="size-6 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
                  Loading orders...
                </div>
              ) : bundleOrders.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <EmptyState
                    title="No Orders Found"
                    description="No season pass orders have been placed yet."
                    icon="🎫"
                  />
                </div>
              ) : (
                <table className="min-w-full divide-y divide-slate-100 text-left">
                  <thead className="bg-slate-50/75">
                    <tr>
                      <th className="px-6 py-3.5 text-left text-xs font-bold tracking-wider text-slate-500 uppercase">Buyer Name</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold tracking-wider text-slate-500 uppercase">Email</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold tracking-wider text-slate-500 uppercase">Purchase Date</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold tracking-wider text-slate-500 uppercase">Season Bundle</th>
                      <th className="px-6 py-3.5 text-left text-xs font-bold tracking-wider text-slate-500 uppercase">Qty</th>
                      <th className="px-6 py-3.5 text-right text-xs font-bold tracking-wider text-slate-500 uppercase">Amount Paid</th>
                      <th className="px-6 py-3.5 text-center text-xs font-bold tracking-wider text-slate-500 uppercase">Status</th>
                      <th className="px-6 py-3.5 text-right text-xs font-bold tracking-wider text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {bundleOrders.map(order => {
                      const isRefunded = order.status === 'refunded';
                      return (
                        <tr 
                          key={order.stripeSessionId} 
                          className={`transition-colors hover:bg-slate-50/40 ${isRefunded ? 'text-text-muted opacity-60' : ''}`}
                        >
                          <td className="px-6 py-4 text-sm font-semibold text-slate-800">{order.buyerName}</td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-500">{order.buyerEmail}</td>
                          <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-slate-500">
                            {formatInTimezone(order.created, timezone, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-800">{order.bundleTitle}</td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-500">{order.quantity}</td>
                          <td className="px-6 py-4 text-right text-sm font-extrabold text-slate-950">${(order.amountPaidCents / 100).toFixed(2)}</td>
                          <td className="px-6 py-4 text-center text-sm">
                            <Badge tone={order.status === 'paid' ? 'success' : 'danger'}>
                              {order.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right text-sm whitespace-nowrap">
                            {order.status === 'paid' && (
                              <Button
                                onClick={() => handleRefundBundle(order.stripePaymentIntentId)}
                                variant="danger"
                                size="small"
                                className="font-semibold"
                              >
                                Refund Bundle
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Season Pass Orders - Mobile Card View */}
            <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm md:hidden">
              <div className="divide-y divide-slate-100">
                {loading ? (
                  <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-sm font-medium text-slate-400">
                    <span className="size-6 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
                    Loading orders...
                  </div>
                ) : bundleOrders.length === 0 ? (
                  <div className="p-6 text-center">
                    <EmptyState
                      title="No Orders Found"
                      description="No season pass orders have been placed yet."
                      icon="🎫"
                    />
                  </div>
                ) : (
                  bundleOrders.map(order => {
                    const isRefunded = order.status === 'refunded';
                    return (
                      <div key={order.stripeSessionId} className={`flex flex-col gap-3 p-4 transition-colors hover:bg-slate-50/40 ${isRefunded ? 'opacity-60' : ''}`}>
                        {/* Row 1: Date & Status Badge */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-400">
                            {formatInTimezone(order.created, timezone, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </span>
                          <Badge tone={order.status === 'paid' ? 'success' : 'danger'}>
                            {order.status}
                          </Badge>
                        </div>

                        {/* Row 2: Buyer Info & Pass Info */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-bold text-slate-800">{order.buyerName}</span>
                            <span className="text-xs font-medium break-all text-slate-500">{order.buyerEmail}</span>
                            <span className="mt-1 block text-xs font-semibold text-slate-600">Bundle: {order.bundleTitle}</span>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-0.5">
                            <span className="text-sm font-bold text-slate-900">{order.quantity} Pass{order.quantity !== 1 ? 'es' : ''}</span>
                            <span className="text-base font-extrabold text-emerald-700">
                              ${(order.amountPaidCents / 100).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Row 3: Refund Actions */}
                        {order.status === 'paid' && (
                          <div className="mt-1 flex justify-end border-t border-slate-50 pt-1.5">
                            <Button variant="danger" size="small" className="w-full py-1.5 text-xs font-semibold" onClick={() => handleRefundBundle(order.stripePaymentIntentId)}>
                              Refund Bundle
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </AppCard>
      )}

      {activeTab === 'share' && (
        <div className="flex flex-col gap-6 animate-fade-in">
          <AppCard>
            <h3 className="text-xl font-black tracking-tight text-slate-800">Promotional Links & QR Codes</h3>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Share these links or download high-quality QR codes for your flyers, concert programs, and social media.
            </p>
          </AppCard>

          {/* General Ticket Storefront Section */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              General Storefront
            </h4>
            <QRCodeShareCard
              title="Main Public Ticket Page"
              subtitle="Directs buyers to view all available tickets and pass packages"
              url="/tickets"
              badgeText="General Storefront"
              badgeTone="success"
              logoUrl={logoUrl ?? undefined}
            />
          </div>

          {/* Active Concerts Section */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              Upcoming Concert Tickets
            </h4>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {upcomingTicketingEvents.map(ev => (
                <QRCodeShareCard
                  key={ev.id}
                  title={ev.title || 'Untitled Concert'}
                  subtitle={formatInTimezone(ev.date, timezone, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  url={`/tickets/${ev.id}`}
                  badgeText="Concert Ticket"
                  badgeTone="performance"
                  logoUrl={logoUrl ?? undefined}
                />
              ))}
              {upcomingTicketingEvents.length === 0 && (
                <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-sm font-medium text-slate-400">
                  No upcoming concerts currently have ticketing enabled.
                </div>
              )}
            </div>
          </div>

          {/* Active Bundles Section */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              Active Season Bundles
            </h4>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {activeBundles.map(b => (
                <QRCodeShareCard
                  key={b.id}
                  title={b.title}
                  subtitle={`Price: $${(b.priceCents / 100).toFixed(2)}`}
                  url={`/tickets/bundle/${b.id}`}
                  badgeText="Season Pass"
                  badgeTone="success"
                  logoUrl={logoUrl ?? undefined}
                />
              ))}
              {activeBundles.length === 0 && (
                <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-sm font-medium text-slate-400">
                  No active season bundles configured.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CRUD Bundle Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBundle ? "Edit Season Bundle" : "Create Season Bundle"}
        maxWidth="600px"
        footer={
          <div className="flex flex-row gap-4">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={saving}
              className="font-semibold"
              onClick={() => handleSaveBundle()}
            >
              {saving ? "Saving..." : "Save Bundle"}
            </Button>
          </div>
        }
      >
        <form id="bundle-form" onSubmit={handleSaveBundle} className="flex flex-col gap-4">
          {editingBundle && (
            <div className="rounded border-l-4 border-primary bg-[rgba(74,124,89,0.05)] p-2 text-sm">
              <strong>🔗 Share Season Pass Link:</strong>{' '}
              <a 
                href={`/tickets/bundle/${editingBundle.id}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="break-all text-primary underline"
              >
                {window.location.origin}/tickets/bundle/{editingBundle.id}
              </a>
            </div>
          )}

          <FormField label="Bundle Title" required>
            <Input
              type="text"
              required
              placeholder="e.g. 2026-2027 Season Pass"
              className="block w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm transition-colors outline-none placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary"
              value={bundleTitle}
              onChange={e => setBundleTitle(e.target.value)}
            />
          </FormField>

          <div className="flex flex-wrap gap-4">
            <div className="min-w-[150px] flex-1">
              <FormField label="Price (USD)" required>
                <Input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  className="block w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm transition-colors outline-none placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary"
                  value={price || ''}
                  onChange={e => setPrice(Number(e.target.value))}
                />
              </FormField>
            </div>
            <div className="min-w-[150px] flex-1">
              <FormField label="Capacity Limit" required>
                <Input
                  type="number"
                  required
                  min="1"
                  className="block w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm transition-colors outline-none placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary"
                  value={capacity || ''}
                  onChange={e => setCapacity(Number(e.target.value))}
                />
              </FormField>
            </div>
          </div>

          <FormField label="Sale End Date" required>
            <Input
              type="datetime-local"
              required
              className="block w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm transition-colors outline-none placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary"
              value={saleEndDate}
              onChange={e => setSaleEndDate(e.target.value)}
            />
          </FormField>

          <FormField label="Included Performances">
            {hasPurchases && (
              <div className="mb-2 rounded-lg border border-yellow-200 bg-yellow-50 p-2 text-xs text-yellow-700">
                ⚠️ This bundle has active purchases. Included events are locked to prevent data drift.
              </div>
            )}
            <div className="flex max-h-[200px] flex-col gap-2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3">
              {events
                .filter(ev => ev.isTicketingEnabled)
                .map(ev => {
                  const isChecked = selectedEventIdsSet.has(ev.id);
                  return (
                    <label 
                      key={ev.id} 
                      className={`flex flex-row items-center gap-2 text-sm text-slate-700 ${hasPurchases ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={hasPurchases}
                        className="rounded border-slate-300 text-primary focus:ring-primary/25"
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedEventIds([...selectedEventIds, ev.id]);
                          } else {
                            setSelectedEventIds(selectedEventIds.filter(id => id !== ev.id));
                          }
                        }}
                      />
                      <span>
                        {ev.title} ({formatInTimezone(ev.date, timezone, { month: 'short', day: 'numeric', year: 'numeric' })})
                      </span>
                    </label>
                  );
                })}
              {events.filter(ev => ev.isTicketingEnabled).length === 0 && (
                <span className="text-xs font-medium text-slate-400">No ticketing-enabled events found. Please enable ticketing on your events first.</span>
              )}
            </div>
          </FormField>

          <FormField label="Public Details / Instructions">
            <textarea
              placeholder="e.g. Please bring a photo ID. This pass is non-transferable."
              className="block min-h-[100px] w-full resize-y rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 shadow-sm transition-colors outline-none placeholder:text-slate-400 focus:border-primary focus:ring-1 focus:ring-primary"
              value={publicDetails}
              onChange={e => setPublicDetails(e.target.value)}
            />
          </FormField>

          <label className="mt-2 flex cursor-pointer flex-row items-center gap-2">
            <input
              type="checkbox"
              checked={bundleIsActive}
              className="rounded border-slate-300 text-primary focus:ring-primary/25"
              onChange={e => setBundleIsActive(e.target.checked)}
            />
            <span className="text-sm font-semibold text-slate-800">Active and visible to the public</span>
          </label>
        </form>
      </Modal>
    </div>
  );
}
