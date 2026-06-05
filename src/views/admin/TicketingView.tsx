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
  const [isActive, setIsActive] = useState(false);
  const [saving, setSaving] = useState(false);

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
        isActive
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
      const selectedConcerts = events.filter(e => selectedEventIds.includes(e.id));
      if (selectedConcerts.length > 0) {
        selectedConcerts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const firstEventDate = new Date(selectedConcerts[0].date);
        const year = firstEventDate.getFullYear();
        const month = String(firstEventDate.getMonth() + 1).padStart(2, '0');
        const day = String(firstEventDate.getDate()).padStart(2, '0');
        setSaleEndDate(`${year}-${month}-${day}T23:59`);
      }
    }
  }, [selectedEventIds, isModalOpen, editingBundle, events]);

  const hasPurchases = editingBundle ? getBundleSoldQty(editingBundle.id, editingBundle.events) > 0 : false;

  return (
    <div className="flex-col" style={{ gap: 'var(--space-lg)', padding: 'var(--space-xl) 0' }}>
      <div className="flex-responsive" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-display" style={{ margin: 0 }}>Ticketing Dashboard</h1>
          <p className="text-muted text-sm">Manage ticket sales, configure season bundles, and view check-in checklists.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          {activeTab === 'bundles' && (
            <button onClick={handleOpenCreateModal} className="btn btn-primary">
              Create New Bundle
            </button>
          )}
          {activeTab === 'willcall' && selectedEventId && (
            <button onClick={handleExportCSV} className="btn btn-primary">
              Export Will Call CSV
            </button>
          )}
        </div>
      </div>

      {/* Tab Controls */}
      <div className="flex-row" style={{ gap: 'var(--space-sm)', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-xs)', marginBottom: 'var(--space-xs)' }}>
        <button
          className={`btn ${activeTab === 'willcall' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('willcall')}
          style={{ padding: '8px 16px', fontWeight: 600 }}
        >
          Concert Will Call
        </button>
        <button
          className={`btn ${activeTab === 'bundles' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('bundles')}
          style={{ padding: '8px 16px', fontWeight: 600 }}
        >
          Season Bundles
        </button>
        <button
          className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('orders')}
          style={{ padding: '8px 16px', fontWeight: 600 }}
        >
          Bundle Orders
        </button>
      </div>

      {activeTab === 'willcall' && (
        <>
          <div className="card" style={{ padding: 'var(--space-md)', backgroundColor: 'rgba(74, 124, 89, 0.05)', borderLeft: '4px solid var(--primary)', borderRadius: 'var(--radius-md)', margin: 0 }}>
            <h3 style={{ margin: '0 0 var(--space-xs) 0', fontSize: '1rem', color: 'var(--primary-deep)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ℹ️ Ticketing Instructions & Links
            </h3>
            <p className="text-muted text-sm" style={{ margin: '0 0 var(--space-sm) 0', lineHeight: '1.4' }}>
              Tickets are enabled on a per-performance basis. Go to the <Link to="/admin/events" style={{ fontWeight: 600, textDecoration: 'underline', color: 'var(--primary-deep)' }}>Events Dashboard</Link>, edit or create a Performance event, click the <strong>Tickets</strong> tab, and toggle <strong>Enable Online Ticket Sales</strong>.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
              <div>
                <strong>📢 Storefront URL:</strong>{' '}
                <a href="/tickets" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', color: 'var(--primary)' }}>
                  {window.location.origin}/tickets
                </a>
                <span className="text-xs text-muted" style={{ marginLeft: '6px' }}>(list of all active ticketed concerts & bundles)</span>
              </div>
              {selectedEventId && selectedEvent && (
                <div>
                  <strong>🔗 Direct Concert Ticket Link:</strong>{' '}
                  <a href={`/tickets/${selectedEventId}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', color: 'var(--primary)' }}>
                    {window.location.origin}/tickets/{selectedEventId}
                  </a>
                  <span className="text-xs text-muted" style={{ marginLeft: '6px' }}>(direct checkout page for {selectedEvent.title})</span>
                </div>
              )}
            </div>
          </div>

          <div className="card flex-responsive" style={{ padding: 'var(--space-md)', gap: 'var(--space-md)', alignItems: 'center', backgroundColor: 'var(--neutral-bg)' }}>
            <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
              <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="text-label">Select Performance</label>
                <label className="flex-row" style={{ alignItems: 'center', gap: '6px', fontSize: '0.875rem', cursor: 'pointer', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={showPastAndInactive}
                    onChange={e => setShowPastAndInactive(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>Include past & inactive performances</span>
                </label>
              </div>
              <select
                className="card"
                style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
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
              </select>
            </div>

            {selectedEvent && (
              <div className="flex-row" style={{ gap: 'var(--space-xl)', padding: '0 var(--space-md)', flexWrap: 'wrap' }}>
                <div className="flex-col" style={{ gap: 2, minWidth: '100px' }}>
                  <span className="text-xs text-muted">TICKETS SOLD</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                    {totalTicketsSold} {eventCapacity > 0 ? `/ ${eventCapacity}` : ''}
                  </span>
                </div>
                <div className="flex-col" style={{ gap: 2, minWidth: '110px' }}>
                  <span className="text-xs text-muted">TICKET SALES</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                    ${(activePurchases.reduce((acc, p) => acc + (p.unitPriceCents * p.quantity), 0) / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex-col" style={{ gap: 2, minWidth: '110px' }}>
                  <span className="text-xs text-muted">FEES COLLECTED</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    ${(activePurchases.reduce((acc, p) => acc + p.feeCents, 0) / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex-col" style={{ gap: 2, minWidth: '110px' }}>
                  <span className="text-xs text-muted">TOTAL REVENUE</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                    ${(activePurchases.reduce((acc, p) => acc + p.amountPaidCents, 0) / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {showWarning && (
            <div className="card" style={{ padding: 'var(--space-md)', borderColor: 'var(--color-warning-border)', backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning-text)' }}>
              ⚠️ Warning: Sold tickets ({totalTicketsSold}) have reached or exceeded 90% of capacity ({eventCapacity}).
            </div>
          )}

          <AppCard title="Will Call Checklist">
            <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
              <div className="flex-responsive" style={{ gap: 'var(--space-sm)', width: '100%', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: '200px', width: '100%' }}>
                  <input
                    type="text"
                    placeholder="Search buyer name or email..."
                    className="card"
                    style={{ width: '100%', padding: '0 12px', height: '40px', border: '1px solid var(--border)' }}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <div style={{ minWidth: '200px' }}>
                  <select
                    className="card"
                    style={{ width: '100%', padding: '0 12px', height: '40px', border: '1px solid var(--border)', cursor: 'pointer' }}
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as 'lastName' | 'firstName' | 'saleDate')}
                  >
                    <option value="lastName">Sort by Last Name</option>
                    <option value="firstName">Sort by First Name</option>
                    <option value="saleDate">Sort by Sale Date</option>
                  </select>
                </div>
              </div>

              {loading ? (
                <p className="text-muted">Loading registrations...</p>
              ) : filteredPurchases.length === 0 ? (
                <p className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-lg) 0' }}>No purchase records found.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="w-full text-left" style={{ borderCollapse: 'collapse', width: '100%', minWidth: '600px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        <th style={{ padding: '12px 8px', textAlign: 'left' }}>Buyer Name</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left' }}>Email</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left' }}>Sale Date</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left' }}>Qty</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left' }}>Amount Paid</th>
                        <th style={{ padding: '12px 8px', textAlign: 'left' }}>Status</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPurchases.map(p => {
                        const isRefunded = p.status === 'refunded';
                        return (
                          <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.9rem', color: isRefunded ? 'var(--text-muted)' : 'inherit', opacity: isRefunded ? 0.6 : 1 }}>
                            <td style={{ padding: '12px 8px', fontWeight: 600 }}>
                              {p.buyerName}
                              {p.expand?.bundle && (
                                <span className="badge badge-success" style={{ marginLeft: '8px', fontSize: '0.7rem', verticalAlign: 'middle' }}>
                                  Season Ticket: {p.expand.bundle.title}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '12px 8px' }}>{p.buyerEmail}</td>
                            <td style={{ padding: '12px 8px' }}>
                              {formatInTimezone(p.created, timezone, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            </td>
                            <td style={{ padding: '12px 8px' }}>{p.quantity}</td>
                            <td style={{ padding: '12px 8px' }}>${(p.amountPaidCents / 100).toFixed(2)}</td>
                            <td style={{ padding: '12px 8px' }}>
                              <span className={`badge ${p.status === 'paid' ? 'badge-success' : 'badge-danger'}`} style={{ textTransform: 'capitalize' }}>
                                {p.status}
                              </span>
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                              {p.status === 'paid' && (
                                <button
                                  onClick={() => {
                                    if (p.bundle) {
                                      handleRefundBundle(p.stripePaymentIntentId);
                                    } else {
                                      handleRefund(p.id);
                                    }
                                  }}
                                  className="btn btn-danger btn-sm"
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
                </div>
              )}
            </div>
          </AppCard>
        </>
      )}

      {activeTab === 'bundles' && (
        <AppCard title="Season Bundles Configuration">
          {loading ? (
            <p className="text-muted">Loading bundles...</p>
          ) : bundles.length === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-lg) 0' }}>No season bundles configured.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="w-full text-left" style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    <th style={{ padding: '12px 8px' }}>Bundle Title</th>
                    <th style={{ padding: '12px 8px' }}>Price</th>
                    <th style={{ padding: '12px 8px' }}>Active</th>
                    <th style={{ padding: '12px 8px' }}>Capacity Sold</th>
                    <th style={{ padding: '12px 8px' }}>Sale End Date</th>
                    <th style={{ padding: '12px 8px' }}>Included Events</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bundles.map(b => {
                    const sold = getBundleSoldQty(b.id, b.events);
                    return (
                      <tr key={b.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
                        <td style={{ padding: '12px 8px', fontWeight: 600 }}>{b.title}</td>
                        <td style={{ padding: '12px 8px' }}>${(b.priceCents / 100).toFixed(2)}</td>
                        <td style={{ padding: '12px 8px' }}>
                          <span className={`badge ${b.isActive ? 'badge-success' : 'badge-danger'}`}>
                            {b.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span>{sold} / {b.capacity} sold</span>
                            <div style={{ width: '100px', height: '6px', backgroundColor: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(100, (sold / b.capacity) * 100)}%`, height: '100%', backgroundColor: 'var(--primary)' }} />
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          {formatInTimezone(b.saleEndDate, timezone, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '12px 8px', maxWidth: '240px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {b.expand?.events?.map(ev => (
                              <span key={ev.id} className="badge badge-secondary" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                                {ev.title}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            onClick={() => handleOpenEditModal(b)}
                            className="btn btn-secondary btn-sm"
                            style={{ marginRight: '8px' }}
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
            <p className="text-muted">Loading orders...</p>
          ) : bundleOrders.length === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-lg) 0' }}>No season pass orders found.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="w-full text-left" style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    <th style={{ padding: '12px 8px' }}>Buyer Name</th>
                    <th style={{ padding: '12px 8px' }}>Email</th>
                    <th style={{ padding: '12px 8px' }}>Purchase Date</th>
                    <th style={{ padding: '12px 8px' }}>Season Bundle</th>
                    <th style={{ padding: '12px 8px' }}>Qty</th>
                    <th style={{ padding: '12px 8px' }}>Amount Paid</th>
                    <th style={{ padding: '12px 8px' }}>Status</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bundleOrders.map(order => {
                    const isRefunded = order.status === 'refunded';
                    return (
                      <tr key={order.stripeSessionId} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.9rem', color: isRefunded ? 'var(--text-muted)' : 'inherit', opacity: isRefunded ? 0.6 : 1 }}>
                        <td style={{ padding: '12px 8px', fontWeight: 600 }}>{order.buyerName}</td>
                        <td style={{ padding: '12px 8px' }}>{order.buyerEmail}</td>
                        <td style={{ padding: '12px 8px' }}>
                          {formatInTimezone(order.created, timezone, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '12px 8px', fontWeight: 500 }}>{order.bundleTitle}</td>
                        <td style={{ padding: '12px 8px' }}>{order.quantity}</td>
                        <td style={{ padding: '12px 8px' }}>${(order.amountPaidCents / 100).toFixed(2)}</td>
                        <td style={{ padding: '12px 8px' }}>
                          <span className={`badge ${order.status === 'paid' ? 'badge-success' : 'badge-danger'}`} style={{ textTransform: 'capitalize' }}>
                            {order.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'right' }}>
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
          <div className="flex-row" style={{ gap: 'var(--space-md)' }}>
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
        <form id="bundle-form" onSubmit={handleSaveBundle} className="flex-col" style={{ gap: 'var(--space-md)' }}>
          <div className="flex-col" style={{ gap: '4px' }}>
            <label className="text-label">Bundle Title</label>
            <input
              type="text"
              required
              placeholder="e.g. 2026-2027 Season Pass"
              className="card"
              style={{ padding: '0 12px', height: '40px' }}
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div className="flex-responsive" style={{ gap: 'var(--space-md)' }}>
            <div className="flex-col" style={{ flex: 1, gap: '4px' }}>
              <label className="text-label">Price (USD)</label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                className="card"
                style={{ padding: '0 12px', height: '40px' }}
                value={price || ''}
                onChange={e => setPrice(Number(e.target.value))}
              />
            </div>
            <div className="flex-col" style={{ flex: 1, gap: '4px' }}>
              <label className="text-label">Capacity Limit</label>
              <input
                type="number"
                required
                min="1"
                className="card"
                style={{ padding: '0 12px', height: '40px' }}
                value={capacity || ''}
                onChange={e => setCapacity(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex-col" style={{ gap: '4px' }}>
            <label className="text-label">Sale End Date</label>
            <input
              type="datetime-local"
              required
              className="card"
              style={{ padding: '0 12px', height: '40px' }}
              value={saleEndDate}
              onChange={e => setSaleEndDate(e.target.value)}
            />
          </div>

          <div className="flex-col" style={{ gap: '4px' }}>
            <label className="text-label">Included Performances</label>
            {hasPurchases && (
              <div className="card" style={{ padding: 'var(--space-sm)', borderColor: 'var(--color-warning-border)', backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning-text)', fontSize: '0.85rem' }}>
                ⚠️ This bundle has active purchases. Included events are locked to prevent data drift.
              </div>
            )}
            <div className="card" style={{ maxHeight: '200px', overflowY: 'auto', padding: 'var(--space-sm)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {events
                .filter(ev => ev.isTicketingEnabled)
                .map(ev => {
                  const isChecked = selectedEventIds.includes(ev.id);
                  return (
                    <label key={ev.id} className="flex-row" style={{ alignItems: 'center', gap: '8px', cursor: hasPurchases ? 'not-allowed' : 'pointer', fontSize: '0.875rem' }}>
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
                <span className="text-muted text-xs">No ticketing-enabled events found. Please enable ticketing on your events first.</span>
              )}
            </div>
          </div>

          <label className="flex-row" style={{ alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
            />
            <span className="text-label" style={{ margin: 0 }}>Active and visible to the public</span>
          </label>
        </form>
      </BaseModal>
    </div>
  );
}
