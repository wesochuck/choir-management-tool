import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { profileService, type Profile, type ProfileInput } from '../../services/profileService';
import { EventRosterTable } from '../../components/admin/EventRosterTable';
import { SingerModal } from '../../components/admin/SingerModal';
import { AppCard } from '../../components/common/AppCard';
import { BaseModal } from '../../components/common/BaseModal';
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
        <div className="flex flex-row gap-2 items-center">
          {!isInline && event && (
            <button 
              className="btn btn-secondary btn-sm font-semibold"
              onClick={() => {
                const query = new URLSearchParams({
                  eventId: event.id,
                  openModal: 'true',
                });
                navigate(`/admin/events?${query.toString()}`);
              }}
            >
              ✏️ Edit Event
            </button>
          )}
          {!isInline ? (
            <button 
              className="btn btn-ghost btn-sm" 
              onClick={() => navigate('/admin/events')}
            >
              Close
            </button>
          ) : onClose ? (
            <button 
              className="btn btn-ghost btn-sm" 
              onClick={onClose}
            >
              Close
            </button>
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
              <div className="flex flex-row gap-2 items-center">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="btn btn-secondary btn-sm font-bold"
                >
                  📥 Export CSV
                </button>
                <span className="badge badge-rehearsal text-sm px-4 py-1.5 rounded-full">
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
            <div className="flex flex-row gap-2 flex-wrap pb-2 border-b border-gray-200">
              <button
                type="button"
                onClick={() => setRsvpFilter('All')}
                className={`btn btn-sm`}
                // @allow-inline-style - active RSVP filter state
                style={{
                  height: '38px',
                  padding: '0 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: rsvpFilter === 'All' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  color: rsvpFilter === 'All' ? '#1d4ed8' : 'var(--text-muted)',
                  border: `1px solid ${rsvpFilter === 'All' ? 'rgba(59, 130, 246, 0.3)' : 'var(--border)'}`,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                👥 All Active ({mappedSingers.length})
              </button>
              <button
                type="button"
                onClick={() => setRsvpFilter('Yes')}
                className={`btn btn-sm`}
                // @allow-inline-style - active RSVP filter state
                style={{
                  height: '38px',
                  padding: '0 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: rsvpFilter === 'Yes' ? 'rgba(74, 117, 89, 0.15)' : 'transparent',
                  color: rsvpFilter === 'Yes' ? 'var(--primary-deep)' : 'var(--text-muted)',
                  border: `1px solid ${rsvpFilter === 'Yes' ? 'rgba(74, 117, 89, 0.3)' : 'var(--border)'}`,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                🟢 Attending ({yesCount})
              </button>
              <button
                type="button"
                onClick={() => setRsvpFilter('No')}
                className={`btn btn-sm`}
                // @allow-inline-style - active RSVP filter state
                style={{
                  height: '38px',
                  padding: '0 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: rsvpFilter === 'No' ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                  color: rsvpFilter === 'No' ? '#b91c1c' : 'var(--text-muted)',
                  border: `1px solid ${rsvpFilter === 'No' ? 'rgba(239, 68, 68, 0.2)' : 'var(--border)'}`,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                🔴 Declined ({noCount})
              </button>
              <button
                type="button"
                onClick={() => setRsvpFilter('Pending')}
                className={`btn btn-sm`}
                // @allow-inline-style - active RSVP filter state
                style={{
                  height: '38px',
                  padding: '0 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: rsvpFilter === 'Pending' ? 'rgba(107, 114, 128, 0.08)' : 'transparent',
                  color: rsvpFilter === 'Pending' ? '#4b5563' : 'var(--text-muted)',
                  border: `1px solid ${rsvpFilter === 'Pending' ? 'rgba(107, 114, 128, 0.2)' : 'var(--border)'}`,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ⏳ No Response ({pendingCount})
              </button>
            </div>

            {/* Section Subtotals */}
            <div 
              className="grid gap-4 pb-4 border-b border-gray-200"
              // @allow-inline-style - dynamic grid columns based on section count
              style={{ gridTemplateColumns: `repeat(${sections.length}, 1fr)` }}
            >
              {sections.map(sec => {
                const isSelected = selectedVoiceParts.includes(sec.code);
                return (
                  <div 
                    key={sec.code} 
                    className={`flex flex-col text-center p-[calc(16px-2px)] rounded-lg bg-primary-light gap-1 border-2 transition-all duration-200 ease-in-out cursor-pointer hover:-translate-y-0.5 hover:shadow-sm hover:opacity-90 ${isSelected ? 'border-primary shadow-[0_0_0_1px_var(--primary)]' : 'border-transparent'}`}
                    onClick={() => handleVoicePartToggle(sec.code)}
                    // @allow-inline-style - dynamic border color based on selection
                    style={{ borderColor: isSelected ? 'var(--primary)' : 'transparent' }}
                  >
                    <div className="text-xs text-primary-deep font-bold uppercase tracking-wider">
                      {sec.name}
                    </div>
                    <div className="text-3xl font-extrabold text-primary-deep leading-none">{sectionCounts[sec.code] || 0}</div>
                  </div>
                );
              })}
            </div>

            {/* Individual Part Breakdowns */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(80px,1fr))] gap-2 mt-0">
              {voiceParts.map(vp => {
                const isSelected = selectedVoiceParts.includes(vp.label);
                const count = partCounts.get(vp.label) || 0;
                return (
                  <div 
                    key={vp.label} 
                    className={`flex flex-col rounded-lg bg-white border cursor-pointer transition-all duration-200 ease-in-out hover:border-primary-deep hover:bg-primary-light hover:-translate-y-px ${isSelected ? 'border-primary bg-primary-light' : 'border-gray-200'}`}
                    onClick={() => handleVoicePartToggle(vp.label)}
                    // @allow-inline-style - dynamic border and padding based on selection
                    style={{ 
                      borderWidth: isSelected ? '2px' : '1px',
                      padding: isSelected ? 'calc(8px - 1px)' : '8px'
                    }}
                  >
                    <div className="text-xs font-bold">{vp.label}</div>
                    <div className="text-sm font-semibold font-bold">{count}</div>
                  </div>
                );
              })}
            </div>
          </AppCard>
        )}

        <div className="flex items-start justify-between gap-4 flex-wrap mt-1">
          <div className="flex items-center gap-2 flex-wrap flex-[1_1_520px] min-w-[280px]">
            <div className="relative flex-[1_1_280px] min-w-[240px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 flex pointer-events-none" aria-hidden="true">
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
                className="w-full h-11 px-[42px] pl-[38px] border border-gray-200 rounded-lg bg-white text-gray-800 shadow-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7.5 h-7.5 border-0 rounded bg-transparent text-gray-500 inline-flex items-center justify-center cursor-pointer hover:bg-primary-light hover:text-primary-deep"
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

            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as 'lastName' | 'voicePart')}
              className="w-[210px] h-11 px-3 pr-9 text-gray-800 bg-white border border-gray-200 rounded-lg shadow-sm"
              aria-label="Sort singers"
            >
              <option value="lastName">Last Name</option>
              <option value="voicePart">Voice Part + Last Name</option>
            </select>

            {(searchQuery || selectedVoiceParts.length > 0 || rsvpFilter !== 'All') && (
              <button 
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedVoiceParts([]);
                  setRsvpFilter('All');
                }}
                className="btn btn-secondary h-11 whitespace-nowrap"
              >
                Reset Filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end flex-[0_1_auto]" aria-label="Bulk RSVP actions">
            <span className="text-gray-500 text-xs font-bold whitespace-nowrap">{sortedSingers.length} shown</span>
            <button
              type="button"
              className="btn btn-primary"
              disabled={isUpdating || sortedSingers.length === 0}
              onClick={() => handleBulkUpdateRSVP('Yes')}
            >
              Mark Attending
            </button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={isUpdating || sortedSingers.length === 0}
              onClick={() => handleBulkUpdateRSVP('No')}
            >
              Mark Declined
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={isUpdating || sortedSingers.length === 0}
              onClick={() => handleBulkUpdateRSVP('Pending')}
            >
              Reset RSVPs
            </button>
          </div>
        </div>

        {/* Unified Event Roster Table */}
        <EventRosterTable 
          singers={sortedSingers}
          isUpdating={isUpdating}
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

      <BaseModal
        isOpen={bulkProgress !== null}
        onClose={() => {}}
        title="Updating RSVPs"
        maxWidth="400px"
      >
        <div className="flex flex-col gap-4 items-center py-3">
          <div className="w-10 h-10 border-3 border-gray-200 border-t-primary rounded-full animate-spin" />
          <div className="text-lg font-bold text-gray-800">
            Processing changes...
          </div>
          <div className="text-sm text-gray-500 font-semibold">
            {bulkProgress ? `Updating singer ${bulkProgress.current} of ${bulkProgress.total}` : ''}
          </div>
          <div className="w-full h-2 bg-gray-200 rounded overflow-hidden mt-1">
            <div 
              // @allow-inline-style - dynamic progress width
              style={{ 
                width: bulkProgress ? `${(bulkProgress.current / bulkProgress.total) * 100}%` : '0%', 
                height: '100%', 
                backgroundColor: 'var(--primary)', 
                transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)' 
              }} 
            />
          </div>
        </div>
      </BaseModal>
    </AppCard>
  );
}
