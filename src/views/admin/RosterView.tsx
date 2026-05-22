import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProfiles } from '../../hooks/useProfiles';
import { RosterTable } from '../../components/admin/RosterTable';
import { SingerModal } from '../../components/admin/SingerModal';
import { RosterSummary } from '../../components/admin/RosterSummary';
import type { Profile, ProfileInput } from '../../services/profileService';
import { RosterImportModal } from '../../components/admin/RosterImportModal';
import { exportToCSV } from '../../services/profileService';
import { 
  settingsService, 
  getVoicePartsAndSections, 
  saveVoicePartsAndSections,
  type VoicePartDef,
  type SectionDef
} from '../../services/settingsService';
import { getLastName } from '../../lib/stringUtils';
import { useDues } from '../../hooks/useDues';
import { useAuth } from '../../contexts/AuthContext';
import { AppCard } from '../../components/common/AppCard';
import { calculateSettingsDirty } from '../../lib/settings/dirtyCheck';
import { FloatingSaveBar } from '../../components/admin/FloatingSaveBar';

// Section Palette Colors
const PALETTE_COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#10B981', // Green
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#64748B', // Slate
];

function isColorTooClose(hex1: string, hex2: string): boolean {
  if (!hex1 || !hex2 || !hex1.startsWith('#') || !hex2.startsWith('#')) return false;
  const r1 = parseInt(hex1.substring(1, 3), 16);
  const g1 = parseInt(hex1.substring(3, 5), 16);
  const b1 = parseInt(hex1.substring(5, 7), 16);
  
  const r2 = parseInt(hex2.substring(1, 3), 16);
  const g2 = parseInt(hex2.substring(3, 5), 16);
  const b2 = parseInt(hex2.substring(5, 7), 16);
  
  const distance = Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
  return distance < 60;
}

function getContrastColor(hex: string): string {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return 'var(--text)';
  const r = parseInt(hex.substring(1, 3), 16);
  const g = parseInt(hex.substring(3, 5), 16);
  const b = parseInt(hex.substring(5, 7), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#000000' : '#ffffff';
}

interface RosterConfigState {
  defaultStatus: string;
  currentSeason: string;
  sections: SectionDef[];
  voiceParts: VoicePartDef[];
}

import { useVoiceParts } from '../../hooks/useVoiceParts';

export default function RosterView() {
  const { user, updatePreferences } = useAuth();
  const { profiles, unfilteredByVoicePartProfiles, isLoading, error, filters, setFilter, addProfile, editProfile, removeProfile, refresh } = useProfiles();
  const { currentSeason, duesMap, toggleDues } = useDues();
  const [searchParams] = useSearchParams();
  const initialVoicePart = searchParams.get('voicePart') || '';
  const { labels: voicePartLabels, sections: configSectionsHook, refresh: refreshVoiceParts } = useVoiceParts();
  
  const [activeTab, setActiveTab] = useState<'roster' | 'config'>('roster');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Roster Sort user preference & fallback
  const [defaultSort, setDefaultSort] = useState<'lastName' | 'voicePart'>('lastName');
  const sortBy = user?.preferences?.rosterSort || defaultSort;
  const setSortBy = (val: 'lastName' | 'voicePart') => {
    updatePreferences({ rosterSort: val });
  };

  // Config States
  const [configDefaultStatus, setConfigDefaultStatus] = useState('');
  const [configSeason, setConfigSeason] = useState('');
  const [configSections, setConfigSections] = useState<SectionDef[]>([]);
  const [configVoiceParts, setConfigVoiceParts] = useState<VoicePartDef[]>([]);
  const [initialConfigState, setInitialConfigState] = useState<RosterConfigState | null>(null);
  const [activeColorPickerIndex, setActiveColorPickerIndex] = useState<number | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState('');

  const loadConfig = async () => {
    try {
      const rosterSettings = await settingsService.getRosterSettings();
      const voiceSettings = await getVoicePartsAndSections();
      
      const loadedDefaultStatus = rosterSettings?.defaultStatus || '';
      const loadedSeason = rosterSettings?.currentSeason || '';
      const loadedSections = voiceSettings.sections || [];
      const loadedVoiceParts = voiceSettings.voiceParts || [];

      setConfigDefaultStatus(loadedDefaultStatus);
      setConfigSeason(loadedSeason);
      setConfigSections(loadedSections);
      setConfigVoiceParts(loadedVoiceParts);

      setInitialConfigState({
        defaultStatus: loadedDefaultStatus,
        currentSeason: loadedSeason,
        sections: JSON.parse(JSON.stringify(loadedSections)),
        voiceParts: JSON.parse(JSON.stringify(loadedVoiceParts))
      });
    } catch (err) {
      console.error('Failed to load configuration:', err);
    }
  };

  useEffect(() => {
    settingsService.getRosterSettings().then(settings => {
      if (settings) {
        if (settings.defaultStatus !== undefined) {
          setFilter('status', settings.defaultStatus);
        }
        if (settings.defaultSort !== undefined) {
          setDefaultSort(settings.defaultSort);
        }
      }
    }).catch(err => {
      console.error('Failed to load roster settings:', err);
    });

    loadConfig();
  }, [setFilter]);

  useEffect(() => {
    if (initialVoicePart) {
      setFilter('voiceParts', [initialVoicePart]);
    }
  }, [initialVoicePart, setFilter]);

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
        const idxA = voicePartLabels.indexOf(a.voicePart);
        const idxB = voicePartLabels.indexOf(b.voicePart);
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
  }, [profiles, sortBy, voicePartLabels]);

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

  const isConfigDirty = useMemo(() => {
    if (!initialConfigState) return false;
    return calculateSettingsDirty(initialConfigState, {
      defaultStatus: configDefaultStatus,
      currentSeason: configSeason,
      sections: configSections,
      voiceParts: configVoiceParts
    });
  }, [initialConfigState, configDefaultStatus, configSeason, configSections, configVoiceParts]);

  const handleConfigSave = async () => {
    setIsSavingConfig(true);
    setConfigMessage('');

    // Validate Sections
    const seenSectionCodes = new Set<string>();
    for (let i = 0; i < configSections.length; i++) {
      const sec = configSections[i];
      const code = sec.code.trim().toUpperCase();
      const name = sec.name.trim();
      
      if (!code) {
        setConfigMessage('Error: Section bucket code cannot be empty.');
        setIsSavingConfig(false);
        return;
      }
      if (seenSectionCodes.has(code)) {
        setConfigMessage(`Error: Duplicate section bucket code "${code}".`);
        setIsSavingConfig(false);
        return;
      }
      seenSectionCodes.add(code);
      if (!name) {
        setConfigMessage(`Error: Section bucket "${code}" name cannot be empty.`);
        setIsSavingConfig(false);
        return;
      }
    }

    // Validate Voice Parts
    const seenPartLabels = new Set<string>();
    for (let i = 0; i < configVoiceParts.length; i++) {
      const vp = configVoiceParts[i];
      const label = vp.label.trim();
      const fullName = vp.fullName.trim();
      const secCode = vp.sectionCode.trim().toUpperCase();

      if (!label) {
        setConfigMessage('Error: Voice part label cannot be empty.');
        setIsSavingConfig(false);
        return;
      }
      if (seenPartLabels.has(label)) {
        setConfigMessage(`Error: Duplicate voice part label "${label}".`);
        setIsSavingConfig(false);
        return;
      }
      seenPartLabels.add(label);
      if (!fullName) {
        setConfigMessage(`Error: Voice part "${label}" full name cannot be empty.`);
        setIsSavingConfig(false);
        return;
      }
      if (!secCode) {
        setConfigMessage(`Error: Voice part "${label}" must belong to a section bucket.`);
        setIsSavingConfig(false);
        return;
      }
      if (!seenSectionCodes.has(secCode)) {
        setConfigMessage(`Error: Voice part "${label}" belongs to unknown section bucket "${secCode}".`);
        setIsSavingConfig(false);
        return;
      }
    }

    try {
      const rosterSettings = await settingsService.getRosterSettings();
      await settingsService.saveRosterSettings({
        ...rosterSettings,
        defaultStatus: configDefaultStatus,
        currentSeason: configSeason
      });
      await saveVoicePartsAndSections(configVoiceParts, configSections);

      // Refresh roster data & sections
      await refresh();
      await refreshVoiceParts();

      // Reload config state
      await loadConfig();

      setConfigMessage('Configuration saved successfully.');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setConfigMessage(`Error saving configuration: ${errMsg}`);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleConfigDiscard = () => {
    if (!initialConfigState) return;
    setConfigDefaultStatus(initialConfigState.defaultStatus);
    setConfigSeason(initialConfigState.currentSeason);
    setConfigSections(JSON.parse(JSON.stringify(initialConfigState.sections)));
    setConfigVoiceParts(JSON.parse(JSON.stringify(initialConfigState.voiceParts)));
    setConfigMessage('');
  };

  const getSingerCountForPart = (label: string) => {
    if (!label) return 0;
    return profiles.filter(p => p.voicePart === label).length;
  };

  const isSectionReferenced = (code: string) => {
    return configVoiceParts.some(vp => vp.sectionCode === code);
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
        {activeTab === 'roster' && (
          <div className="flex-row" style={{ gap: 'var(--space-md)' }}>
            <button onClick={handleExportCSV} className="btn btn-secondary">Export Roster</button>
            <button onClick={() => setIsImportModalOpen(true)} className="btn btn-secondary">Import CSV</button>
            <button onClick={handleAdd} className="btn btn-primary">+ Add Singer</button>
          </div>
        )}
      </div>

      {/* Segmented Tab Navigation */}
      <div className="flex-row no-print" style={{ gap: 'var(--space-md)', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-xs)', marginBottom: 'var(--space-sm)' }}>
        <button
          onClick={() => setActiveTab('roster')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'roster' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'roster' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'roster' ? '600' : '500',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '16px',
            transition: 'all 0.2s ease',
            borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0'
          }}
        >
          Singer Directory
        </button>
        <button
          onClick={() => setActiveTab('config')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'config' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'config' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: activeTab === 'config' ? '600' : '500',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '16px',
            transition: 'all 0.2s ease',
            borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0'
          }}
        >
          Roster Settings
        </button>
      </div>

      {activeTab === 'roster' ? (
        <>
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
                  {configSectionsHook.map(sec => {
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
                        <span style={{ fontWeight: isChecked ? 600 : 400 }}>{sec.name}</span>
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
                  {voicePartLabels.map(part => {
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

          <RosterTable 
            profiles={sortedProfiles} 
            onEdit={handleEdit} 
            onPhotoChange={refresh} 
            currentSeason={currentSeason}
            duesMap={duesMap}
            onToggleDues={toggleDues}
          />
        </>
      ) : (
        <div className="flex-col" style={{ gap: 'var(--space-xl)' }}>
          {configMessage && (
            <div 
              className={`badge ${configMessage.startsWith('Error') ? 'badge-rehearsal' : 'badge-performance'}`} 
              style={{ alignSelf: 'flex-start', padding: '8px 12px', fontSize: '14px' }}
            >
              {configMessage}
            </div>
          )}

          <AppCard title="Roster Display Options">
            <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
              <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                <label className="text-label">Default Status Filter</label>
                <select
                  value={configDefaultStatus}
                  onChange={(event) => setConfigDefaultStatus(event.target.value)}
                  className="card"
                  style={{ width: '100%', maxWidth: '300px', padding: '0 12px', height: '40px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
                >
                  <option value="">All Statuses</option>
                  <option value="Active (Current)">Active (Current)</option>
                  <option value="Active (Future)">Active (Future)</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <p className="text-muted" style={{ margin: 0 }}>
                  Choose the default status filter used when opening the global roster.
                </p>
              </div>
            </div>
          </AppCard>

          <AppCard title="Season Management">
            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <label className="text-label">Current Season</label>
              <input
                type="text"
                value={configSeason}
                onChange={(event) => setConfigSeason(event.target.value)}
                placeholder="e.g. Fall 2026"
                className="card"
                style={{ width: '100%', maxWidth: '300px', padding: '0 12px', height: '40px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
              />
              <p className="text-muted" style={{ margin: 0 }}>
                Set the active season for tracking dues in the roster view. Leave blank to disable dues tracking.
              </p>
            </div>
          </AppCard>

          <AppCard title="Section Bucket Configurations">
            <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
              <p className="text-muted" style={{ margin: 0 }}>
                Configure the section buckets for your choir (e.g. S, Sopranos) and their visual identity on the seating chart.
              </p>

              <div className="flex-col" style={{ gap: 'var(--space-sm)' }}>
                {configSections.map((sec, index) => {
                  const isTied = isSectionReferenced(sec.code);
                  const hexBg = sec.color || sec.colorBg || '#e0e0e0';
                  const tooClose = configSections.some((other, idx) => {
                    if (idx === index) return false;
                    const otherHex = other.color || other.colorBg;
                    return isColorTooClose(hexBg, otherHex || '');
                  });

                  return (
                    <div key={index} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 200px 80px', gap: 'var(--space-md)', alignItems: 'center', width: '100%' }}>
                      <input
                        value={sec.code}
                        onChange={(e) => {
                          const newSecs = [...configSections];
                          newSecs[index] = { ...newSecs[index], code: e.target.value };
                          setConfigSections(newSecs);
                        }}
                        placeholder="Code"
                        disabled={isTied}
                        className="card"
                        style={{ width: '100%', padding: '0 8px', height: '40px' }}
                      />
                      <input
                        value={sec.name}
                        onChange={(e) => {
                          const newSecs = [...configSections];
                          newSecs[index] = { ...newSecs[index], name: e.target.value };
                          setConfigSections(newSecs);
                        }}
                        placeholder="Name"
                        className="card"
                        style={{ width: '100%', padding: '0 8px', height: '40px' }}
                      />
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                        <button
                          type="button"
                          onClick={() => setActiveColorPickerIndex(activeColorPickerIndex === index ? null : index)}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            backgroundColor: hexBg,
                            border: '1px solid var(--border)',
                            cursor: 'pointer',
                            padding: 0,
                            boxShadow: 'var(--shadow-sm)',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'transform 0.1s ease',
                          }}
                          title="Choose color"
                        />

                        <input
                          type="text"
                          value={sec.color || sec.colorBg || '#e0e0e0'}
                          onChange={(e) => {
                            let val = e.target.value;
                            if (!val.startsWith('#') && val.length > 0) {
                              val = '#' + val;
                            }
                            val = '#' + val.replace(/[^0-9A-Fa-f]/g, '').substring(0, 6);
                            
                            const newSecs = [...configSections];
                            newSecs[index] = { 
                              ...newSecs[index], 
                              color: val,
                              colorBg: val,
                              colorText: getContrastColor(val)
                            };
                            setConfigSections(newSecs);
                          }}
                          placeholder="#FFFFFF"
                          className="card"
                          style={{ 
                            width: '90px', 
                            padding: '0 8px', 
                            height: '32px', 
                            fontFamily: 'var(--font-mono, monospace)', 
                            fontSize: '12px',
                            margin: 0
                          }}
                        />

                        {tooClose && (
                          <span title="Warning: This color lacks adequate visual contrast with another section color." style={{ color: 'var(--color-danger-text)', cursor: 'help', fontSize: '14px' }}>⚠️</span>
                        )}

                        {activeColorPickerIndex === index && (
                          <>
                            <div 
                              onClick={() => setActiveColorPickerIndex(null)}
                              style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                zIndex: 100,
                                cursor: 'default'
                              }}
                            />
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              marginTop: '4px',
                              backgroundColor: 'var(--card-bg, #ffffff)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-md, 8px)',
                              padding: '12px',
                              boxShadow: 'var(--shadow-lg, 0 10px 15px -3px rgba(0,0,0,0.1))',
                              zIndex: 101,
                              width: '180px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px'
                            }}>
                              <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-light)', textTransform: 'uppercase' }}>Presets</span>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                                {PALETTE_COLORS.map(c => {
                                  const isSelected = hexBg.toUpperCase() === c.toUpperCase();
                                  return (
                                    <button
                                      key={c}
                                      type="button"
                                      onClick={() => {
                                        const newSecs = [...configSections];
                                        newSecs[index] = { 
                                          ...newSecs[index], 
                                          color: c,
                                          colorBg: c,
                                          colorText: getContrastColor(c)
                                        };
                                        setConfigSections(newSecs);
                                        setActiveColorPickerIndex(null);
                                      }}
                                      style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '6px',
                                        backgroundColor: c,
                                        border: isSelected ? '2px solid var(--text-main, #000000)' : '1px solid var(--border)',
                                        cursor: 'pointer',
                                        padding: 0,
                                        flexShrink: 0,
                                        transition: 'transform 0.1s ease',
                                        transform: isSelected ? 'scale(1.1)' : 'scale(1)'
                                      }}
                                      title={c}
                                    />
                                  );
                                })}
                              </div>
                              
                              <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '4px 0' }} />
                              
                              <label style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '6px', 
                                fontSize: '12px', 
                                cursor: 'pointer',
                                color: 'var(--text-main)',
                                padding: '6px 8px',
                                borderRadius: '4px',
                                border: '1px solid var(--border)',
                                justifyContent: 'center',
                                backgroundColor: 'var(--bg-light, #f9fafb)',
                                textAlign: 'center',
                                margin: 0
                              }}>
                                <span style={{ fontSize: '14px' }}>🎨</span> Custom Color
                                <input 
                                  type="color"
                                  value={hexBg}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const newSecs = [...configSections];
                                    newSecs[index] = {
                                      ...newSecs[index],
                                      color: val,
                                      colorBg: val,
                                      colorText: getContrastColor(val)
                                    };
                                    setConfigSections(newSecs);
                                  }}
                                  style={{ 
                                    position: 'absolute',
                                    width: 0,
                                    height: 0,
                                    opacity: 0,
                                    pointerEvents: 'none'
                                  }}
                                />
                              </label>
                            </div>
                          </>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setConfigSections(configSections.filter((_, idx) => idx !== index));
                        }}
                        disabled={isTied}
                        className="btn btn-danger btn-sm"
                        style={{ height: '36px', minHeight: '36px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        Delete
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setConfigSections([...configSections, { code: '', name: '', color: '', colorBg: '', colorText: '' }])}
                className="btn btn-secondary"
                style={{ alignSelf: 'flex-start' }}
              >
                + Add Section Bucket
              </button>
            </div>
          </AppCard>

          <AppCard title="Voice Part Configurations">
            <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
              <p className="text-muted" style={{ margin: 0 }}>
                Configure the custom voice parts for the choir (e.g. S1, Soprano 1) and link them to a Section Bucket.
              </p>

              <div className="flex-col" style={{ gap: 'var(--space-sm)' }}>
                {configVoiceParts.map((vp, index) => {
                  const count = getSingerCountForPart(vp.label);
                  const isTied = count > 0;
                  return (
                    <div key={index} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 160px 120px 100px', gap: 'var(--space-md)', alignItems: 'center', width: '100%' }}>
                      <input
                        value={vp.label}
                        onChange={(e) => {
                          const newParts = [...configVoiceParts];
                          newParts[index] = { ...newParts[index], label: e.target.value };
                          setConfigVoiceParts(newParts);
                        }}
                        placeholder="Label (e.g. S1)"
                        disabled={isTied}
                        className="card"
                        style={{ width: '100%', padding: '0 12px', height: '40px', minHeight: '40px' }}
                        title={isTied ? "Cannot change the label of a voice part with assigned singers" : undefined}
                      />
                      <input
                        value={vp.fullName}
                        onChange={(e) => {
                          const newParts = [...configVoiceParts];
                          newParts[index] = { ...newParts[index], fullName: e.target.value };
                          setConfigVoiceParts(newParts);
                        }}
                        placeholder="Full Name (e.g. Soprano 1)"
                        className="card"
                        style={{ width: '100%', padding: '0 12px', height: '40px', minHeight: '40px' }}
                      />
                      <select
                        value={vp.sectionCode}
                        onChange={(e) => {
                          const newParts = [...configVoiceParts];
                          newParts[index] = { ...newParts[index], sectionCode: e.target.value };
                          setConfigVoiceParts(newParts);
                        }}
                        className="card"
                        style={{ width: '100%', padding: '0 12px', height: '40px', minHeight: '40px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
                      >
                        <option value="">Select Section...</option>
                        {configSections.map(s => (
                          <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                        ))}
                      </select>
                      {vp.label ? (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('roster');
                            setFilter('voiceParts', [vp.label]);
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ height: '36px', minHeight: '36px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                          title={`Click to view the ${count} singer(s) in this voice part`}
                        >
                          <span style={{ fontWeight: 600 }}>{count}</span>
                          <span>singer{count === 1 ? '' : 's'}</span>
                        </button>
                      ) : (
                        <div style={{ height: '36px' }} />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setConfigVoiceParts(configVoiceParts.filter((_, idx) => idx !== index));
                        }}
                        disabled={isTied}
                        className="btn btn-danger btn-sm"
                        style={{ height: '36px', minHeight: '36px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title={isTied ? "Cannot delete voice part with assigned singers" : undefined}
                      >
                        Delete
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setConfigVoiceParts([...configVoiceParts, { label: '', fullName: '', sectionCode: '' }])}
                className="btn btn-secondary"
                style={{ alignSelf: 'flex-start' }}
              >
                + Add Voice Part
              </button>
            </div>
          </AppCard>

          <FloatingSaveBar 
            isDirty={isConfigDirty} 
            isSaving={isSavingConfig} 
            onSave={handleConfigSave} 
            onDiscard={handleConfigDiscard} 
          />
        </div>
      )}

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
