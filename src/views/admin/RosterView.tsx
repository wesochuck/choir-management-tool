import { useState, useEffect, useMemo } from 'react';
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
import { useRateLimitRetryToast } from '../../hooks/useRateLimitRetryToast';
import { Button } from '../../components/ui';

export default function RosterView() {
  const { user, updatePreferences } = useAuth();
  const { onRetry: onRosterRateLimitRetry, reset: resetRosterRateLimitToast } = useRateLimitRetryToast(
    'Roster loading is being rate-limited; retrying automatically...',
  );
  const { allProfiles, profiles, unfilteredByVoicePartProfiles, isLoading, error, filters, setFilter, addProfile, editProfile, removeProfile, refresh } = useProfiles({
    onRateLimitRetry: onRosterRateLimitRetry,
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
      resetRosterRateLimitToast();
    }
  }, [isLoading, resetRosterRateLimitToast]);

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
    configMaxRehearsalMisses,
    setConfigMaxRehearsalMisses,
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

  if (isLoading && profiles.length === 0) return <div className="p-5">Loading roster...</div>;
  if (error) return <div className="p-5 text-red-500">Error: {error}</div>;

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            Global Roster
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Manage choir members, voice parts, sections, and configurations. Import or export roster data.
          </p>
        </div>
        {activeTab === 'roster' && (
          <div className="mt-1 flex flex-shrink-0 items-center gap-2">
            <Button onClick={handleExportCSV} variant="secondary">
              Export Roster
            </Button>
            <Button onClick={() => setIsImportModalOpen(true)} variant="secondary">
              Import CSV
            </Button>
            <Button onClick={handleAdd} variant="primary">
              + Add Singer
            </Button>
          </div>
        )}
      </div>

      {/* Segmented Tab Navigation */}
      <div className="no-print mb-2 flex flex-row gap-2 border-b border-gray-200 pb-1">
        <button
          onClick={() => setActiveTab('roster')}
          className={`btn ${activeTab === 'roster' ? 'btn-primary' : 'btn-ghost'} px-4 py-2 text-base`}
        >
          Singer Directory
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`btn ${activeTab === 'config' ? 'btn-primary' : 'btn-ghost'} px-4 py-2 text-base`}
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

          <div className="flex flex-row flex-wrap items-end gap-4">
            <div className="relative min-w-[250px] flex-1">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={filters.name || ''}
                onChange={(e) => setFilter('name', e.target.value)}
                className="card h-11 w-full pr-3 pl-10 text-base"
              />
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-500">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </span>
              {filters.name && (
                <button
                  onClick={() => setFilter('name', '')}
                  className="absolute top-1/2 right-3 flex -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-none bg-none p-1 text-gray-500 hover:bg-black/5"
                  title="Clear search"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>

            <div id="voice-part-dropdown-container" className="relative w-[200px]">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex h-11 w-full cursor-pointer flex-row items-center justify-between rounded-lg border border-gray-200 bg-surface px-3 text-left text-base text-gray-800 shadow-none"
              >
                <span 
                  className="max-w-[145px] truncate"
                  // @allow-inline-style - dynamic font weight based on filter state
                  style={{
                    fontWeight: (filters.voiceParts || []).length > 0 ? 600 : 400
                  }}
                >
                  {getDropdownLabel()}
                </span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="text-gray-500"
                  // @allow-inline-style - dynamic transform based on dropdown state
                  style={{
                    transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                  }}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full left-0 z-100 mt-1 flex max-h-80 w-[240px] flex-col gap-0.5 overflow-y-auto rounded-lg border border-gray-200 bg-surface py-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.06)]">
                  <div className="px-2.5 py-0.5 text-[0.65rem] font-bold tracking-wider text-gray-500 uppercase">Sections</div>
                  <div className="flex flex-col gap-0">
                    {configSectionsHook.map(sec => {
                      const isChecked = (filters.voiceParts || []).includes(sec.code);
                      return (
                        <label key={sec.code} className="flex cursor-pointer items-center gap-2 px-2.5 py-1 transition-colors duration-[0.12s] select-none hover:bg-primary-light">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleVoicePartToggle(sec.code)}
                            className="m-0 cursor-pointer"
                          />
                          <span className={`text-xs font-[450] text-gray-800 ${isChecked ? 'font-[650] text-primary-deep' : ''}`}>{sec.name}</span>
                        </label>
                      );
                    })}
                  </div>

                  <hr className="mx-2.5 my-0.5 h-px border-none bg-gray-200" />

                  <div className="px-2.5 py-0.5 text-[0.65rem] font-bold tracking-wider text-gray-500 uppercase">Individual Parts</div>
                  <div className="flex flex-col gap-0">
                    {voicePartLabels.map(part => {
                      const isChecked = (filters.voiceParts || []).includes(part);
                      return (
                        <label key={part} className="flex cursor-pointer items-center gap-2 px-2.5 py-1 transition-colors duration-[0.12s] select-none hover:bg-primary-light">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleVoicePartToggle(part)}
                            className="m-0 cursor-pointer"
                          />
                          <span className={`text-xs font-[450] text-gray-800 ${isChecked ? 'font-[650] text-primary-deep' : ''}`}>{part}</span>
                        </label>
                      );
                    })}
                    <label className="col-span-full mt-1 flex cursor-pointer items-center gap-2 border-t border-dashed border-gray-200 px-2.5 py-1 pt-2 transition-colors duration-[0.12s] select-none hover:bg-primary-light">
                      <input
                        type="checkbox"
                        checked={(filters.voiceParts || []).includes('__STAFF__')}
                        onChange={() => handleVoicePartToggle('__STAFF__')}
                        className="m-0 cursor-pointer"
                      />
                      <span className={`text-xs font-[450] text-gray-800 ${(filters.voiceParts || []).includes('__STAFF__') ? 'font-[650] text-primary-deep' : ''}`}>Staff / Admin (No Part)</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <select 
              value={filters.status} 
              onChange={(e) => setFilter('status', e.target.value)}
              className="h-11 w-[200px] rounded-lg border border-gray-200 bg-surface px-3 pr-9 text-base text-gray-800"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Idle">Idle</option>
              <option value="Inactive">Inactive</option>
            </select>

            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as 'lastName' | 'voicePart')}
              className="h-11 w-[200px] rounded-lg border border-gray-200 bg-surface px-3 pr-9 text-base text-gray-800"
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
                className="btn btn-secondary flex h-11 items-center gap-1 whitespace-nowrap"
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
          configMaxRehearsalMisses={configMaxRehearsalMisses}
          setConfigMaxRehearsalMisses={setConfigMaxRehearsalMisses}
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
