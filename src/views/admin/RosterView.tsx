import { useState } from 'react';
import { useProfiles } from '../../hooks/useProfiles';
import { RosterTable } from '../../components/admin/RosterTable';
import { SingerModal } from '../../components/admin/SingerModal';
import { RosterSummary } from '../../components/admin/RosterSummary';
import type { Profile } from '../../services/profileService';

export default function RosterView() {
  const { profiles, isLoading, error, filters, setFilter, addProfile, editProfile } = useProfiles();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  const handleEdit = (profile: Profile) => {
    setEditingProfile(profile);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingProfile(null);
    setIsModalOpen(true);
  };

  const handleSave = async (data: Partial<Profile>) => {
    if (editingProfile) {
      await editProfile(editingProfile.id, data);
    } else {
      await addProfile(data);
    }
  };

  if (isLoading && profiles.length === 0) return <div style={{ padding: '20px' }}>Loading roster...</div>;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;

  return (
    <div style={{ padding: '24px', backgroundColor: '#f0f4f8', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Global Roster</h1>
        <button 
          onClick={handleAdd}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#3182ce', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          + Add Singer
        </button>
      </div>

      <RosterSummary profiles={profiles} />

      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
        <select 
          value={filters.voicePart} 
          onChange={(e) => setFilter('voicePart', e.target.value)}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e0' }}
        >
          <option value="">All Voice Parts</option>
          {['S1', 'S2', 'A1', 'A2', 'T1', 'T2', 'B1', 'B2'].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select 
          value={filters.status} 
          onChange={(e) => setFilter('status', e.target.value)}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e0' }}
        >
          <option value="">All Statuses</option>
          <option value="Active (Current)">Active (Current)</option>
          <option value="Active (Future)">Active (Future)</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      <RosterTable profiles={profiles} onEdit={handleEdit} />

      <SingerModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSave} 
        initialData={editingProfile} 
      />
    </div>
  );
}
