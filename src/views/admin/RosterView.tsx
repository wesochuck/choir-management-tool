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
import { Input, Divider } from '../../components/ui';
import { RosterSettingsTab } from '../../components/admin/RosterSettingsTab';
import { useVoiceParts } from '../../hooks/useVoiceParts';
import { useRateLimitRetryToast } from '../../hooks/useRateLimitRetryToast';
import { useClickOutside } from '../../hooks/useClickOutside';
import { Button, Select } from '../../components/ui';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';

export default function RosterView() {
  const { user, updatePreferences } = useAuth();
  const { onRetry: onRosterRateLimitRetry, reset: resetRosterRateLimitToast } =
    useRateLimitRetryToast('Roster loading is being rate-limited; retrying automatically...');
  const {
    allProfiles,
    profiles,
    unfilteredByVoicePartProfiles,
    isLoading,
    error,
    filters,
    setFilter,
    addProfile,
    editProfile,
    removeProfile,
    refresh,
  } = useProfiles({
    onRateLimitRetry: onRosterRateLimitRetry,
  });
  const { currentSeason, duesMap, toggleDues } = useDues();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialVoicePart = searchParams.get('voicePart') || '';
  const {
    labels: voicePartLabels,
    sections: configSectionsHook,
    refresh: refreshVoiceParts,
  } = useVoiceParts();

  const [activeTab, setActiveTab] = useState<'roster' | 'config'>('roster');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const voicePartDropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(voicePartDropdownRef, () => setIsDropdownOpen(false), {
    enabled: isDropdownOpen,
  });

  // Roster Sort user preference & fallback
  const { data: rosterSettings } = useQuery({
    queryKey: queryKeys.appSettings.roster,
    queryFn: () => settingsService.getRosterSettings(),
  });
  const defaultSort = rosterSettings?.defaultSort ?? 'lastName';
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
      const found = allProfiles.find((p) => p.id === singerId);
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
    handleConfigSave,
    handleConfigDiscard,
  } = useRosterConfigForm({
    setFilter,
    refreshRoster: refresh,
    refreshVoiceParts,
  });

  useEffect(() => {
    if (initialVoicePart) {
      setFilter('voiceParts', [initialVoicePart]);
    }
  }, [initialVoicePart, setFilter]);

  const sortedProfiles = useMemo(() => {
    return sortProfiles(profiles, sortBy, voicePartLabels);
  }, [profiles, sortBy, voicePartLabels]);

  const paginatedProfiles = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedProfiles.slice(startIndex, startIndex + pageSize);
  }, [sortedProfiles, currentPage, pageSize]);

  const handleVoicePartToggle = (part: string) => {
    const active = filters.voiceParts || [];
    const next = active.includes(part) ? active.filter((p) => p !== part) : [...active, part];
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
    <div className="flex w-full flex-col gap-6 pb-8">
      {/* Header Area */}
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Global Roster</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
          Manage choir members, voice parts, sections, and configurations. Import or export roster
          data.
        </p>
      </div>

      {/* Tabs / Actions Navigation Bar */}
      <div className="no-print flex w-full flex-row flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-px">
        <div className="flex gap-3 md:gap-6">
          {(['roster', 'config'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                className={`flex min-h-[44px] cursor-pointer items-center justify-center border-b-2 px-1 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'border-primary text-primary font-bold'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900'
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'roster' ? 'Singer Directory' : 'Roster Settings'}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 pb-1.5">
          {activeTab === 'roster' && (
            <>
              <Button
                onClick={handleExportCSV}
                variant="secondary"
                className=""
                title="Export Roster"
                icon={'⬇️'}
              >
                <span className="hidden md:inline">Export Roster</span>
              </Button>
              <Button
                onClick={() => setIsImportModalOpen(true)}
                variant="secondary"
                className=""
                title="Import CSV"
                icon={'⬆️'}
              >
                <span className="hidden md:inline">Import CSV</span>
              </Button>
              <Button
                onClick={handleAdd}
                variant="primary"
                className=""
                title="Add Singer"
                icon={'➕'}
              >
                <span className="hidden md:inline">Add Singer</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {activeTab === 'roster' ? (
        <>
          <RosterSummary
            profiles={unfilteredByVoicePartProfiles}
            selectedVoiceParts={filters.voiceParts}
            onVoicePartToggle={handleVoicePartToggle}
          />

          <div className="flex flex-row flex-wrap items-end gap-4">
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={filters.name || ''}
              onChange={(e) => setFilter('name', e.target.value)}
              className="min-w-[250px] flex-1"
            >
              {filters.name && (
                <button
                  slot="suffix"
                  type="button"
                  onClick={() => setFilter('name', '')}
                  className="flex items-center rounded-full p-0.5 text-gray-500 hover:text-gray-800"
                  aria-label="Clear search"
                >
                  <svg
                    className="size-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </Input>

            <div ref={voicePartDropdownRef} className="relative w-[200px]">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="bg-surface flex h-11 w-full cursor-pointer flex-row items-center justify-between rounded-lg border border-gray-200 px-3 text-left text-base text-gray-800 shadow-none"
              >
                <span
                  className={`max-w-[145px] truncate ${(filters.voiceParts || []).length > 0 ? 'font-semibold' : 'font-normal'}`}
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
                  className={`text-gray-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : 'rotate-0'}`}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {isDropdownOpen && (
                <div className="bg-surface absolute top-full left-0 z-100 mt-1 flex max-h-80 w-[240px] flex-col gap-0.5 overflow-y-auto rounded-lg border border-gray-200 py-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.06)]">
                  <div className="text-overline px-2.5 py-0.5 text-gray-500">Sections</div>
                  <div className="flex flex-col gap-0">
                    {configSectionsHook.map((sec) => {
                      const isChecked = (filters.voiceParts || []).includes(sec.code);
                      return (
                        <label
                          key={sec.code}
                          className="hover:bg-primary-light flex cursor-pointer items-center gap-2 px-2.5 py-1 transition-colors duration-[0.12s] select-none"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleVoicePartToggle(sec.code)}
                            className="m-0 cursor-pointer"
                          />
                          <span
                            className={`text-xs font-[450] text-gray-800 ${isChecked ? 'text-primary-deep font-[650]' : ''}`}
                          >
                            {sec.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  <Divider />

                  <div className="text-overline px-2.5 py-0.5 text-gray-500">Individual Parts</div>
                  <div className="flex flex-col gap-0">
                    {voicePartLabels.map((part) => {
                      const isChecked = (filters.voiceParts || []).includes(part);
                      return (
                        <label
                          key={part}
                          className="hover:bg-primary-light flex cursor-pointer items-center gap-2 px-2.5 py-1 transition-colors duration-[0.12s] select-none"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleVoicePartToggle(part)}
                            className="m-0 cursor-pointer"
                          />
                          <span
                            className={`text-xs font-[450] text-gray-800 ${isChecked ? 'text-primary-deep font-[650]' : ''}`}
                          >
                            {part}
                          </span>
                        </label>
                      );
                    })}
                    <label className="hover:bg-primary-light col-span-full mt-1 flex cursor-pointer items-center gap-2 border-t border-dashed border-gray-200 px-2.5 py-1 pt-2 transition-colors duration-[0.12s] select-none">
                      <input
                        type="checkbox"
                        checked={(filters.voiceParts || []).includes('__STAFF__')}
                        onChange={() => handleVoicePartToggle('__STAFF__')}
                        className="m-0 cursor-pointer"
                      />
                      <span
                        className={`text-xs font-[450] text-gray-800 ${(filters.voiceParts || []).includes('__STAFF__') ? 'text-primary-deep font-[650]' : ''}`}
                      >
                        Staff / Admin (No Part)
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <Select
              value={filters.status}
              onChange={(e) => setFilter('status', e.target.value)}
              className="!w-[200px]"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Idle">Idle</option>
              <option value="Inactive">Inactive</option>
            </Select>

            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'lastName' | 'voicePart')}
              className="!w-[200px]"
            >
              <option value="lastName">Last Name</option>
              <option value="voicePart">Voice Part + Last Name</option>
            </Select>

            {(filters.name ||
              (filters.voiceParts && filters.voiceParts.length > 0) ||
              filters.status) && (
              <Button
                onClick={() => {
                  setFilter('name', '');
                  setFilter('voiceParts', []);
                  setFilter('status', '');
                }}
                variant="secondary"
                className="flex items-center gap-1"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                  <path d="M3 3v5h5"></path>
                </svg>
                Reset Filters
              </Button>
            )}
          </div>

          <RosterTable
            profiles={paginatedProfiles}
            onEdit={handleEdit}
            onCreate={handleAdd}
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
