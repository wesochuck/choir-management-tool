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
import './EventRosterView.css';


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
    return <div className="event-roster-loading">Loading RSVP details...</div>;
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
        <div className="flex-row event-roster-actions">
          {!isInline && event && (
            <button 
              className="btn btn-secondary btn-sm event-roster-edit-btn"
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
      <div className="flex-col event-roster-controls">
        {/* Voice Part RSVP Balance Summary Card */}
        {voiceParts.length > 0 && (
          <AppCard 
            title="Voice Part RSVP Balance"
            actions={
              <div className="flex-row event-roster-sort-row">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="btn btn-secondary btn-sm event-roster-export-btn"
                >
                  📥 Export CSV
                </button>
                <span className="badge badge-rehearsal event-roster-badge-lg">
                  {rsvpFilter === 'All' && `Total: ${mappedSingers.length} Active`}
                  {rsvpFilter === 'Yes' && `Total: ${yesCount} Attending`}
                  {rsvpFilter === 'No' && `Total: ${noCount} Declined`}
                  {rsvpFilter === 'Pending' && `Total: ${pendingCount} No Response`}
                </span>
              </div>
            }
            className="event-roster-card"
          >
            <style>{`
              .voice-section-card {
                transition: all 0.2s ease-in-out;
                cursor: pointer;
                border: 2px solid transparent;
              }
              .voice-section-card:hover {
                transform: translateY(-2px);
                box-shadow: var(--shadow-sm);
                opacity: 0.9;
              }
              .voice-section-card.selected {
                border-color: var(--primary) !important;
                box-shadow: 0 0 0 1px var(--primary);
              }
              .voice-part-card {
                transition: all 0.2s ease-in-out;
                cursor: pointer;
                border: 1px solid var(--border);
              }
              .voice-part-card:hover {
                border-color: var(--primary-deep);
                background-color: var(--primary-light) !important;
                transform: translateY(-1px);
              }
              .voice-part-card.selected {
                border-color: var(--primary) !important;
                background-color: var(--primary-light) !important;
              }
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>

            {/* RSVP Status Filters acting on Voice Part Counts */}
            <div className="flex-row event-roster-filters-row">
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
              className="event-roster-section-grid"
              // @allow-inline-style - dynamic grid columns based on section count
              style={{ gridTemplateColumns: `repeat(${sections.length}, 1fr)` }}
            >
              {sections.map(sec => {
                const isSelected = selectedVoiceParts.includes(sec.code);
                return (
                  <div 
                    key={sec.code} 
                    className={`flex-col voice-section-card event-roster-section-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleVoicePartToggle(sec.code)}
                    // @allow-inline-style - dynamic border color based on selection
                    style={{ borderColor: isSelected ? 'var(--primary)' : 'transparent' }}
                  >
                    <div className="text-xs event-roster-section-label">
                      {sec.name}
                    </div>
                    <div className="event-roster-section-count">{sectionCounts[sec.code] || 0}</div>
                  </div>
                );
              })}
            </div>

            {/* Individual Part Breakdowns */}
            <div className="event-roster-voice-part-grid">
              {voiceParts.map(vp => {
                const isSelected = selectedVoiceParts.includes(vp.label);
                const count = partCounts.get(vp.label) || 0;
                return (
                  <div 
                    key={vp.label} 
                    className={`flex-col voice-part-card event-roster-voice-part-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleVoicePartToggle(vp.label)}
                    // @allow-inline-style - dynamic border and padding based on selection
                    style={{ 
                      borderWidth: isSelected ? '2px' : '1px',
                      padding: isSelected ? 'calc(var(--space-sm) - 1px)' : 'var(--space-sm)'
                    }}
                  >
                    <div className="text-xs event-roster-voice-part-label">{vp.label}</div>
                    <div className="text-label event-roster-voice-part-count">{count}</div>
                  </div>
                );
              })}
            </div>
          </AppCard>
        )}

        <div className="event-rsvp-toolbar">
          <div className="event-rsvp-search-group">
            <div className="event-rsvp-search-input">
              <span className="event-rsvp-search-icon" aria-hidden="true">
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
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="event-rsvp-clear-search"
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
              className="event-rsvp-sort-select"
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
                className="btn btn-secondary event-rsvp-reset-filters"
              >
                Reset Filters
              </button>
            )}
          </div>

          <div className="event-rsvp-bulk-actions" aria-label="Bulk RSVP actions">
            <span className="event-rsvp-visible-count">{sortedSingers.length} shown</span>
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
        <div className="flex-col event-roster-bulk-progress-wrap">
          <div className="event-roster-spinner" />
          <div className="event-roster-progress-label">
            Processing changes...
          </div>
          <div className="event-roster-progress-text">
            {bulkProgress ? `Updating singer ${bulkProgress.current} of ${bulkProgress.total}` : ''}
          </div>
          <div className="event-roster-progress-bar">
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
