import React, { useState } from 'react';
import { useVenues } from '../../hooks/useVenues';
import { checkVenueDependencies, type Venue } from '../../services/venueService';
import { AppCard } from '../../components/common/AppCard';
import { Button, Spinner, FormField, Input, EmptyState } from '../../components/ui';
import { useDialog } from '../../contexts/DialogContext';

export default function VenuesView() {
  const dialog = useDialog();
  const { venues, isLoading, addVenue, editVenue, removeVenue } = useVenues();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [rowCountsStr, setRowCountsStr] = useState('');
  const [address, setAddress] = useState('');
  const [isOpenSeating, setIsOpenSeating] = useState(false);

  const handleEdit = (v: Venue) => {
    setEditingId(v.id);
    setName(v.name);
    setRowCountsStr(v.rowCounts ? v.rowCounts.join(', ') : '');
    setAddress(v.address || '');
    setIsOpenSeating(v.isOpenSeating || false);
    setIsAdding(true);
  };

  const resetForm = () => {
    setName('');
    setRowCountsStr('');
    setAddress('');
    setIsOpenSeating(false);
    setEditingId(null);
    setIsAdding(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const rowCounts = isOpenSeating ? [] : rowCountsStr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));

    try {
      if (editingId) {
        await editVenue(editingId, { name, rowCounts, address, isOpenSeating });
      } else {
        await addVenue({ name, rowCounts, address, isOpenSeating });
      }
      resetForm();
    } catch {
      await dialog.showMessage({
        title: 'Could Not Save Venue',
        message: 'Error saving venue',
        variant: 'danger',
      });
    }
  };

  const handleDelete = async (venue: Venue) => {
    const isLinked = await checkVenueDependencies(venue.id);
    if (isLinked) {
      await dialog.showMessage({
        title: 'Delete Prevented',
        message: 'This venue is currently linked to scheduled events and cannot be deleted.',
        variant: 'danger',
      });
      return;
    }

    const shouldDelete = await dialog.confirm({
      title: 'Delete Venue',
      message: `Delete ${venue.name}?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!shouldDelete) return;

    await removeVenue(venue.id);
  };

  if (isLoading && venues.length === 0) return (
    <div className="container pt-8 text-center">
      <Spinner size="small" /> Loading venues...
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            Venue Templates
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Configure stage address information, row capacities and default layouts for seating charts.
          </p>
        </div>
        {!isAdding && (
          <div className="flex-shrink-0 sm:mt-1">
            <Button onClick={() => setIsAdding(true)} variant="primary">+ New Venue</Button>
          </div>
        )}
      </div>

      {isAdding && (
        <AppCard title={editingId ? 'Edit Venue' : 'Create New Venue'}>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <FormField label="Venue Name" required>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Main Sanctuary"
              />
            </FormField>

            <FormField label="Address">
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 123 Main St, City, State"
              />
            </FormField>

            <div className="flex flex-row items-center gap-2 py-1">
              <input
                type="checkbox"
                id="isOpenSeating"
                checked={isOpenSeating}
                onChange={(e) => setIsOpenSeating(e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded border-border text-primary focus:ring-primary/25"
              />
              <label htmlFor="isOpenSeating" className="text-sm font-medium text-text cursor-pointer select-none">
                Open Seating (No assigned seats)
              </label>
            </div>

            {!isOpenSeating && (
              <FormField
                label="Row Capacities (Comma separated)"
                required
                helpText="Enter the number of seats for each row, starting from the front."
              >
                <Input
                  value={rowCountsStr}
                  onChange={(e) => setRowCountsStr(e.target.value)}
                  required
                  placeholder="e.g. 12, 15, 18, 20"
                />
              </FormField>
            )}

            <div className="mt-2 flex flex-col justify-end gap-3 md:flex-row">
              <Button variant="ghost" onClick={resetForm}>Cancel</Button>
              <Button type="submit" variant="primary">Save Template</Button>
            </div>
          </form>
        </AppCard>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-6">
        {venues.map(v => (
          <AppCard
            key={v.id}
            onClick={() => handleEdit(v)}
            className="h-full cursor-pointer hover:border-primary/50 hover:bg-primary-light/5 hover:shadow-md transition-all duration-200"
          >
            <h3 className="text-xl font-bold text-text border-b border-border pb-2 mb-3">
              {v.name}
            </h3>
            <div className="flex-1 flex flex-col gap-1.5">
              {v.address && (
                <div className="text-body">
                  <span className="text-muted">Address:</span>{' '}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {v.address}
                  </a>
                </div>
              )}
              {v.isOpenSeating ? (
                <div className="text-body text-primary">
                  <strong>Open Seating</strong>
                </div>
              ) : (
                <>
                  <div className="text-body">
                    <span className="text-muted">Rows:</span> {v.rowCounts?.length || 0}
                  </div>
                  <div className="text-body">
                    <span className="text-muted">Total Seats:</span> {v.rowCounts?.reduce((a, b) => a + b, 0) || 0}
                  </div>
                  <div className="text-muted text-xs">
                    Layout: {v.rowCounts?.join(' | ') || 'None'}
                  </div>
                </>
              )}
            </div>
            <div className="mt-4 flex flex-row gap-2.5 w-full">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(v);
                }}
              >
                Edit
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={(event) => {
                  event.stopPropagation();
                  handleDelete(v);
                }}
              >
                Delete
              </Button>
            </div>
          </AppCard>
        ))}
      </div>

      {venues.length === 0 && !isAdding && (
        <AppCard>
          <EmptyState
            icon="🏛️"
            title="No Venue Templates"
            description="Create venue templates to configure seating charts and capacities."
            action={
              <Button onClick={() => setIsAdding(true)} variant="primary">
                + New Venue
              </Button>
            }
          />
        </AppCard>
      )}
    </div>
  );
}
