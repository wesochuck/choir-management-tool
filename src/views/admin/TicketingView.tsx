import { useEffect, useState } from 'react';
import { ticketService, type TicketPurchase } from '../../services/ticketService';
import { pb } from '../../lib/pocketbase';
import type { Event } from '../../services/eventService';
import { AppCard } from '../../components/common/AppCard';
import { useDialog } from '../../contexts/DialogContext';
import { fetchChoirTimezone, formatInTimezone } from '../../lib/timezone';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function TicketingView() {
  useDocumentTitle('Ticketing');
  const dialog = useDialog();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [purchases, setPurchases] = useState<TicketPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');

  useEffect(() => {
    async function loadEvents() {
      try {
        const [res, tz] = await Promise.all([
          pb.collection('events').getFullList<Event>({
            filter: 'isTicketingEnabled = true',
            sort: '-date'
          }),
          fetchChoirTimezone().catch(() => 'America/New_York')
        ]);
        setEvents(res);
        setTimezone(tz);
        if (res.length > 0) setSelectedEventId(res[0].id);
      } catch (err) {
        console.error(err);
      }
    }
    loadEvents();
  }, []);

  useEffect(() => {
    async function loadPurchases() {
      if (!selectedEventId) return;
      setLoading(true);
      try {
        const res = await ticketService.getPurchasesForEvent(selectedEventId);
        setPurchases(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadPurchases();
  }, [selectedEventId]);

  const activePurchases = purchases.filter(p => p.status === 'paid');
  const totalTicketsSold = activePurchases.reduce((acc, p) => acc + p.quantity, 0);

  const selectedEvent = events.find(e => e.id === selectedEventId);
  const capacity = selectedEvent?.ticketCapacity || 0;
  const showWarning = capacity > 0 && totalTicketsSold >= (capacity * 0.9);

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
      const res = await ticketService.getPurchasesForEvent(selectedEventId);
      setPurchases(res);
    } catch {
      await dialog.showMessage({
        title: 'Refund Failed',
        message: 'Could not process the refund. Please verify the Stripe Dashboard.',
        variant: 'danger'
      });
    }
  };

  const handleExportCSV = () => {
    if (activePurchases.length === 0) {
      dialog.showToast('No active purchases to export.');
      return;
    }
    const headers = ["ID", "Buyer Name", "Buyer Email", "Quantity", "Paid", "Status", "Created"];
    const rows = activePurchases.map(p => [
      p.id,
      p.buyerName,
      p.buyerEmail,
      p.quantity,
      (p.amountPaidCents / 100).toFixed(2),
      p.status,
      p.created
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

  const filteredPurchases = purchases.filter(p =>
    p.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.buyerEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-col" style={{ gap: 'var(--space-lg)', padding: 'var(--space-xl) 0' }}>
      <div className="flex-responsive" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-display" style={{ margin: 0 }}>Ticketing Dashboard</h1>
          <p className="text-muted text-sm">Manage ticket sales, view Will Call checklist, and process refunds.</p>
        </div>
        {selectedEventId && (
          <button
            onClick={handleExportCSV}
            className="btn btn-primary"
          >
            Export Will Call CSV
          </button>
        )}
      </div>

      <div className="card flex-responsive" style={{ padding: 'var(--space-md)', gap: 'var(--space-md)', alignItems: 'center', backgroundColor: 'var(--neutral-bg)' }}>
        <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
          <label className="text-label">Select Performance</label>
          <select
            className="card"
            style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
            value={selectedEventId}
            onChange={e => setSelectedEventId(e.target.value)}
          >
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>
                {ev.title} ({formatInTimezone(ev.date, timezone, { month: 'short', day: 'numeric', year: 'numeric' })})
              </option>
            ))}
            {events.length === 0 && (
              <option value="">No ticketing-enabled events</option>
            )}
          </select>
        </div>

        {selectedEvent && (
          <div className="flex-row" style={{ gap: 'var(--space-xl)', padding: '0 var(--space-md)' }}>
            <div className="flex-col" style={{ gap: 2 }}>
              <span className="text-xs text-muted">TICKETS SOLD</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                {totalTicketsSold} {capacity > 0 ? `/ ${capacity}` : ''}
              </span>
            </div>
            <div className="flex-col" style={{ gap: 2 }}>
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
          ⚠️ Warning: Sold tickets ({totalTicketsSold}) have reached or exceeded 90% of capacity ({capacity}).
        </div>
      )}

      <AppCard title="Will Call Checklist">
        <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
          <input
            type="text"
            placeholder="Search buyer name or email..."
            className="card"
            style={{ width: '100%', padding: '0 12px', height: '40px', border: '1px solid var(--border)' }}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />

          {loading ? (
            <p className="text-muted">Loading registrations...</p>
          ) : filteredPurchases.length === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-lg) 0' }}>No purchase records found.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="w-full text-left" style={{ borderCollapse: 'collapse', width: '100%', minWidth: '600px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    <th style={{ padding: '12px 8px' }}>Buyer Name</th>
                    <th style={{ padding: '12px 8px' }}>Email</th>
                    <th style={{ padding: '12px 8px' }}>Qty</th>
                    <th style={{ padding: '12px 8px' }}>Amount Paid</th>
                    <th style={{ padding: '12px 8px' }}>Status</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPurchases.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
                      <td style={{ padding: '12px 8px', fontWeight: 600 }}>{p.buyerName}</td>
                      <td style={{ padding: '12px 8px' }}>{p.buyerEmail}</td>
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
                            onClick={() => handleRefund(p.id)}
                            className="btn btn-danger btn-sm"
                          >
                            Refund
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AppCard>
    </div>
  );
}
