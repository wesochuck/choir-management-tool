import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProfiles } from '../../hooks/useProfiles';
import { RosterTable } from '../../components/admin/RosterTable';
import { SingerModal } from '../../components/admin/SingerModal';
import { RosterSummary } from '../../components/admin/RosterSummary';
import type { Profile, ProfileInput } from '../../services/profileService';
import { RosterImportModal } from '../../components/admin/RosterImportModal';
import { exportToCSV } from '../../services/profileService';
import { getVoiceParts, settingsService } from '../../services/settingsService';


export default function RosterView() {
  const { profiles, unfilteredByVoicePartProfiles, isLoading, error, filters, setFilter, addProfile, editProfile, removeProfile, refresh } = useProfiles();
  const [searchParams] = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [voiceParts, setVoiceParts] = useState<string[]>(['S1', 'S2', 'A1', 'A2', 'T1', 'T2', 'B1', 'B2']);

  const initialVoicePart = searchParams.get('voicePart') || '';

  useEffect(() => {
    getVoiceParts().then(parts => {
      if (parts && parts.length > 0) {
        setVoiceParts(parts.map(p => p.label));
      }
    });

    settingsService.getRosterSettings().then(settings => {
      if (settings && settings.defaultStatus !== undefined) {
        setFilter('status', settings.defaultStatus);
      }
    }).catch(err => {
      console.error('Failed to load roster settings:', err);
    });
  }, []);

  useEffect(() => {
    if (initialVoicePart) {
      setFilter('voicePart', initialVoicePart);
    }
  }, [initialVoicePart]);



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

  const handleExportCSV = () => {
    const csvContent = exportToCSV(profiles);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'choir_roster_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading && profiles.length === 0) return <div style={{ padding: '20px' }}>Loading roster...</div>;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;

  return (
    <div className="flex-col" style={{ gap: 'var(--space-xl)', padding: 'var(--space-xl) 0' }}>
      <div className="flex-responsive" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="text-display" style={{ margin: 0 }}>Global Roster</h1>
        <div className="flex-row" style={{ gap: 'var(--space-md)' }}>
          <button onClick={handleExportCSV} className="btn btn-secondary">Export Roster</button>
          <button onClick={() => setIsImportModalOpen(true)} className="btn btn-secondary">Import CSV</button>
          <button onClick={handleAdd} className="btn btn-primary">+ Add Singer</button>
        </div>
      </div>

      <RosterSummary 
        profiles={unfilteredByVoicePartProfiles} 
        selectedVoicePart={filters.voicePart}
        onVoicePartToggle={(part) => setFilter('voicePart', filters.voicePart === part ? '' : part)}
      />

      <div className="flex-responsive" style={{ gap: 'var(--space-md)', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '240px', maxWidth: '400px' }}>
          <input
            type="text"
            placeholder="Search by name..."
            value={filters.name || ''}
            onChange={(e) => setFilter('name', e.target.value)}
            className="card"
            style={{
              padding: '0 40px 0 36px',
              height: '44px',
              width: '100%',
              fontSize: '15px'
            }}
          />
          <span style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </span>
          {filters.name && (
            <button
              onClick={() => setFilter('name', '')}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
                borderRadius: '50%',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              title="Clear search"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>

        <select 
          value={filters.voicePart} 
          onChange={(e) => setFilter('voicePart', e.target.value)}
          className="card"
          style={{ padding: '0 12px', height: '44px', width: '200px' }}
        >
          <option value="">All Voice Parts</option>
          <optgroup label="Sections">
            <option value="S">Sopranos (S1, S2)</option>
            <option value="A">Altos (A1, A2)</option>
            <option value="T">Tenors (T1, T2)</option>
            <option value="B">Basses (B1, B2)</option>
          </optgroup>
          <optgroup label="Individual Parts">
            {voiceParts.map(v => <option key={v} value={v}>{v}</option>)}
          </optgroup>
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

        {(filters.name || filters.voicePart || filters.status) && (
          <button 
            onClick={() => {
              setFilter('name', '');
              setFilter('voicePart', '');
              setFilter('status', '');
            }}
            className="btn btn-secondary"
            style={{ 
              height: '44px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 'var(--space-xs)',
              whiteSpace: 'nowrap'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
              <path d="M3 3v5h5"></path>
            </svg>
            Reset Filters
          </button>
        )}
      </div>

      <RosterTable profiles={profiles} onEdit={handleEdit} onPhotoChange={refresh} />

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
