import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProfiles } from '../../hooks/useProfiles';
import { RosterTable } from '../../components/admin/RosterTable';
import { SingerModal } from '../../components/admin/SingerModal';
import { RosterSummary } from '../../components/admin/RosterSummary';
import type { Profile, ProfileInput } from '../../services/profileService';
import { RosterImportModal } from '../../components/admin/RosterImportModal';
import { exportToCSV } from '../../services/profileService';
import { settingsService } from '../../services/settingsService';
import { sortProfiles } from '../../lib/singerSort';
import { getVoicePartFilterLabel } from '../../lib/voicePartLabels';
import { useDues } from '../../hooks/useDues';
import { useAuth } from '../../contexts/AuthContext';
import { useRosterConfigForm } from '../../hooks/useRosterConfigForm';
import { RosterSettingsTab } from '../../components/admin/RosterSettingsTab';
import { useVoiceParts } from '../../hooks/useVoiceParts';
import { useDialog } from '../../contexts/DialogContext';
import './RosterView.css';

export default function RosterView() {
  const dialog = useDialog();
  const { user, updatePreferences } = useAuth();
  const hasShownRetryToastRef = useRef(false);
  const { allProfiles, profiles, unfilteredByVoicePartProfiles, isLoading, error, filters, setFilter, addProfile, editProfile, removeProfile, refresh } = useProfiles({
    onRateLimitRetry: () => {
      if (hasShownRetryToastRef.current) return;
      hasShownRetryToastRef.current = true;
      dialog.showToast('Roster loading is being rate-limited; retrying automatically...');
    },
  });
  const { currentSeason, duesMap, toggleDues } = useDues();
  const [searchParams, setSearchParams] = useSearchParams();
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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(25);

  // Reset to first page when search filters or sorting selections change
  useEffect(() => {
    if (isLoading) {
      hasShownRetryToastRef.current = false;
    }
  }, [isLoading]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.name, filters.voiceParts, filters.status, sortBy, pageSize]);

  // Handle deep linking for a specific singer profile
  useEffect(() => {
    if (isLoading) return;
    const singerId = searchParams.get('singerId');
    const openModal = searchParams.get('openModal') === 'true';
    const addNew = searchParams.get('add') === 'true';

    if (singerId && openModal && allProfiles.length > 0) {
      const found = allProfiles.find(p => p.id === singerId);
      if (found) {
        setEditingProfile(found);
        setIsModalOpen(true);
        // Clear search parameters
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('singerId');
        newParams.delete('openModal');
        setSearchParams(newParams, { replace: true });
      }
    } else if (addNew) {
      setEditingProfile(null);
      setIsModalOpen(true);
      // Clear search parameter
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('add');
      setSearchParams(newParams, { replace: true });
    }
  }, [allProfiles, isLoading, searchParams, setSearchParams]);

  // Config hook integration
  const {
    configDefaultStatus,
    setConfigDefaultStatus,
    configSeason,
    setConfigSeason,
    configSections,
    setConfigSections,
    configVoiceParts,
    setConfigVoiceParts,
    configAutomationEnabled,
    setConfigAutomationEnabled,
    configAutomationMissThreshold,
    setConfigAutomationMissThreshold,
    configAutomationRecoveryEnabled,
    setConfigAutomationRecoveryEnabled,
    isSavingConfig,
    configMessage,
    isConfigDirty,
    activeColorPickerIndex,
    setActiveColorPickerIndex,
    handleConfigSave,
    handleConfigDiscard,
  } = useRosterConfigForm({
    setFilter,
    refreshRoster: refresh,
    refreshVoiceParts,
  });

  useEffect(() => {
    settingsService.getRosterSettings().then(settings => {
      if (settings && settings.defaultSort !== undefined) {
        setDefaultSort(settings.defaultSort);
      }
    }).catch(err => {
      console.error('Failed to load roster settings:', err);
    });
  }, []);

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
    return sortProfiles(profiles, sortBy, voicePartLabels);
  }, [profiles, sortBy, voicePartLabels]);

  const paginatedProfiles = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedProfiles.slice(startIndex, startIndex + pageSize);
  }, [sortedProfiles, currentPage, pageSize]);

  const handleVoicePartToggle = (part: string) => {
    const active = filters.voiceParts || [];
    const next = active.includes(part)
      ? active.filter(p => p !== part)
      : [...active, part];
    setFilter('voiceParts', next);
  };

  const getDropdownLabel = () => {
    const active = filters.voiceParts || [];
    return getVoicePartFilterLabel(active, configSectionsHook, voicePartLabels);
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
    <div className="roster-container">
      <div className="admin-view-header">
        <h1 className="admin-view-title">Global Roster</h1>
        {activeTab === 'roster' && (
          <div className="admin-view-actions">
            <button onClick={handleExportCSV} className="btn btn-secondary">Export Roster</button>
            <button onClick={() => setIsImportModalOpen(true)} className="btn btn-secondary">Import CSV</button>
            <button onClick={handleAdd} className="btn btn-primary">+ Add Singer</button>
          </div>
        )}
      </div>

      {/* Segmented Tab Navigation */}
      <div className="roster-tabs no-print" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-xs)', marginBottom: 'var(--space-sm)' }}>
        <button
          onClick={() => setActiveTab('roster')}
          className={`btn ${activeTab === 'roster' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '8px 16px', fontSize: '16px' }}
        >
          Singer Directory
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`btn ${activeTab === 'config' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '8px 16px', fontSize: '16px' }}
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

          <div className="roster-filters-bar">
            <div className="search-input-wrapper">
              <input
                type="text"
                placeholder="Search by name..."
                value={filters.name || ''}
                onChange={(e) => setFilter('name', e.target.value)}
                className="card search-input"
                style={{ fontSize: '15px' }}
              />
              <span className="search-icon">
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

            <div id="voice-part-dropdown-container" className="voice-part-filter-container">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="voice-part-dropdown-trigger flex-row"
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
                <div className="voice-part-dropdown-panel shadow-lg">
                  <div className="dropdown-section-title">Sections</div>
                  <div className="dropdown-grid-sections">
                    {configSectionsHook.map(sec => {
                      const isChecked = (filters.voiceParts || []).includes(sec.code);
                      return (
                        <label key={sec.code} className="voice-part-option-label">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleVoicePartToggle(sec.code)}
                            className="voice-part-checkbox"
                          />
                          <span className={isChecked ? 'selected' : ''}>{sec.name}</span>
                        </label>
                      );
                    })}
                  </div>

                  <hr className="voice-part-divider" />

                  <div className="dropdown-section-title">Individual Parts</div>
                  <div className="dropdown-grid-parts">
                    {voicePartLabels.map(part => {
                      const isChecked = (filters.voiceParts || []).includes(part);
                      return (
                        <label key={part} className="voice-part-option-label">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleVoicePartToggle(part)}
                            className="voice-part-checkbox"
                          />
                          <span className={isChecked ? 'selected' : ''}>{part}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <select 
              value={filters.status} 
              onChange={(e) => setFilter('status', e.target.value)}
              className="admin-filter-select"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Idle">Idle</option>
              <option value="Inactive">Inactive</option>
            </select>

            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as 'lastName' | 'voicePart')}
              className="admin-filter-select"
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
                className="btn btn-secondary admin-filter-reset"
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
            profiles={paginatedProfiles} 
            onEdit={handleEdit} 
            onPhotoChange={refresh} 
            currentSeason={currentSeason}
            duesMap={duesMap}
            onToggleDues={toggleDues}
            currentPage={currentPage}
            pageSize={pageSize}
            totalCount={sortedProfiles.length}
            onPageChange={setCurrentPage}
          />
        </>
      ) : (
        <RosterSettingsTab
          configMessage={configMessage}
          configDefaultStatus={configDefaultStatus}
          setConfigDefaultStatus={setConfigDefaultStatus}
          configSeason={configSeason}
          setConfigSeason={setConfigSeason}
          configAutomationEnabled={configAutomationEnabled}
          setConfigAutomationEnabled={setConfigAutomationEnabled}
          configAutomationMissThreshold={configAutomationMissThreshold}
          setConfigAutomationMissThreshold={setConfigAutomationMissThreshold}
          configAutomationRecoveryEnabled={configAutomationRecoveryEnabled}
          setConfigAutomationRecoveryEnabled={setConfigAutomationRecoveryEnabled}
          configSections={configSections}
          setConfigSections={setConfigSections}
          configVoiceParts={configVoiceParts}
          setConfigVoiceParts={setConfigVoiceParts}
          isSavingConfig={isSavingConfig}
          isConfigDirty={isConfigDirty}
          activeColorPickerIndex={activeColorPickerIndex}
          setActiveColorPickerIndex={setActiveColorPickerIndex}
          handleConfigSave={handleConfigSave}
          handleConfigDiscard={handleConfigDiscard}
          allProfiles={allProfiles}
          setActiveTab={setActiveTab}
          setFilter={setFilter}
        />
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
