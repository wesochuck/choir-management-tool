import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDialog } from '../../../contexts/DialogContext';
import { ticketService, type TicketBundle } from '../../../services/ticketService';
import { queryKeys } from '../../../lib/queryKeys';
import { formatInTimezone } from '../../../lib/timezone';
import { Modal, FormField, Input, Textarea, Button } from '../../../components/ui';
import { useTicketingEvents, TICKETING_REFRESH_INTERVAL_MS } from './ticketingQueries';

interface BundleFormModalProps {
  isOpen: boolean;
  bundle: TicketBundle | null;
  onClose: () => void;
}

export default function BundleFormModal({ isOpen, bundle, onClose }: BundleFormModalProps) {
  const dialog = useDialog();
  const queryClient = useQueryClient();

  const { events, timezone } = useTicketingEvents({ includeMissingFromPurchases: false });

  const purchasesQuery = useQuery({
    queryKey: queryKeys.ticketing.allPurchases(),
    queryFn: () => ticketService.getAllPurchases(),
    staleTime: 30_000,
    enabled: isOpen,
    refetchInterval: isOpen ? TICKETING_REFRESH_INTERVAL_MS : undefined,
  });

  const [bundleTitle, setBundleTitle] = useState('');
  const [price, setPrice] = useState(0);
  const [capacity, setCapacity] = useState(0);
  const [saleEndDate, setSaleEndDate] = useState('');
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const selectedEventIdsSet = useMemo(() => new Set(selectedEventIds), [selectedEventIds]);
  const [bundleIsActive, setBundleIsActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publicDetails, setPublicDetails] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (bundle) {
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
      } else {
        setBundleTitle('');
        setPrice(0);
        setCapacity(0);
        setSaleEndDate('');
        setSelectedEventIds([]);
        setBundleIsActive(false);
        setPublicDetails('');
      }
    }
  }, [isOpen, bundle]);

  // Auto-populate saleEndDate to 11:59 PM of the chronologically first event in creation mode
  useEffect(() => {
    if (isOpen && !bundle && selectedEventIds.length > 0) {
      const selectedConcerts = events.filter((e) => selectedEventIdsSet.has(e.id));
      if (selectedConcerts.length > 0) {
        selectedConcerts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const firstEventDate = new Date(selectedConcerts[0].date);
        const year = firstEventDate.getFullYear();
        const month = String(firstEventDate.getMonth() + 1).padStart(2, '0');
        const day = String(firstEventDate.getDate()).padStart(2, '0');
        setSaleEndDate(`${year}-${month}-${day}T23:59`);
      }
    }
  }, [selectedEventIds, selectedEventIdsSet, isOpen, bundle, events]);

  const saveBundleMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      ticketService.saveBundle(data as Parameters<typeof ticketService.saveBundle>[0]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ticketing.all });
    },
  });

  const getBundleSoldQty = (bundleId: string, bundleEvents: string[]) => {
    if (!bundleEvents || bundleEvents.length === 0) return 0;
    const firstEventId = bundleEvents[0];
    const allPurchases = purchasesQuery.data ?? [];
    const matched = allPurchases.filter(
      (p) => p.bundle === bundleId && p.event === firstEventId && p.status === 'paid'
    );
    return matched.reduce((acc, curr) => acc + curr.quantity, 0);
  };

  const hasPurchases = bundle ? getBundleSoldQty(bundle.id, bundle.events) > 0 : false;

  const handleSaveBundle = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    if (
      !bundleTitle.trim() ||
      price <= 0 ||
      capacity <= 0 ||
      selectedEventIds.length === 0 ||
      !saleEndDate
    ) {
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
        publicDetails: publicDetails.trim(),
      };

      if (bundle) {
        data.id = bundle.id;
      }
      await saveBundleMutation.mutateAsync(data);
      dialog.showToast(bundle ? 'Bundle updated successfully.' : 'Bundle created successfully.');
      onClose();
    } catch (err: unknown) {
      console.error(err);
      dialog.showToast('Failed to save bundle.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={bundle ? 'Edit Season Bundle' : 'Create Season Bundle'}
      maxWidth="600px"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={saving}
            onClick={() => handleSaveBundle()}
            className="w-full sm:w-auto"
          >
            {saving ? 'Saving...' : 'Save Bundle'}
          </Button>
        </div>
      }
    >
      <form id="bundle-form" onSubmit={handleSaveBundle} className="flex flex-col gap-4">
        {bundle && (
          <div className="border-primary rounded border-l-4 bg-[rgba(74,124,89,0.05)] p-2 text-sm">
            <strong>🔗 Share Season Pass Link:</strong>{' '}
            <a
              href={`/tickets/bundle/${bundle.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary break-all underline"
            >
              {window.location.origin}/tickets/bundle/{bundle.id}
            </a>
          </div>
        )}

        <FormField label="Bundle Title" required>
          <Input
            type="text"
            required
            placeholder="e.g. 2026-2027 Season Pass"
            className="focus:ring-primary block w-full shadow-sm transition-colors outline-none focus:ring-1"
            value={bundleTitle}
            onChange={(e) => setBundleTitle(e.target.value)}
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
                className="focus:ring-primary block w-full shadow-sm transition-colors outline-none focus:ring-1"
                value={price || ''}
                onChange={(e) => setPrice(Number(e.target.value))}
              />
            </FormField>
          </div>
          <div className="min-w-[150px] flex-1">
            <FormField label="Capacity Limit" required>
              <Input
                type="number"
                required
                min="1"
                className="focus:ring-primary block w-full shadow-sm transition-colors outline-none focus:ring-1"
                value={capacity || ''}
                onChange={(e) => setCapacity(Number(e.target.value))}
              />
            </FormField>
          </div>
        </div>

        <FormField label="Sale End Date" required>
          <Input
            type="datetime-local"
            required
            className="focus:ring-primary block w-full shadow-sm transition-colors outline-none focus:ring-1"
            value={saleEndDate}
            onChange={(e) => setSaleEndDate(e.target.value)}
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
              .filter((ev) => ev.isTicketingEnabled)
              .map((ev) => {
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
                      className="text-primary focus:ring-primary/25 rounded border-slate-300"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedEventIds([...selectedEventIds, ev.id]);
                        } else {
                          setSelectedEventIds(selectedEventIds.filter((id) => id !== ev.id));
                        }
                      }}
                    />
                    <span>
                      {ev.title} (
                      {formatInTimezone(ev.date, timezone, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      )
                    </span>
                  </label>
                );
              })}
            {events.filter((ev) => ev.isTicketingEnabled).length === 0 && (
              <span className="text-xs font-medium text-slate-400">
                No ticketing-enabled events found. Please enable ticketing on your events first.
              </span>
            )}
          </div>
        </FormField>

        <FormField label="Public Details / Instructions">
          <Textarea
            placeholder="e.g. Please bring a photo ID. This pass is non-transferable."
            value={publicDetails}
            onChange={(e) => setPublicDetails(e.target.value)}
          />
        </FormField>

        <label className="mt-2 flex cursor-pointer flex-row items-center gap-2">
          <input
            type="checkbox"
            checked={bundleIsActive}
            className="text-primary focus:ring-primary/25 rounded border-slate-300"
            onChange={(e) => setBundleIsActive(e.target.checked)}
          />
          <span className="text-sm font-semibold text-slate-800">
            Active and visible to the public
          </span>
        </label>
      </form>
    </Modal>
  );
}
