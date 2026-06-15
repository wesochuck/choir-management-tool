import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { profileService, type Profile, type ProfileInput } from '../../services/profileService';
import { EventRosterTable } from '../../components/admin/EventRosterTable';
import { SingerModal } from '../../components/admin/SingerModal';
import { AppCard } from '../../components/common/AppCard';
import { Button, Modal, Select } from '../../components/ui';
import SlProgressBar from '@shoelace-style/shoelace/dist/react/progress-bar/index.js';
import { useDialog } from '../../contexts/DialogContext';
import { useAuth } from '../../contexts/AuthContext';
import { useEventRosterData } from '../../hooks/useEventRosterData';
import { useRsvpBulkActions } from './event-roster/useRsvpBulkActions';
import { useEventRosterExport } from './event-roster/useEventRosterExport';



interface EventRosterViewProps {
  eventIdProp?: string;
  onClose?: () => void;
}

export default function EventRosterView({ eventIdProp, onClose }: EventRosterViewProps = {}) {
  const { eventId: paramEventId } = useParams<{ eventId: string }>();
  const eventId = eventIdProp || paramEventId;
  const isInline = !!eventIdProp;

  const navigate = useNavigate();
  const dialog = useDialog();

  const { user, updatePreferences } = useAuth();

  const {
    event,
    voiceParts,
    sections,
    isLoading,
    searchQuery,
    setSearchQuery,
    selectedVoiceParts,
    setSelectedVoiceParts,
    rsvpFilter,
    setRsvpFilter,
    sortBy,
    setSortBy,
    mappedSingers,
    filteredSingers,
    sortedSingers,
    yesCount,
    noCount,
    pendingCount,
    sectionCounts,
    partCounts,
    refreshProfiles,
    refreshRosters,
    missCounts,
    maxRehearsalMisses,
  } = useEventRosterData({ eventId, isInline });

  // RSVP bulk actions hook
  const {
    isUpdating,
    bulkProgress,
    handleUpdateRSVP,
    handleBulkUpdateRSVP,
  } = useRsvpBulkActions({
    eventId,
    sortedSingers,
    refreshRosters,
    dialog,
  });

  // Event roster export hook
  const { handleExportCSV } = useEventRosterExport({
    event,
    filteredSingers,
    selectedVoiceParts,
    searchQuery,
    rsvpFilter,
    voiceParts,
    sections,
    defaultExportSort: user?.preferences?.rsvpExportSort || 'section',
    updatePreferences,
    dialog,
  });

  // Singer modal states
  const [isSingerModalOpen, setIsSingerModalOpen] = useState(false);
  const [selectedSingerProfile, setSelectedSingerProfile] = useState<Profile | null>(null);

  if (isLoading || !event) {
    return <div className="p-8 text-center">Loading RSVP details...</div>;
  }

  const handleVoicePartToggle = (part: string) => {
    setSelectedVoiceParts(prev => 
      prev.includes(part)
        ? prev.filter(p => p !== part)
        : [...prev, part]
    );
  };

  const handlePhotoChange = () => {
    refreshRosters();
  };

  const handleSingerClick = (profile: Profile) => {
    setSelectedSingerProfile(profile);
    setIsSingerModalOpen(true);
  };

  const handleSingerModalSave = async (formData: ProfileInput) => {
    if (!selectedSingerProfile) return;
    try {
      await profileService.updateProfile(selectedSingerProfile.id, formData);
      await refreshProfiles();
      await refreshRosters();
    } catch (err) {
      console.error('Failed to save singer profile', err);
    }
  };

  const handleSingerModalDelete = async (profile: Profile) => {
    try {
      await profileService.deleteProfile(profile.id);
      await refreshProfiles();
      await refreshRosters();
    } catch (err) {
      console.error('Failed to delete singer profile', err);
    }
  };

  return (
    <AppCard
      title={isInline ? '' : `RSVP Management: ${event ? (event.title || event.expand?.venue?.name || '') : ''}`}
      actions={
        <div className="flex flex-row items-center gap-2">
          {!isInline && event && (
            <Button 
              variant="secondary"
              size="small"
              className="font-semibold"
              onClick={() => {
                const query = new URLSearchParams({
                  eventId: event.id,
                  openModal: 'true',
                });
                navigate(`/admin/events?${query.toString()}`);
              }}
            >
              ✏️ Edit Event
            </Button>
          )}
          {!isInline ? (
            <Button 
              variant="outline"
              size="small"
              onClick={() => navigate('/admin/events')}
            >
              Close
            </Button>
          ) : onClose ? (
            <Button 
              variant="outline"
              size="small"
              onClick={onClose}
            >
              Close
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Voice Part RSVP Balance Summary Card */}
        {voiceParts.length > 0 && (
          <AppCard 
            title="Voice Part RSVP Balance"
            actions={
              <div className="flex flex-row items-center gap-2">
                <Button
                  onClick={handleExportCSV}
                  variant="secondary"
                  size="small"
                  className="font-bold"
                >
                  📥 Export CSV
                </Button>
                <span className="inline-flex items-center rounded-full bg-primary-light px-4 py-1.5 text-sm font-semibold tracking-wider text-primary-deep uppercase">
                  {rsvpFilter === 'All' && `Total: ${mappedSingers.length} Active`}
                  {rsvpFilter === 'Yes' && `Total: ${yesCount} Attending`}
                  {rsvpFilter === 'No' && `Total: ${noCount} Declined`}
                  {rsvpFilter === 'Pending' && `Total: ${pendingCount} No Response`}
                </span>
              </div>
            }
            className="gap-4"
          >
            {/* RSVP Status Filters acting on Voice Part Counts */}
            <div className="flex flex-row flex-wrap gap-2 border-b border-gray-200 pb-2">
              <button
                type="button"
                onClick={() => setRsvpFilter('All')}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors duration-150 ${
                  rsvpFilter === 'All'
                    ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
              >
                👥 All Active ({mappedSingers.length})
              </button>
              <button
                type="button"
                onClick={() => setRsvpFilter('Yes')}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors duration-150 ${
                  rsvpFilter === 'Yes'
                    ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
              >
                🟢 Attending ({yesCount})
              </button>
              <button
                type="button"
                onClick={() => setRsvpFilter('No')}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors duration-150 ${
                  rsvpFilter === 'No'
                    ? 'bg-red-100 text-red-700 ring-1 ring-red-300'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
              >
                🔴 Declined ({noCount})
              </button>
              <button
                type="button"
                onClick={() => setRsvpFilter('Pending')}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors duration-150 ${
                  rsvpFilter === 'Pending'
                    ? 'bg-slate-100 text-slate-700 ring-1 ring-slate-300'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
              >
                ⏳ No Response ({pendingCount})
              </button>
            </div>

            {/* Section Subtotals */}
            <div
              className="grid grid-cols-[repeat(var(--grid-cols),1fr)] gap-4 border-b border-gray-200 pb-4 max-[640px]:grid-cols-2 max-[400px]:grid-cols-1"
              // @allow-inline-style - dynamic grid columns based on section count using CSS variable
              style={{ '--grid-cols': sections.length } as React.CSSProperties}
            >
              {sections.map(sec => {
                const isSelected = selectedVoiceParts.includes(sec.code);
                return (
                  <div
                    key={sec.code}
                    className={`flex cursor-pointer flex-col gap-1 rounded-lg border-2 bg-primary-light p-[calc(16px-2px)] text-center transition-colors duration-150 hover:bg-primary-light/80 ${
                      isSelected
                        ? 'border-primary shadow-[0_0_0_1px_var(--color-primary)]'
                        : 'border-transparent'
                    }`}
                    onClick={() => handleVoicePartToggle(sec.code)}
                  >
                    <div className="text-xs font-bold tracking-wider text-primary-deep uppercase">
                      {sec.name}
                    </div>
                    <div className="text-3xl leading-none font-extrabold text-primary-deep">{sectionCounts[sec.code] || 0}</div>
                  </div>
                );
              })}
            </div>

            {/* Individual Part Breakdowns */}
            <div className="mt-0 grid grid-cols-[repeat(auto-fit,minmax(80px,1fr))] gap-2">
              {voiceParts.map(vp => {
                const isSelected = selectedVoiceParts.includes(vp.label);
                const count = partCounts.get(vp.label) || 0;
                return (
                  <div
                    key={vp.label}
                    className={`flex cursor-pointer flex-col rounded-lg transition-colors duration-150 hover:bg-primary-light ${
                      isSelected
                        ? 'border-2 border-primary bg-primary-light p-[7px]'
                        : 'border border-gray-200 bg-white p-2'
                    }`}
                    onClick={() => handleVoicePartToggle(vp.label)}
                  >
                    <div className="text-xs font-bold">{vp.label}</div>
                    <div className="text-sm font-bold">{count}</div>
                  </div>
                );
              })}
            </div>
          </AppCard>
        )}

        <div className="mt-1 flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-[280px] flex-[1_1_520px] flex-wrap items-center gap-2">
            <div className="relative min-w-[240px] flex-[1_1_280px]">
              <span className="pointer-events-none absolute top-1/2 left-3 flex -translate-y-1/2 text-gray-500" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search active singers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-surface px-[42px] pl-[38px] text-gray-800"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute top-1/2 right-2 inline-flex size-7.5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-none bg-none p-1 text-gray-500 hover:bg-black/5"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>

            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'lastName' | 'voicePart')}
              size="small" className="!w-[210px] !text-base"
              aria-label="Sort singers"
            >
              <option value="lastName">Last Name</option>
              <option value="voicePart">Voice Part + Last Name</option>
            </Select>

            {(searchQuery || selectedVoiceParts.length > 0 || rsvpFilter !== 'All') && (
              <Button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedVoiceParts([]);
                  setRsvpFilter('All');
                }}
                variant="secondary"
                className="flex h-11 items-center gap-1 whitespace-nowrap"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                  <path d="M3 3v5h5"></path>
                </svg>
                Reset Filters
              </Button>
            )}
          </div>

          <div className="flex flex-[0_1_auto] flex-wrap items-center justify-end gap-2" aria-label="Bulk RSVP actions">
            <span className="text-xs font-bold whitespace-nowrap text-gray-500">{sortedSingers.length} shown</span>
            <Button
              disabled={isUpdating || sortedSingers.length === 0}
              onClick={() => handleBulkUpdateRSVP('Yes')}
              variant="primary"
            >
              Mark Attending
            </Button>
            <Button
              disabled={isUpdating || sortedSingers.length === 0}
              onClick={() => handleBulkUpdateRSVP('No')}
              variant="danger"
            >
              Mark Declined
            </Button>
            <Button
              disabled={isUpdating || sortedSingers.length === 0}
              onClick={() => handleBulkUpdateRSVP('Pending')}
              variant="secondary"
            >
              Reset RSVPs
            </Button>
          </div>
        </div>

        {/* Unified Event Roster Table */}
        <EventRosterTable 
          singers={sortedSingers}
          isUpdating={isUpdating}
          onCreate={() => navigate('/admin/roster')}
          onUpdateRSVP={handleUpdateRSVP}
          onPhotoChange={handlePhotoChange}
          onSingerClick={handleSingerClick}
          missCounts={missCounts}
          maxRehearsalMisses={maxRehearsalMisses}
        />
      </div>

      <SingerModal 
        isOpen={isSingerModalOpen}
        onClose={() => setIsSingerModalOpen(false)}
        onSave={handleSingerModalSave}
        onDelete={handleSingerModalDelete}
        initialData={selectedSingerProfile}
      />

      <Modal
        isOpen={bulkProgress !== null}
        onClose={() => {}}
        title="Updating RSVPs"
        maxWidth="400px"
      >
        <div className="flex flex-col items-center gap-4 py-3">
          <div className="size-10 animate-spin rounded-full border-3 border-gray-200 border-t-primary" />
          <div className="text-lg font-bold text-gray-800">
            Processing changes...
          </div>
          <div className="text-sm font-semibold text-gray-500">
            {bulkProgress ? `Updating singer ${bulkProgress.current} of ${bulkProgress.total}` : ''}
          </div>
          <SlProgressBar value={bulkProgress ? (bulkProgress.current / bulkProgress.total) * 100 : 0} className="mt-1 h-2 w-full [&::part(base)]:rounded" />
        </div>
      </Modal>
    </AppCard>
  );
}
