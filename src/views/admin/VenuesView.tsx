import { useState } from 'react';
import { useVenues } from '../../hooks/useVenues';
import type { Venue } from '../../services/venueService';

export default function VenuesView() {
  const { venues, isLoading, addVenue, editVenue, removeVenue } = useVenues();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [rowCountsStr, setRowCountsStr] = useState('');

  const handleEdit = (v: Venue) => {
    setEditingId(v.id);
    setName(v.name);
    setRowCountsStr(v.rowCounts.join(', '));
    setIsAdding(true);
  };

  const resetForm = () => {
    setName('');
    setRowCountsStr('');
    setEditingId(null);
    setIsAdding(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const rowCounts = rowCountsStr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    
    try {
      if (editingId) {
        await editVenue(editingId, { name, rowCounts });
      } else {
        await addVenue({ name, rowCounts });
      }
      resetForm();
    } catch (err) {
      alert("Error saving venue");
    }
  };

  if (isLoading && venues.length === 0) return <div style={{ padding: '20px' }}>Loading venues...</div>;

  return (
    <div style={{ padding: '24px', backgroundColor: '#f0f4f8', minHeight: '100vh' }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Venue Templates</h1>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            style={{ padding: '10px 20px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            + New Venue
          </button>
        )}
      </div>

      {isAdding && (
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
          <h2>{editingId ? 'Edit Venue' : 'Create New Venue'}</h2>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Venue Name</label>
              <input 
                value={name} onChange={(e) => setName(e.target.value)} required
                placeholder="e.g. Main Sanctuary"
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e0' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Row Capacities (Comma separated)</label>
              <input 
                value={rowCountsStr} onChange={(e) => setRowCountsStr(e.target.value)} required
                placeholder="e.g. 12, 15, 18, 20 (Row 1 to Back Row)"
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e0' }}
              />
              <p style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>Enter the number of seats for each row, starting from the front.</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={resetForm} style={{ padding: '10px 20px', borderRadius: '4px', border: 'none' }}>Cancel</button>
              <button type="submit" style={{ padding: '10px 20px', borderRadius: '4px', backgroundColor: '#38a169', color: 'white', border: 'none', fontWeight: 'bold' }}>
                Save Template
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {venues.map(v => (
          <div key={v.id} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 8px 0' }}>{v.name}</h3>
            <div style={{ fontSize: '14px', color: '#4a5568' }}>
              <strong>Rows:</strong> {v.rowCounts.length}
            </div>
            <div style={{ fontSize: '14px', color: '#4a5568', marginTop: '4px' }}>
              <strong>Total Seats:</strong> {v.rowCounts.reduce((a, b) => a + b, 0)}
            </div>
            <div style={{ marginTop: '12px', fontSize: '12px', color: '#718096' }}>
              Layout: {v.rowCounts.join(' | ')}
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button onClick={() => handleEdit(v)} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e0', cursor: 'pointer' }}>Edit</button>
              <button onClick={() => { if(confirm('Delete venue?')) removeVenue(v.id) }} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #fed7d7', color: '#c53030', cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {venues.length === 0 && !isAdding && (
        <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'white', borderRadius: '12px', color: '#718096' }}>
          No venue templates created yet.
        </div>
      )}
    </div>
  );
}
