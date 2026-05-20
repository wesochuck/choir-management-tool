import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProfiles } from '../../hooks/useProfiles';
import { RosterTable } from '../../components/admin/RosterTable';
import { SingerModal } from '../../components/admin/SingerModal';
import { RosterSummary } from '../../components/admin/RosterSummary';
import type { Profile, ProfileInput } from '../../services/profileService';
import { RosterImportModal } from '../../components/admin/RosterImportModal';
import { exportToCSV } from '../../services/profileService';
import { getVoiceParts, settingsService } from '../../services/settingsService';
import { getLastName } from '../../lib/stringUtils';


export default function RosterView() {
  const { profiles, unfilteredByVoicePartProfiles, isLoading, error, filters, setFilter, addProfile, editProfile, removeProfile, refresh } = useProfiles();
  const [searchParams] = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [voiceParts, setVoiceParts] = useState<string[]>(['S1', 'S2', 'A1', 'A2', 'T1', 'T2', 'B1', 'B2']);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'lastName' | 'voicePart'>('lastName');

  const initialVoicePart = searchParams.get('voicePart') || '';

  useEffect(() => {
    getVoiceParts().then(parts => {
      if (parts && parts.length > 0) {
        setVoiceParts(parts.map(p => p.label));
      }
    });

    settingsService.getRosterSettings().then(settings => {
      if (settings) {
        if (settings.defaultStatus !== undefined) {
          setFilter('status', settings.defaultStatus);
        }
        if (settings.defaultSort !== undefined) {
          setSortBy(settings.defaultSort);
        }
      }
    }).catch(err => {
      console.error('Failed to load roster settings:', err);
    });
  }, []);

  useEffect(() => {
    if (initialVoicePart) {
      setFilter('voiceParts', [initialVoicePart]);
    }
  }, [initialVoicePart]);

  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#voice-part-dropdown-container')) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isDropdownOpen]);

  const sortedProfiles = useMemo(() => {
    return [...profiles].sort((a, b) => {
      if (sortBy === 'voicePart') {
        const idxA = voiceParts.indexOf(a.voicePart);
        const idxB = voiceParts.indexOf(b.voicePart);
        const orderA = idxA === -1 ? 999 : idxA;
        const orderB = idxB === -1 ? 999 : idxB;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
      }
      
      const lastA = getLastName(a.name);
      const lastB = getLastName(b.name);
      const cmp = lastA.localeCompare(lastB);
      if (cmp !== 0) return cmp;
      return a.name.localeCompare(b.name);
    });
  }, [profiles, sortBy, voiceParts]);

  const handleVoicePartToggle = (part: string) => {
    const active = filters.voiceParts || [];
    const next = active.includes(part)
      ? active.filter(p => p !== part)
      : [...active, part];
    setFilter('voiceParts', next);
  };

  const getDropdownLabel = () => {
    const active = filters.voiceParts || [];
    if (active.length === 0) return 'All Voice Parts';
    return active.map(code => {
      if (code === 'S') return 'Sopranos';
      if (code === 'A') return 'Altos';
      if (code === 'T') return 'Tenors';
      if (code === 'B') return 'Basses';
      return code;
    }).join(', ');
  };

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
        selectedVoiceParts={filters.voiceParts}
        onVoicePartToggle={handleVoicePartToggle}
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

        <div id="voice-part-dropdown-container" style={{ position: 'relative', width: '200px' }}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="card flex-row"
            style={{
              padding: '0 12px',
              height: '44px',
              width: '100%',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              backgroundColor: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '15px',
              color: 'var(--text)',
              textAlign: 'left'
            }}
          >
            <span style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '145px',
              fontWeight: (filters.voiceParts || []).length > 0 ? 600 : 400
            }}>
              {getDropdownLabel()}
            </span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              style={{
                transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
                color: 'var(--text-muted)'
              }}
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          {isDropdownOpen && (
            <div
              className="card"
              style={{
                position: 'absolute',
                top: '48px',
                left: 0,
                right: 0,
                zIndex: 100,
                maxHeight: '300px',
                overflowY: 'auto',
                padding: 'var(--space-xs) 0',
                boxShadow: 'var(--shadow-lg)',
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}
            >
              <div style={{
                padding: '6px 12px 2px 12px',
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Sections
              </div>
              {[
                { code: 'S', label: 'Sopranos (S1, S2)' },
                { code: 'A', label: 'Altos (A1, A2)' },
                { code: 'T', label: 'Tenors (T1, T2)' },
                { code: 'B', label: 'Basses (B1, B2)' }
              ].map(sec => {
                const isChecked = (filters.voiceParts || []).includes(sec.code);
                return (
                  <label
                    key={sec.code}
                    className="flex-row"
                    style={{
                      padding: '8px 12px',
                      alignItems: 'center',
                      gap: 'var(--space-sm)',
                      cursor: 'pointer',
                      fontSize: '13px',
                      userSelect: 'none',
                      transition: 'background-color 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-light)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleVoicePartToggle(sec.code)}
                      style={{
                        cursor: 'pointer',
                        accentColor: 'var(--primary)',
                        width: '15px',
                        height: '15px'
                      }}
                    />
                    <span style={{ fontWeight: isChecked ? 600 : 400 }}>{sec.label}</span>
                  </label>
                );
              })}

              <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '4px 0' }}></div>

              <div style={{
                padding: '6px 12px 2px 12px',
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Individual Parts
              </div>
              {voiceParts.map(part => {
                const isChecked = (filters.voiceParts || []).includes(part);
                return (
                  <label
                    key={part}
                    className="flex-row"
                    style={{
                      padding: '8px 12px',
                      alignItems: 'center',
                      gap: 'var(--space-sm)',
                      cursor: 'pointer',
                      fontSize: '13px',
                      userSelect: 'none',
                      transition: 'background-color 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-light)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleVoicePartToggle(part)}
                      style={{
                        cursor: 'pointer',
                        accentColor: 'var(--primary)',
                        width: '15px',
                        height: '15px'
                      }}
                    />
                    <span style={{ fontWeight: isChecked ? 600 : 400 }}>{part}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
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

        <select 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value as 'lastName' | 'voicePart')}
          className="card"
          style={{ padding: '0 12px', height: '44px', width: '200px' }}
        >
          <option value="lastName">Last Name</option>
          <option value="voicePart">Voice Part + Last Name</option>
        </select>

        {(filters.name || (filters.voiceParts && filters.voiceParts.length > 0) || filters.status) && (
          <button 
            onClick={() => {
              setFilter('name', '');
              setFilter('voiceParts', []);
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

      <RosterTable profiles={sortedProfiles} onEdit={handleEdit} onPhotoChange={refresh} />

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
