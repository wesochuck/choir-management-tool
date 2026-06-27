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
import { useDues } from '../../hooks/useDues';
import { useAuth } from '../../contexts/AuthContext';
import { useRosterConfigForm } from '../../hooks/useRosterConfigForm';
import { Input } from '../../components/ui';
import { RosterSettingsTab } from '../../components/admin/RosterSettingsTab';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { useVoiceParts } from '../../hooks/useVoiceParts';
import { useRateLimitRetryToast } from '../../hooks/useRateLimitRetryToast';
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
  const [pageSize] = useState(25);

  // Reset to first page when search filters or sorting selections change
  useEffect(() => {
    if (isLoading) {
      resetRosterRateLimitToast();
    }
  }, [isLoading, resetRosterRateLimitToast]);

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
  }, [allProfiles, isLoading, searchParams, setSearchParams, setEditingProfile]);

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

  const handleVoicePartToggle = (part: string) => {
    const active = filters.voiceParts || [];
    const next = active.includes(part) ? active.filter((p) => p !== part) : [...active, part];
    setFilter('voiceParts', next);
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
      <AdminPageHeader
        title="Global Roster"
        description="Manage choir members, voice parts, sections, and configurations. Import or export roster data."
        actions={
          activeTab === 'roster' && (
            <>
              <Button
                onClick={handleExportCSV}
                variant="secondary"
                title="Export Roster"
                icon={'⬇️'}
              >
                <span className="hidden md:inline">Export Roster</span>
              </Button>
              <Button
                onClick={() => setIsImportModalOpen(true)}
                variant="secondary"
                title="Import CSV"
                icon={'⬆️'}
              >
                <span className="hidden md:inline">Import CSV</span>
              </Button>
              <Button onClick={handleAdd} variant="primary" title="Add Singer" icon={'➕'}>
                <span className="hidden md:inline">Add Singer</span>
              </Button>
            </>
          )
        }
        below={
          <div className="flex w-full items-center border-b border-slate-200 pb-px">
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
          </div>
        }
      />

      {activeTab === 'roster' ? (
        <>
          <RosterSummary
            profiles={unfilteredByVoicePartProfiles}
            selectedVoiceParts={filters.voiceParts}
            onVoicePartToggle={handleVoicePartToggle}
          />

          <div className="flex flex-row flex-wrap items-center gap-4">
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

            <Select
              multiple
              placeholder="All Voice Parts"
              value={filters.voiceParts || []}
              onChange={(e) => {
                const val = e.target.value as unknown as string[] | string;
                const arr = Array.isArray(val) ? val : [val].filter(Boolean);
                setFilter('voiceParts', arr);
              }}
              className="!w-[280px]"
            >
              {configSectionsHook.map((sec) => (
                <option key={sec.code} value={sec.code}>
                  {sec.name} (Section)
                </option>
              ))}
              {voicePartLabels.map((part) => (
                <option key={part} value={part}>
                  {part}
                </option>
              ))}
              <option value="__STAFF__">Staff / Admin (No Part)</option>
            </Select>

            <Select
              value={filters.status}
              onChange={(e) => setFilter('status', e.target.value)}
              className="!w-[200px]"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Idle">On Break</option>
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
                icon="🔄"
                className="shrink-0 whitespace-nowrap"
              >
                Reset Filters
              </Button>
            )}
          </div>

          <RosterTable
            profiles={sortedProfiles}
            onEdit={handleEdit}
            onCreate={handleAdd}
            onPhotoChange={refresh}
            currentSeason={currentSeason}
            duesMap={duesMap}
            onToggleDues={toggleDues}
            pageSize={pageSize}
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
