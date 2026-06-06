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
import './Ticketing.css';

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
    <div className="admin-view-container">
      <div className="admin-view-header flex-responsive">
        <div>
          <h1 className="text-display ticket-title">Ticketing Dashboard</h1>
          <p className="text-muted text-sm">Manage ticket sales, configure season bundles, and view check-in checklists.</p>
        </div>
        <div className="admin-view-actions">
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
      <div className="ticket-tabs">
        <button
          className={`btn ${activeTab === 'willcall' ? 'btn-primary' : 'btn-ghost'} ticket-tab-button`}
          onClick={() => setActiveTab('willcall')}
        >
          Concert Will Call
        </button>
        <button
          className={`btn ${activeTab === 'bundles' ? 'btn-primary' : 'btn-ghost'} ticket-tab-button`}
          onClick={() => setActiveTab('bundles')}
        >
          Season Bundles
        </button>
        <button
          className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-ghost'} ticket-tab-button`}
          onClick={() => setActiveTab('orders')}
        >
          Bundle Orders
        </button>
      </div>

      {activeTab === 'willcall' && (
        <>
          <div className="card ticket-info-box">
            <h3 className="ticket-info-title">
              ℹ️ Ticketing Instructions & Links
            </h3>
            <p className="text-muted text-sm ticket-info-description">
              Tickets are enabled on a per-performance basis. Go to the <Link to="/admin/events" className="ticket-link-strong">Events Dashboard</Link>, edit or create a Performance event, click the <strong>Tickets</strong> tab, and toggle <strong>Enable Online Ticket Sales</strong>.
            </p>
            <div className="ticket-info-links">
              <div>
                <strong>📢 Storefront URL:</strong>{' '}
                <a href="/tickets" target="_blank" rel="noopener noreferrer" className="ticket-link-primary">
                  {window.location.origin}/tickets
                </a>
                <span className="text-xs text-muted ticket-link-muted-note">(list of all active ticketed concerts & bundles)</span>
              </div>
              {selectedEventId && selectedEvent && (
                <div>
                  <strong>🔗 Direct Concert Ticket Link:</strong>{' '}
                  <a href={`/tickets/${selectedEventId}`} target="_blank" rel="noopener noreferrer" className="ticket-link-primary">
                    {window.location.origin}/tickets/{selectedEventId}
                  </a>
                  <span className="text-xs text-muted ticket-link-muted-note">(direct checkout page for {selectedEvent.title})</span>
                </div>
              )}
            </div>
          </div>

          <div className="card flex-responsive ticket-selector-card">
            <div className="ticket-selector-controls">
              <div className="ticket-selector-header">
                <label className="text-label">Select Performance</label>
                <label className="ticket-checkbox-label">
                  <input
                    type="checkbox"
                    checked={showPastAndInactive}
                    onChange={e => setShowPastAndInactive(e.target.checked)}
                    className="ticket-cursor-pointer"
                  />
                  <span>Include past & inactive performances</span>
                </label>
              </div>
              <select
                className="card ticket-select-full"
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
              <div className="ticket-stats-row">
                <div className="ticket-stat-box">
                  <span className="text-xs text-muted">TICKETS SOLD</span>
                  <span className="ticket-stat-value">
                    {totalTicketsSold} {eventCapacity > 0 ? `/ ${eventCapacity}` : ''}
                  </span>
                </div>
                <div className="ticket-stat-box ticket-stat-box-large">
                  <span className="text-xs text-muted">TICKET SALES</span>
                  <span className="ticket-stat-value">
                    ${(activePurchases.reduce((acc, p) => acc + (p.unitPriceCents * p.quantity), 0) / 100).toFixed(2)}
                  </span>
                </div>
                <div className="ticket-stat-box ticket-stat-box-large">
                  <span className="text-xs text-muted">FEES COLLECTED</span>
                  <span className="ticket-stat-value ticket-stat-value-muted">
                    ${(activePurchases.reduce((acc, p) => acc + p.feeCents, 0) / 100).toFixed(2)}
                  </span>
                </div>
                <div className="ticket-stat-box ticket-stat-box-large">
                  <span className="text-xs text-muted">TOTAL REVENUE</span>
                  <span className="ticket-stat-value ticket-stat-value-primary">
                    ${(activePurchases.reduce((acc, p) => acc + p.amountPaidCents, 0) / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {showWarning && (
            <div className="card ticket-warning-box">
              ⚠️ Warning: Sold tickets ({totalTicketsSold}) have reached or exceeded 90% of capacity ({eventCapacity}).
            </div>
          )}

          <AppCard title="Will Call Checklist">
            <div className="ticket-checklist-container">
              <div className="ticket-search-row flex-responsive">
                <div className="ticket-search-input-wrapper">
                  <input
                    type="text"
                    placeholder="Search buyer name or email..."
                    className="card ticket-search-input"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="ticket-sort-select-wrapper">
                  <select
                    className="card ticket-sort-select"
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
                <p className="text-muted admin-empty-state">No purchase records found.</p>
              ) : (
                <div className="ticket-table-container">
                  <table className="ticket-table w-full text-left">
                    <thead>
                      <tr className="ticket-table-header-row">
                        <th className="ticket-table-th">Buyer Name</th>
                        <th className="ticket-table-th">Email</th>
                        <th className="ticket-table-th">Sale Date</th>
                        <th className="ticket-table-th">Qty</th>
                        <th className="ticket-table-th">Amount Paid</th>
                        <th className="ticket-table-th">Status</th>
                        <th className="ticket-table-th-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPurchases.map(p => {
                        const isRefunded = p.status === 'refunded';
                        return (
                          <tr 
                            key={p.id} 
                            className="ticket-table-row" 
                            // @allow-inline-style - isRefunded text color/opacity
                            style={{ color: isRefunded ? 'var(--text-muted)' : 'inherit', opacity: isRefunded ? 0.6 : 1 }}
                          >
                            <td className="ticket-table-td-bold">
                              {p.buyerName}
                              {p.expand?.bundle && (
                                <span className="badge badge-success ticket-bundle-badge">
                                  Season Ticket: {p.expand.bundle.title}
                                </span>
                              )}
                            </td>
                            <td className="ticket-table-td">{p.buyerEmail}</td>
                            <td className="ticket-table-td">
                              {formatInTimezone(p.created, timezone, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            </td>
                            <td className="ticket-table-td">{p.quantity}</td>
                            <td className="ticket-table-td">${(p.amountPaidCents / 100).toFixed(2)}</td>
                            <td className="ticket-table-td">
                              <span className={`badge ${p.status === 'paid' ? 'badge-success' : 'badge-danger'} ticket-status-badge`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="ticket-table-td-right">
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
            <p className="text-muted admin-empty-state">No season bundles configured.</p>
          ) : (
            <div className="ticket-table-container">
              <table className="ticket-table-full w-full text-left">
                <thead>
                  <tr className="ticket-table-header-row">
                    <th className="ticket-table-th">Bundle Title</th>
                    <th className="ticket-table-th">Price</th>
                    <th className="ticket-table-th">Active</th>
                    <th className="ticket-table-th">Capacity Sold</th>
                    <th className="ticket-table-th">Sale End Date</th>
                    <th className="ticket-table-th">Included Events</th>
                    <th className="ticket-table-th-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bundles.map(b => {
                    const sold = getBundleSoldQty(b.id, b.events);
                    return (
                      <tr key={b.id} className="ticket-table-row">
                        <td className="ticket-table-td-bold">{b.title}</td>
                        <td className="ticket-table-td">${(b.priceCents / 100).toFixed(2)}</td>
                        <td className="ticket-table-td">
                          <span className={`badge ${b.isActive ? 'badge-success' : 'badge-danger'}`}>
                            {b.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="ticket-table-td">
                          <div className="ticket-progress-container">
                            <span>{sold} / {b.capacity} sold</span>
                            <div className="ticket-progress-bar-bg">
                              <div 
                                className="ticket-progress-bar-fill" 
                                // @allow-inline-style - progress bar width
                                style={{ width: `${Math.min(100, (sold / b.capacity) * 100)}%` }} 
                              />
                            </div>
                          </div>
                        </td>
                        <td className="ticket-table-td">
                          {formatInTimezone(b.saleEndDate, timezone, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </td>
                        <td className="ticket-events-td">
                          <div className="ticket-events-container">
                            {b.expand?.events?.map(ev => (
                              <span key={ev.id} className="badge badge-secondary ticket-event-badge">
                                {ev.title}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="ticket-actions-td">
                          <button
                            onClick={() => handleOpenEditModal(b)}
                            className="btn btn-secondary btn-sm ticket-edit-btn"
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
            <p className="text-muted admin-empty-state">No season pass orders found.</p>
          ) : (
            <div className="ticket-table-container">
              <table className="ticket-table-full w-full text-left">
                <thead>
                  <tr className="ticket-table-header-row">
                    <th className="ticket-table-th">Buyer Name</th>
                    <th className="ticket-table-th">Email</th>
                    <th className="ticket-table-th">Purchase Date</th>
                    <th className="ticket-table-th">Season Bundle</th>
                    <th className="ticket-table-th">Qty</th>
                    <th className="ticket-table-th">Amount Paid</th>
                    <th className="ticket-table-th">Status</th>
                    <th className="ticket-table-th-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bundleOrders.map(order => {
                    const isRefunded = order.status === 'refunded';
                    return (
                      <tr 
                        key={order.stripeSessionId} 
                        className="ticket-table-row" 
                        // @allow-inline-style - isRefunded text color/opacity
                        style={{ color: isRefunded ? 'var(--text-muted)' : 'inherit', opacity: isRefunded ? 0.6 : 1 }}
                      >
                        <td className="ticket-table-td-bold">{order.buyerName}</td>
                        <td className="ticket-table-td">{order.buyerEmail}</td>
                        <td className="ticket-table-td">
                          {formatInTimezone(order.created, timezone, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </td>
                        <td className="ticket-table-td-medium">{order.bundleTitle}</td>
                        <td className="ticket-table-td">{order.quantity}</td>
                        <td className="ticket-table-td">${(order.amountPaidCents / 100).toFixed(2)}</td>
                        <td className="ticket-table-td">
                          <span className={`badge ${order.status === 'paid' ? 'badge-success' : 'badge-danger'} ticket-status-badge`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="ticket-table-td-right">
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
          <div className="ticket-modal-footer">
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
        <form id="bundle-form" onSubmit={handleSaveBundle} className="ticket-form">
          {editingBundle && (
            <div className="card ticket-share-box">
              <strong>🔗 Share Season Pass Link:</strong>{' '}
              <a 
                href={`/tickets/bundle/${editingBundle.id}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="ticket-share-link"
              >
                {window.location.origin}/tickets/bundle/{editingBundle.id}
              </a>
            </div>
          )}

          <div className="form-field-group">
            <label className="text-label">Bundle Title</label>
            <input
              type="text"
              required
              placeholder="e.g. 2026-2027 Season Pass"
              className="card ticket-form-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div className="ticket-form-row flex-responsive">
            <div className="form-field-group ticket-flex-1">
              <label className="text-label">Price (USD)</label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                className="card ticket-form-input"
                value={price || ''}
                onChange={e => setPrice(Number(e.target.value))}
              />
            </div>
            <div className="form-field-group ticket-flex-1">
              <label className="text-label">Capacity Limit</label>
              <input
                type="number"
                required
                min="1"
                className="card ticket-form-input"
                value={capacity || ''}
                onChange={e => setCapacity(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="form-field-group">
            <label className="text-label">Sale End Date</label>
            <input
              type="datetime-local"
              required
              className="card ticket-form-input"
              value={saleEndDate}
              onChange={e => setSaleEndDate(e.target.value)}
            />
          </div>

          <div className="form-field-group">
            <label className="text-label">Included Performances</label>
            {hasPurchases && (
              <div className="card ticket-warning-text-box">
                ⚠️ This bundle has active purchases. Included events are locked to prevent data drift.
              </div>
            )}
            <div className="card ticket-events-list-box">
              {events
                .filter(ev => ev.isTicketingEnabled)
                .map(ev => {
                  const isChecked = selectedEventIds.includes(ev.id);
                  return (
                    <label 
                      key={ev.id} 
                      className="ticket-event-label" 
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
                <span className="text-muted text-xs">No ticketing-enabled events found. Please enable ticketing on your events first.</span>
              )}
            </div>
          </div>

          <div className="form-field-group">
            <label className="text-label">Public Details / Instructions</label>
            <textarea
              placeholder="e.g. Please bring a photo ID. This pass is non-transferable."
              className="card ticket-textarea"
              value={publicDetails}
              onChange={e => setPublicDetails(e.target.value)}
            />
          </div>

          <label className="ticket-active-label">
            <input
              type="checkbox"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
            />
            <span className="text-label ticket-label-no-margin">Active and visible to the public</span>
          </label>
        </form>
      </BaseModal>
    </div>
  );
}
