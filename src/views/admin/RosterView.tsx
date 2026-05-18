import { useState } from 'react';
import { useProfiles } from '../../hooks/useProfiles';
import { RosterTable } from '../../components/admin/RosterTable';
import { SingerModal } from '../../components/admin/SingerModal';
import { RosterSummary } from '../../components/admin/RosterSummary';
import type { Profile, ProfileInput } from '../../services/profileService';
import { RosterImportModal } from '../../components/admin/RosterImportModal';


export default function RosterView() {
  const { profiles, isLoading, error, filters, setFilter, addProfile, editProfile, removeProfile, refresh } = useProfiles();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);


  const handleEdit = (profile: Profile) => {
    setEditingProfile(profile);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingProfile(null);
    setIsModalOpen(true);
  };

  const handleSave = async (data: ProfileInput) => {
    if (editingProfile) {
      await editProfile(editingProfile.id, data);
    } else {
      await addProfile(data);
    }
  };

  const handleDelete = async (profile: Profile) => {
    await removeProfile(profile.id);
  };

  if (isLoading && profiles.length === 0) return <div style={{ padding: '20px' }}>Loading roster...</div>;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;

  return (
    <div className="flex-col" style={{ gap: 'var(--space-xl)', padding: 'var(--space-xl) 0' }}>
      <div className="flex-responsive" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="text-display" style={{ margin: 0 }}>Global Roster</h1>
        <div className="flex-row" style={{ gap: 'var(--space-md)' }}>
          <button onClick={() => setIsImportModalOpen(true)} className="btn btn-secondary">Import CSV</button>
          <button onClick={handleAdd} className="btn btn-primary">+ Add Singer</button>
        </div>
      </div>

      <RosterSummary profiles={profiles} />

      <div className="flex-responsive" style={{ gap: 'var(--space-md)' }}>
        <select 
          value={filters.voicePart} 
          onChange={(e) => setFilter('voicePart', e.target.value)}
          className="card"
          style={{ padding: '0 12px', height: '44px', width: '200px' }}
        >
          <option value="">All Voice Parts</option>
          {['S1', 'S2', 'A1', 'A2', 'T1', 'T2', 'B1', 'B2'].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select 
          value={filters.status} 
          onChange={(e) => setFilter('status', e.target.value)}
          className="card"
          style={{ padding: '0 12px', height: '44px', width: '200px' }}
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
        onDelete={handleDelete}
        initialData={editingProfile} 
      />

      <RosterImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={refresh}
      />
    </div>
  );
}
