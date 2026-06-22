import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { profileService, type Profile, type ProfileInput } from '../../services/profileService';
import { EventRosterTable } from '../../components/admin/EventRosterTable';
import { VoicePartBalanceCard } from '../../components/admin/VoicePartBalanceCard';
import { SingerModal } from '../../components/admin/SingerModal';
import { AppCard } from '../../components/common/AppCard';
import { Button, Modal, Select, Input, ProgressBar } from '../../components/ui';
import { useDialog } from '../../contexts/DialogContext';
import { useAuth } from '../../contexts/AuthContext';
import { useEventRosterData } from '../../hooks/useEventRosterData';
import { useRsvpBulkActions, type BulkRsvpAction } from './event-roster/useRsvpBulkActions';
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
  const queryClient = useQueryClient();

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

  // Selection state
  const [selectedSingerIds, setSelectedSingerIds] = useState<Set<string>>(() => new Set());

  // Prune selection when shown singers change (search/filter)
  const shownSingerIds = useMemo(() => sortedSingers.map((s) => s.profile.id), [sortedSingers]);

  useEffect(() => {
    setSelectedSingerIds((prev) => {
      const shown = new Set(shownSingerIds);
      const next = new Set<string>();
      prev.forEach((id) => {
        if (shown.has(id)) next.add(id);
      });
      // Only update if different to avoid re-renders
      if (next.size === prev.size) {
        let same = true;
        next.forEach((id) => {
          if (!prev.has(id)) same = false;
        });
        if (same) return prev;
      }
      return next;
    });
  }, [shownSingerIds]);

  const selectedCount = selectedSingerIds.size;

  const clearSelection = useCallback(() => {
    setSelectedSingerIds(new Set());
  }, []);

  const handleSelectionChange = useCallback((ids: Set<string>) => {
    setSelectedSingerIds(ids);
  }, []);

  // RSVP bulk actions hook
  const { isUpdating, bulkProgress, bulkActionInProgress, handleUpdateRSVP, handleBulkUpdateRSVP } =
    useRsvpBulkActions({
      eventId,
      refreshRosters,
      dialog,
    });

  const handleBulkAction = useCallback(
    async (action: BulkRsvpAction) => {
      const ids = Array.from(selectedSingerIds);
      const success = await handleBulkUpdateRSVP(action, ids);
      if (success) {
        clearSelection();
      }
    },
    [selectedSingerIds, handleBulkUpdateRSVP, clearSelection]
  );

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

  // Mutations
  const profileSaveMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProfileInput }) =>
      profileService.updateProfile(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all }),
  });

  const profileDeleteMutation = useMutation({
    mutationFn: (id: string) => profileService.deleteProfile(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all }),
  });

  // Singer modal states
  const [isSingerModalOpen, setIsSingerModalOpen] = useState(false);
  const [selectedSingerProfile, setSelectedSingerProfile] = useState<Profile | null>(null);

  if (isLoading || !event) {
    return <div className="p-8 text-center">Loading RSVP details...</div>;
  }

  const handleVoicePartToggle = (part: string) => {
    setSelectedVoiceParts((prev) =>
      prev.includes(part) ? prev.filter((p) => p !== part) : [...prev, part]
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
      await profileSaveMutation.mutateAsync({ id: selectedSingerProfile.id, data: formData });
      await refreshProfiles();
      await refreshRosters();
    } catch (err) {
      console.error('Failed to save singer profile', err);
    }
  };

  const handleSingerModalDelete = async (profile: Profile) => {
    try {
      await profileDeleteMutation.mutateAsync(profile.id);
      await refreshProfiles();
      await refreshRosters();
    } catch (err) {
      console.error('Failed to delete singer profile', err);
    }
  };

  const getBulkButtonLabel = (action: BulkRsvpAction, defaultLabel: string) => {
    if (bulkActionInProgress === action) return 'Updating...';
    return defaultLabel;
  };

  return (
    <AppCard
      title={
        isInline
          ? ''
          : `RSVP Management: ${event ? event.title || event.expand?.venue?.name || '' : ''}`
      }
      actions={
        <div className="flex flex-row items-center gap-2">
          {!isInline && event && (
            <Button
              variant="secondary"
              size="small"
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
            <Button variant="outline" size="small" onClick={() => navigate('/admin/events')}>
              Close
            </Button>
          ) : onClose ? (
            <Button variant="outline" size="small" onClick={onClose}>
              Close
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {voiceParts.length > 0 && (
          <VoicePartBalanceCard
            title="Voice Part RSVP Balance"
            actions={
              <Button onClick={handleExportCSV} variant="secondary" size="small">
                📥 Export CSV
              </Button>
            }
            badges={
              <span className="bg-primary-light text-primary-deep inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold tracking-wider uppercase">
                {rsvpFilter === 'All' && `Total: ${mappedSingers.length} Active`}
                {rsvpFilter === 'Yes' && `Total: ${yesCount} Attending`}
                {rsvpFilter === 'No' && `Total: ${noCount} Declined`}
                {rsvpFilter === 'Pending' && `Total: ${pendingCount} No Response`}
              </span>
            }
            filters={
              <div className="flex flex-row flex-wrap gap-2">
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
            }
            sections={sections.map((sec) => ({
              code: sec.code,
              name: sec.name,
              count: sectionCounts[sec.code] || 0,
              selected: selectedVoiceParts.includes(sec.code),
              onClick: () => handleVoicePartToggle(sec.code),
            }))}
            voiceParts={voiceParts.map((vp) => ({
              label: vp.label,
              count: partCounts.get(vp.label) || 0,
              selected: selectedVoiceParts.includes(vp.label),
              onClick: () => handleVoicePartToggle(vp.label),
            }))}
          />
        )}

        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px_auto] lg:items-center">
              <Input
                type="text"
                placeholder="Search active singers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              >
                <span slot="prefix" className="flex items-center text-gray-500">
                  <svg
                    className="size-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                {searchQuery && (
                  <button
                    slot="suffix"
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="flex items-center rounded-full p-0.5 text-gray-500 hover:text-gray-800"
                    aria-label="Clear search"
                  >
                    <span aria-hidden="true">❌</span>
                  </button>
                )}
              </Input>

              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'lastName' | 'voicePart')}
                className="w-full"
                aria-label="Sort singers"
              >
                <option value="lastName">Sort: Last Name</option>
                <option value="voicePart">Sort: Voice Part + Last Name</option>
              </Select>

              {(searchQuery || selectedVoiceParts.length > 0 || rsvpFilter !== 'All') && (
                <Button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedVoiceParts([]);
                    setRsvpFilter('All');
                  }}
                  variant="outline"
                  className="shrink-0 px-3 whitespace-nowrap"
                >
                  Reset Filters
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
              <span className="text-xs font-bold whitespace-nowrap text-gray-500">
                {sortedSingers.length} shown
              </span>
              {selectedCount > 0 && (
                <span className="text-xs font-semibold whitespace-nowrap text-emerald-600">
                  · {selectedCount} selected
                </span>
              )}
            </div>
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
          selectedSingerIds={selectedSingerIds}
          onSelectionChange={handleSelectionChange}
        />
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white p-3 shadow-2xl sm:bottom-4 sm:border-0 sm:bg-transparent sm:px-4 sm:shadow-none">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 rounded-t-2xl bg-white sm:flex-row sm:items-center sm:justify-between sm:rounded-2xl sm:border sm:border-slate-200 sm:p-3 sm:shadow-xl">
            <div className="text-sm font-semibold text-slate-700">{selectedCount} selected</div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <Button
                type="button"
                variant="primary"
                size="small"
                className="w-full justify-center sm:w-auto"
                disabled={isUpdating}
                onClick={() => handleBulkAction('Yes')}
                aria-label="Mark selected singers attending"
              >
                {getBulkButtonLabel('Yes', 'Mark Attending')}
              </Button>

              <Button
                type="button"
                variant="danger"
                size="small"
                className="w-full justify-center sm:w-auto"
                disabled={isUpdating}
                onClick={() => handleBulkAction('No')}
                aria-label="Mark selected singers declined"
              >
                {getBulkButtonLabel('No', 'Mark Declined')}
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="small"
                className="col-span-2 w-full justify-center sm:col-span-1 sm:w-auto"
                disabled={isUpdating}
                onClick={() => handleBulkAction('Pending')}
                aria-label="Reset RSVPs for selected singers"
              >
                {getBulkButtonLabel('Pending', 'Reset RSVPs')}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="small"
                className="col-span-2 w-full justify-center sm:col-span-1 sm:w-auto"
                disabled={isUpdating}
                onClick={clearSelection}
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
      )}

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
          <div className="border-t-primary size-10 animate-spin rounded-full border-3 border-gray-200" />
          <div className="text-lg font-bold text-gray-800">Processing changes...</div>
          <div className="text-sm font-semibold text-gray-500">
            {bulkProgress ? `Updating singer ${bulkProgress.current} of ${bulkProgress.total}` : ''}
          </div>
          <ProgressBar
            value={bulkProgress ? (bulkProgress.current / bulkProgress.total) * 100 : 0}
            className="mt-1 h-2 w-full [&::part(base)]:rounded"
          />
        </div>
      </Modal>
    </AppCard>
  );
}
