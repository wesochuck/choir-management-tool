import { useCallback, useEffect, useMemo, useState } from 'react';
import { ticketService, type TicketPurchase, type TicketBundle } from '../../services/ticketService';
import { pb } from '../../lib/pocketbase';
import type { Event } from '../../services/eventService';
import { AppCard } from '../../components/common/AppCard';
import { useDialog } from '../../contexts/DialogContext';
import { fetchChoirTimezone, formatInTimezone } from '../../lib/timezone';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { Link } from 'react-router-dom';
import { getFirstName, getLastName } from '../../lib/stringUtils';
import { BaseModal } from '../../components/common/BaseModal';

export default function TicketingView() {
  useDocumentTitle('Ticketing');
  const dialog = useDialog();
  const [now] = useState(() => Date.now());
  const [activeTab, setActiveTab] = useState<'willcall' | 'bundles' | 'orders'>('willcall');

  const [events, setEvents] = useState<Event[]>([]);
  const [showPastAndInactive, setShowPastAndInactive] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [purchases, setPurchases] = useState<TicketPurchase[]>([]);
  const [allPurchases, setAllPurchases] = useState<TicketPurchase[]>([]);
  const [bundles, setBundles] = useState<TicketBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [sortBy, setSortBy] = useState<'lastName' | 'firstName' | 'saleDate'>('lastName');

  // Bundle CRUD modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<TicketBundle | null>(null);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState(0);
  const [capacity, setCapacity] = useState(0);
  const [saleEndDate, setSaleEndDate] = useState('');
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const selectedEventIdsSet = useMemo(() => new Set(selectedEventIds), [selectedEventIds]);
  const [isActive, setIsActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publicDetails, setPublicDetails] = useState('');

  const reloadData = useCallback(async () => {
    setLoading(true);
    try {
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
      setEvents(allEvents);
      setAllPurchases(allPurchasesRes);
      setBundles(bundlesRes);
      setTimezone(tz);

      if (selectedEventId) {
        setPurchases(purchasesRes);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedEventId]);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  const visibleEvents = useMemo(() => {
    const cutoffTime = now - 3 * 60 * 60 * 1000;
    return events.filter(ev => {
      if (showPastAndInactive) return true;
      const isUpcoming = new Date(ev.date).getTime() >= cutoffTime;
      const isActive = ev.isTicketingEnabled;
      return isUpcoming && isActive;
    });
  }, [events, showPastAndInactive, now]);

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

  const handleRefund = async (purchaseId: string) => {
    const confirmed = await dialog.confirm({
      title: 'Refund Ticket',
      message: 'Are you sure you want to refund this ticket? This will void the ticket on Will Call and issue a refund on Stripe.',
      confirmLabel: 'Refund',
      variant: 'danger',
    });
    
    if (!confirmed) return;

    try {
      dialog.showToast('Processing refund...');
      await ticketService.adminRefundTicket(purchaseId);
      dialog.showToast('Refund processed successfully.');
      reloadData();
    } catch {
      await dialog.showMessage({
        title: 'Refund Failed',
        message: 'Could not process the refund. Please verify the Stripe Dashboard.',
        variant: 'danger'
      });
    }
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

  // Bundle refund handler
  const handleRefundBundle = async (paymentIntentId: string) => {
    const confirmed = await dialog.confirm({
      title: 'Refund Bundle Purchase',
      message: 'Are you sure you want to refund this bundle purchase? This will issue a full Stripe refund and void all associated individual tickets on the Will Call lists. This action is permanent and cannot be undone.',
      confirmLabel: 'Refund Bundle',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      dialog.showToast('Processing bundle refund...');
      await ticketService.adminRefundBundle(paymentIntentId);
      dialog.showToast('Bundle refunded successfully.');
      reloadData();
    } catch {
      await dialog.showMessage({
        title: 'Refund Failed',
        message: 'Could not process the bundle refund. Please verify the Stripe Dashboard.',
        variant: 'danger'
      });
    }
  };

  // Bundle CRUD handlers
  const handleOpenCreateModal = () => {
    setEditingBundle(null);
    setTitle('');
    setPrice(0);
    setCapacity(0);
    setSaleEndDate('');
    setSelectedEventIds([]);
    setIsActive(false);
    setPublicDetails('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (bundle: TicketBundle) => {
    setEditingBundle(bundle);
    setTitle(bundle.title);
    setPrice(bundle.priceCents / 100);
    setCapacity(bundle.capacity);
    
    // Format timezone date for datetime-local: YYYY-MM-DDTHH:mm
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
    setIsActive(bundle.isActive);
    setPublicDetails(bundle.publicDetails || '');
    setIsModalOpen(true);
  };

  const handleSaveBundle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || price <= 0 || capacity <= 0 || selectedEventIds.length === 0 || !saleEndDate) {
      dialog.showToast('Please fill out all required fields and select at least one event.');
      return;
    }

    setSaving(true);
    try {
      const data = {
        title: title.trim(),
        priceCents: Math.round(price * 100),
        capacity: Number(capacity),
        events: selectedEventIds,
        saleEndDate: new Date(saleEndDate).toISOString(),
        isActive,
        publicDetails: publicDetails.trim()
      };

      if (editingBundle) {
        await pb.collection('ticketBundles').update(editingBundle.id, data);
        dialog.showToast('Bundle updated successfully.');
      } else {
        await pb.collection('ticketBundles').create(data);
        dialog.showToast('Bundle created successfully.');
      }
      setIsModalOpen(false);
      reloadData();
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
      await pb.collection('ticketBundles').delete(bundleId);
      dialog.showToast('Bundle deleted successfully.');
      reloadData();
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            Ticketing Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage ticket sales, configure season bundles, and view check-in checklists.
          </p>
        </div>
      </div>

      {/* Tab Controls */}
      <div className="mt-8 border-b border-slate-200">
        <div className="-mb-px flex items-center justify-between">
          <nav className="flex gap-2">
            <button
              className={`rounded-t-lg px-5 py-2.5 text-sm font-medium ${activeTab === 'willcall' ? 'bg-emerald-700 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
              onClick={() => setActiveTab('willcall')}
            >
              Concert Will Call
            </button>
            <button
              className={`rounded-t-lg px-5 py-2.5 text-sm font-medium ${activeTab === 'bundles' ? 'bg-emerald-700 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
              onClick={() => setActiveTab('bundles')}
            >
              Season Bundles
            </button>
            <button
              className={`rounded-t-lg px-5 py-2.5 text-sm font-medium ${activeTab === 'orders' ? 'bg-emerald-700 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
              onClick={() => setActiveTab('orders')}
            >
              Bundle Orders
            </button>
          </nav>

          <div className="flex items-center gap-4">
            {activeTab === 'bundles' && (
              <button onClick={handleOpenCreateModal} className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-800">
                Create New Bundle
              </button>
            )}
            {activeTab === 'willcall' && selectedEventId && (
              <button onClick={handleExportCSV} className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-800">
                Export Will Call CSV
              </button>
            )}
          </div>
        </div>
      </div>

      {activeTab === 'willcall' && (
        <>
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">
              Ticketing Instructions & Links
            </h2>

            <p className="mt-4 max-w-4xl text-sm leading-6 text-slate-600">
              Tickets are enabled on a per-performance basis. Go to the <Link to="/admin/events" className="font-medium text-emerald-700 underline underline-offset-2">Events Dashboard</Link>, edit or create a Performance event, click the <strong className="font-semibold text-slate-800">Tickets</strong> tab, and toggle <strong className="font-semibold text-slate-800">Enable Online Ticket Sales</strong>.
            </p>

            <dl className="mt-5 space-y-2 text-sm">
              <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
                <dt className="font-semibold text-slate-900 whitespace-nowrap">Storefront URL:</dt>
                <dd>
                  <a href="/tickets" target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-700 underline underline-offset-2">
                    {window.location.origin}/tickets
                  </a>
                </dd>
              </div>

              {selectedEventId && selectedEvent && (
                <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
                  <dt className="font-semibold text-slate-900 whitespace-nowrap">Direct Concert Ticket Link:</dt>
                  <dd>
                    <a href={`/tickets/${selectedEventId}`} target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-700 underline underline-offset-2">
                      {window.location.origin}/tickets/{selectedEventId}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <section className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Performance Summary
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Choose a performance to view ticket sales, revenue, and will call activity.
              </p>
            </div>

            <div className="px-6 py-5">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,24rem)_auto] lg:items-end">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Select Performance
                  </span>
                  <select
                    value={selectedEventId}
                    onChange={e => setSelectedEventId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
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
                  </select>
                </label>

                <label className="flex items-center gap-2 pb-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={showPastAndInactive}
                    onChange={e => setShowPastAndInactive(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                  />
                  <span>Include past and inactive performances</span>
                </label>
              </div>

              {selectedEvent && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Tickets Sold
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                      {totalTicketsSold} {eventCapacity > 0 ? `/ ${eventCapacity}` : ''}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Ticket Sales
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                      ${(activePurchases.reduce((acc, p) => acc + (p.unitPriceCents * p.quantity), 0) / 100).toFixed(2)}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Fees Collected
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-slate-700">
                      ${(activePurchases.reduce((acc, p) => acc + p.feeCents, 0) / 100).toFixed(2)}
                    </p>
                  </div>

                  <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      Total Revenue
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-emerald-700">
                      ${(activePurchases.reduce((acc, p) => acc + p.amountPaidCents, 0) / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              {showWarning && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                  ⚠️ Warning: Sold tickets ({totalTicketsSold}) have reached or exceeded 90% of capacity ({eventCapacity}).
                </div>
              )}
            </div>
          </section>

          <section className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Will Call Checklist
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Search ticket buyers, confirm payment status, and process refunds.
              </p>
            </div>

            <div className="grid gap-3 border-b border-slate-200 bg-slate-50/50 px-6 py-4 lg:grid-cols-[1fr_14rem]">
              <input
                type="text"
                placeholder="Search buyer name or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
              />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as 'lastName' | 'firstName' | 'saleDate')}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
              >
                <option value="lastName">Sort by Last Name</option>
                <option value="firstName">Sort by First Name</option>
                <option value="saleDate">Sort by Sale Date</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-sm font-medium text-slate-700">Loading registrations...</p>
                </div>
              ) : filteredPurchases.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-sm font-medium text-slate-700">No purchase records found.</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Buyer Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Sale Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Qty
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Amount Paid
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredPurchases.map(p => {
                      const isRefunded = p.status === 'refunded';
                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-slate-50"
                          // @allow-inline-style - isRefunded text color/opacity
                          style={{ color: isRefunded ? 'var(--text-muted)' : 'inherit', opacity: isRefunded ? 0.6 : 1 }}
                        >
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-800">
                            {p.buyerName}
                            {p.expand?.bundle && (
                              <span className="ml-2 inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-emerald-700">
                                Season Ticket: {p.expand.bundle.title}
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                            {p.buyerEmail}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                            {formatInTimezone(p.created, timezone, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                            {p.quantity}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-800">
                            ${(p.amountPaidCents / 100).toFixed(2)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ${p.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                            {p.status === 'paid' && (
                              <button
                                onClick={() => {
                                  if (p.bundle) {
                                    handleRefundBundle(p.stripePaymentIntentId);
                                  } else {
                                    handleRefund(p.id);
                                  }
                                }}
                                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
                              >
                                Refund
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </>
      )}

      {activeTab === 'bundles' && (
        <AppCard title="Season Bundles Configuration">
          {loading ? (
            <p className="text-gray-500">Loading bundles...</p>
          ) : bundles.length === 0 ? (
            <p className="p-8 text-center text-gray-500">No season bundles configured.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b-2 border-gray-200 text-sm text-gray-500">
                    <th className="p-3 px-2 text-left">Bundle Title</th>
                    <th className="p-3 px-2 text-left">Price</th>
                    <th className="p-3 px-2 text-left">Active</th>
                    <th className="p-3 px-2 text-left">Capacity Sold</th>
                    <th className="p-3 px-2 text-left">Sale End Date</th>
                    <th className="p-3 px-2 text-left">Included Events</th>
                    <th className="p-3 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bundles.map(b => {
                    const sold = getBundleSoldQty(b.id, b.events);
                    return (
                      <tr key={b.id} className="border-b border-gray-200 text-sm">
                        <td className="p-3 px-2 font-semibold">{b.title}</td>
                        <td className="p-3 px-2">${(b.priceCents / 100).toFixed(2)}</td>
                        <td className="p-3 px-2">
                          <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold tracking-wider uppercase ${b.isActive ? 'bg-success-bg text-success-text' : 'bg-danger-bg text-danger-text'}`}>
                            {b.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-3 px-2">
                          <div className="flex flex-col gap-1">
                            <span>{sold} / {b.capacity} sold</span>
                            <div className="h-1.5 w-[100px] overflow-hidden rounded bg-gray-200">
                              <div 
                                className="h-full bg-primary" 
                                // @allow-inline-style - progress bar width
                                style={{ width: `${Math.min(100, (sold / b.capacity) * 100)}%` }} 
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-3 px-2">
                          {formatInTimezone(b.saleEndDate, timezone, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </td>
                        <td className="max-w-[240px] p-3 px-2">
                          <div className="flex flex-wrap gap-1">
                            {b.expand?.events?.map(ev => (
                              <span key={ev.id} className="inline-flex items-center rounded bg-primary-light px-2 py-0.5 text-xs font-semibold tracking-wider whitespace-nowrap text-primary-deep uppercase">
                                {ev.title}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 px-2 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleOpenEditModal(b)}
                            className="btn btn-secondary btn-sm mr-2"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteBundle(b.id, b.events)}
                            className="btn btn-danger btn-sm"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AppCard>
      )}

      {activeTab === 'orders' && (
        <AppCard title="Season Pass Orders">
          {loading ? (
            <p className="text-gray-500">Loading orders...</p>
          ) : bundleOrders.length === 0 ? (
            <p className="p-8 text-center text-gray-500">No season pass orders found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b-2 border-gray-200 text-sm text-gray-500">
                    <th className="p-3 px-2 text-left">Buyer Name</th>
                    <th className="p-3 px-2 text-left">Email</th>
                    <th className="p-3 px-2 text-left">Purchase Date</th>
                    <th className="p-3 px-2 text-left">Season Bundle</th>
                    <th className="p-3 px-2 text-left">Qty</th>
                    <th className="p-3 px-2 text-left">Amount Paid</th>
                    <th className="p-3 px-2 text-left">Status</th>
                    <th className="p-3 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bundleOrders.map(order => {
                    const isRefunded = order.status === 'refunded';
                    return (
                      <tr 
                        key={order.stripeSessionId} 
                        className="border-b border-gray-200 text-sm" 
                        // @allow-inline-style - isRefunded text color/opacity
                        style={{ color: isRefunded ? 'var(--text-muted)' : 'inherit', opacity: isRefunded ? 0.6 : 1 }}
                      >
                        <td className="p-3 px-2 font-semibold">{order.buyerName}</td>
                        <td className="p-3 px-2">{order.buyerEmail}</td>
                        <td className="p-3 px-2">
                          {formatInTimezone(order.created, timezone, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </td>
                        <td className="p-3 px-2 font-medium">{order.bundleTitle}</td>
                        <td className="p-3 px-2">{order.quantity}</td>
                        <td className="p-3 px-2">${(order.amountPaidCents / 100).toFixed(2)}</td>
                        <td className="p-3 px-2">
                          <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold tracking-wider uppercase ${order.status === 'paid' ? 'bg-success-bg text-success-text' : 'bg-danger-bg text-danger-text'}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="p-3 px-2 text-right">
                          {order.status === 'paid' && (
                            <button
                              onClick={() => handleRefundBundle(order.stripePaymentIntentId)}
                              className="btn btn-danger btn-sm"
                            >
                              Refund Bundle
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AppCard>
      )}

      {/* CRUD Bundle Modal */}
      <BaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBundle ? "Edit Season Bundle" : "Create Season Bundle"}
        maxWidth="600px"
        footer={
          <div className="flex flex-row gap-4">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="bundle-form"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Bundle"}
            </button>
          </div>
        }
      >
        <form id="bundle-form" onSubmit={handleSaveBundle} className="flex flex-col gap-4">
          {editingBundle && (
            <div className="card rounded border-l-4 border-primary bg-[rgba(74,124,89,0.05)] p-2 text-sm">
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

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold">Bundle Title</label>
            <input
              type="text"
              required
              placeholder="e.g. 2026-2027 Season Pass"
              className="card h-10 px-3"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-sm font-semibold">Price (USD)</label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                className="card h-10 px-3"
                value={price || ''}
                onChange={e => setPrice(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-sm font-semibold">Capacity Limit</label>
              <input
                type="number"
                required
                min="1"
                className="card h-10 px-3"
                value={capacity || ''}
                onChange={e => setCapacity(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold">Sale End Date</label>
            <input
              type="datetime-local"
              required
              className="card h-10 px-3"
              value={saleEndDate}
              onChange={e => setSaleEndDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold">Included Performances</label>
            {hasPurchases && (
              <div className="card border-yellow-200 bg-yellow-50 text-yellow-700 p-2 text-sm">
                ⚠️ This bundle has active purchases. Included events are locked to prevent data drift.
              </div>
            )}
            <div className="card flex max-h-[200px] flex-col gap-2 overflow-y-auto border border-gray-200 p-2">
              {events
                .filter(ev => ev.isTicketingEnabled)
                .map(ev => {
                  const isChecked = selectedEventIdsSet.has(ev.id);
                  return (
                    <label 
                      key={ev.id} 
                      className="flex flex-row items-center gap-2 text-sm" 
                      // @allow-inline-style - hasPurchases cursor
                      style={{ cursor: hasPurchases ? 'not-allowed' : 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={hasPurchases}
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
                <span className="text-xs text-gray-500">No ticketing-enabled events found. Please enable ticketing on your events first.</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold">Public Details / Instructions</label>
            <textarea
              placeholder="e.g. Please bring a photo ID. This pass is non-transferable."
              className="card min-h-[100px] resize-y border border-gray-200 p-2"
              value={publicDetails}
              onChange={e => setPublicDetails(e.target.value)}
            />
          </div>

          <label className="flex cursor-pointer flex-row items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
            />
            <span className="m-0 text-sm font-semibold">Active and visible to the public</span>
          </label>
        </form>
      </BaseModal>
    </div>
  );
}
