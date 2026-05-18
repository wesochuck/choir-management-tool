import React, { useState } from 'react';
import { useVenues } from '../../hooks/useVenues';
import { checkVenueDependencies, type Venue } from '../../services/venueService';
import { AppCard } from '../../components/common/AppCard';
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

  if (isLoading && venues.length === 0) return <div className="container" style={{ textAlign: 'center', paddingTop: 'var(--space-xl)' }}>Loading venues...</div>;

  return (
    <div className="flex-col" style={{ gap: 'var(--space-xl)', padding: 'var(--space-xl) 0' }}>
       <div className="flex-responsive" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="text-display" style={{ margin: 0 }}>Venue Templates</h1>
        {!isAdding && (
          <button onClick={() => setIsAdding(true)} className="btn btn-primary">+ New Venue</button>
        )}
      </div>

      {isAdding && (
        <AppCard title={editingId ? 'Edit Venue' : 'Create New Venue'}>
          <form onSubmit={handleSave} className="flex-col" style={{ gap: 'var(--space-md)' }}>
            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <label className="text-label">Venue Name</label>
              <input 
                value={name} onChange={(e) => setName(e.target.value)} required
                placeholder="e.g. Main Sanctuary"
                className="card"
                style={{ width: '100%', padding: '0 12px', height: '44px' }}
              />
            </div>
            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <label className="text-label">Address</label>
              <input 
                value={address} onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 123 Main St, City, State"
                className="card"
                style={{ width: '100%', padding: '0 12px', height: '44px' }}
              />
            </div>
            <div className="flex-row" style={{ gap: 'var(--space-xs)', alignItems: 'center' }}>
              <input 
                type="checkbox"
                id="isOpenSeating"
                checked={isOpenSeating} onChange={(e) => setIsOpenSeating(e.target.checked)}
              />
              <label htmlFor="isOpenSeating" className="text-label" style={{ margin: 0 }}>Open Seating (No assigned seats)</label>
            </div>
            {!isOpenSeating && (
              <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                <label className="text-label">Row Capacities (Comma separated)</label>
                <input 
                  value={rowCountsStr} onChange={(e) => setRowCountsStr(e.target.value)} required
                  placeholder="e.g. 12, 15, 18, 20"
                  className="card"
                  style={{ width: '100%', padding: '0 12px', height: '44px' }}
                />
                <p className="text-muted text-sm">Enter the number of seats for each row, starting from the front.</p>
              </div>
            )}
            <div className="flex-responsive" style={{ justifyContent: 'flex-end', gap: 'var(--space-md)' }}>
              <button type="button" onClick={resetForm} className="btn btn-ghost">Cancel</button>
              <button type="submit" className="btn btn-primary">Save Template</button>
            </div>
          </form>
        </AppCard>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-lg)' }}>
        {venues.map(v => (
          <AppCard key={v.id} title={v.name}>
            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              {v.address && (
                <div className="text-body">
                  <span className="text-muted">Address:</span>{' '}
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.address)}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                    {v.address}
                  </a>
                </div>
              )}
              {v.isOpenSeating ? (
                <div className="text-body" style={{ color: 'var(--primary)' }}>
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
            <div className="flex-responsive" style={{ gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
              <button onClick={() => handleEdit(v)} className="btn btn-ghost expanded-hit-area" style={{ flex: 1 }}>Edit</button>
              <button 
                onClick={(event) => {
                  event.stopPropagation();
                  handleDelete(v);
                }}
                className="btn btn-danger" 
                style={{ flex: 1 }}
              >
                Delete
              </button>
            </div>
          </AppCard>
        ))}
      </div>

      {venues.length === 0 && !isAdding && (
        <AppCard style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
          <p className="text-muted">No venue templates created yet.</p>
        </AppCard>
      )}
    </div>
  );
}
