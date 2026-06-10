import React, { useState } from 'react';
import { useVenues } from '../../hooks/useVenues';
import { checkVenueDependencies, type Venue } from '../../services/venueService';
import { AppCard } from '../../components/common/AppCard';
import { Button } from '../../components/ui/Button/Button';
import { Spinner } from '../../components/ui/Spinner/Spinner';
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
    <div className="flex-col gap-8 py-8">
       <div className="flex flex-col items-center justify-between md:flex-row">
        <h1 className="text-display m-0">Venue Templates</h1>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} variant="primary">+ New Venue</Button>
        )}
      </div>

      {isAdding && (
        <AppCard title={editingId ? 'Edit Venue' : 'Create New Venue'}>
          <form onSubmit={handleSave} className="flex-col gap-4">
            <div className="flex-col gap-1">
              <label className="text-label">Venue Name</label>
              <input 
                value={name} onChange={(e) => setName(e.target.value)} required
                placeholder="e.g. Main Sanctuary"
                className="card h-11 w-full px-3"
              />
            </div>
            <div className="flex-col gap-1">
              <label className="text-label">Address</label>
              <input 
                value={address} onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 123 Main St, City, State"
                className="card h-11 w-full px-3"
              />
            </div>
            <div className="flex-row items-center gap-1">
              <input 
                type="checkbox"
                id="isOpenSeating"
                checked={isOpenSeating} onChange={(e) => setIsOpenSeating(e.target.checked)}
              />
              <label htmlFor="isOpenSeating" className="text-label m-0">Open Seating (No assigned seats)</label>
            </div>
            {!isOpenSeating && (
              <div className="flex-col gap-1">
                <label className="text-label">Row Capacities (Comma separated)</label>
                <input 
                  value={rowCountsStr} onChange={(e) => setRowCountsStr(e.target.value)} required
                  placeholder="e.g. 12, 15, 18, 20"
                  className="card h-11 w-full px-3"
                />
                <p className="text-muted text-sm">Enter the number of seats for each row, starting from the front.</p>
              </div>
            )}
            <div className="flex flex-col justify-end gap-4 md:flex-row">
              <Button variant="ghost" onClick={resetForm}>Cancel</Button>
              <Button type="submit" variant="primary">Save Template</Button>
            </div>
          </form>
        </AppCard>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-6">
        {venues.map(v => (
          <AppCard key={v.id} title={v.name} className="h-full">
            <div className="flex-1 flex-col gap-1">
              {v.address && (
                <div className="text-body">
                  <span className="text-muted">Address:</span>{' '}
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.address)}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
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
            <div className="mt-4 flex flex-col gap-4 md:flex-row">
              <Button variant="ghost" className="flex-1" onClick={() => handleEdit(v)}>Edit</Button>
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
        <AppCard className="p-8 text-center">
          <p className="text-muted">No venue templates created yet.</p>
        </AppCard>
      )}
    </div>
  );
}
