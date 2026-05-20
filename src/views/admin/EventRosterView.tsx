import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventService, type Event } from '../../services/eventService';
import { rosterService, type EventRoster } from '../../services/rosterService';
import { profileService, type Profile } from '../../services/profileService';
import { getVoicePartsAndSections, type VoicePartDef, type SectionDef } from '../../services/settingsService';
import { EventRosterTable } from '../../components/admin/EventRosterTable';
import { AppCard } from '../../components/common/AppCard';
import { useDialog } from '../../contexts/DialogContext';
import { matchesVoiceParts, getSectionFromVoicePart } from '../../lib/voicePartUtils';

export default function EventRosterView() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const dialog = useDialog();

  const [event, setEvent] = useState<Event | null>(null);
  const [activeProfiles, setActiveProfiles] = useState<Profile[]>([]);
  const [eventRoster, setEventRoster] = useState<EventRoster[]>([]);
  const [voiceParts, setVoiceParts] = useState<VoicePartDef[]>([]);
  const [sections, setSections] = useState<SectionDef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVoiceParts, setSelectedVoiceParts] = useState<string[]>([]);
  const [rsvpFilter, setRsvpFilter] = useState<'All' | 'Yes' | 'No' | 'Pending'>('All');

  useEffect(() => {
    if (!eventId) {
      navigate('/admin/events');
      return;
    }

    let isCurrent = true;
    setIsLoading(true);

    Promise.all([
      eventService.getEventById(eventId),
      profileService.getActiveProfiles(),
      rosterService.getEventRoster(eventId),
      getVoicePartsAndSections()
    ])
      .then(([evt, profiles, rosters, settings]) => {
        if (isCurrent) {
          setEvent(evt);
          setActiveProfiles(profiles);
          setEventRoster(rosters);
          setVoiceParts(settings.voiceParts);
          setSections(settings.sections);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load roster data', err);
        if (isCurrent) {
          dialog.showMessage({
            title: 'Event Not Found',
            message: 'The requested event or its RSVP roster could not be loaded.',
            variant: 'danger',
          }).then(() => {
            navigate('/admin/events');
          });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [eventId, navigate, dialog]);

  if (isLoading || !event) {
    return <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>Loading RSVP details...</div>;
  }

  const profileRosterMap = new Map<string, EventRoster>();
  eventRoster.forEach(item => {
    if (item.profile) {
      profileRosterMap.set(item.profile, item);
    }
  });

  const mappedSingers = activeProfiles.map(profile => {
    const roster = profileRosterMap.get(profile.id);
    const rsvp = roster?.rsvp || 'Pending';
    return {
      profile,
      rsvp,
      roster,
    };
  });

  const yesCount = mappedSingers.filter(s => s.rsvp === 'Yes').length;
  const noCount = mappedSingers.filter(s => s.rsvp === 'No').length;
  const pendingCount = mappedSingers.filter(s => s.rsvp === 'Pending').length;

  const activeCountSingers = mappedSingers.filter(s => {
    if (rsvpFilter === 'All') return true;
    return s.rsvp === rsvpFilter;
  });

  const sectionCounts = (() => {
    const counts: Record<string, number> = {};
    sections.forEach(sec => {
      counts[sec.code] = 0;
    });
    activeCountSingers.forEach(s => {
      if (s.profile.voicePart) {
        const vpDef = voiceParts.find(vp => vp.label === s.profile.voicePart);
        const section = vpDef ? vpDef.sectionCode : getSectionFromVoicePart(s.profile.voicePart);
        if (counts[section] !== undefined) {
          counts[section]++;
        } else {
          counts[section] = (counts[section] || 0) + 1;
        }
      }
    });
    return counts;
  })();

  const partCounts = new Map<string, number>();
  voiceParts.forEach(vp => {
    const count = activeCountSingers.filter(s => s.profile.voicePart === vp.label).length;
    partCounts.set(vp.label, count);
  });

  const filteredSingers = mappedSingers.filter(singer => {
    if (rsvpFilter !== 'All' && singer.rsvp !== rsvpFilter) return false;
    
    if (selectedVoiceParts.length > 0) {
      const matchesVoice = matchesVoiceParts(singer.profile.voicePart, selectedVoiceParts, voiceParts);
      if (!matchesVoice) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return singer.profile.name.toLowerCase().includes(q);
    }
    return true;
  });

  const handleVoicePartToggle = (part: string) => {
    setSelectedVoiceParts(prev => 
      prev.includes(part)
        ? prev.filter(p => p !== part)
        : [...prev, part]
    );
  };

  const handleUpdateRSVP = async (profileId: string, nextRsvp: 'Yes' | 'No' | 'Pending') => {
    if (!eventId) return;
    setIsUpdating(true);
    try {
      await rosterService.updateRSVP(eventId, profileId, nextRsvp);
      const rosters = await rosterService.getEventRoster(eventId);
      setEventRoster(rosters);
    } catch (err: unknown) {
      await dialog.showMessage({
        title: 'Could Not Update RSVP',
        message: err instanceof Error ? err.message : 'Failed to update RSVP status',
        variant: 'danger',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePhotoChange = () => {
    if (eventId) {
      rosterService.getEventRoster(eventId).then(setEventRoster);
    }
  };

  return (
    <AppCard
      title={`RSVP Management: ${event.title || event.expand?.venue?.name || ''}`}
      actions={
        <button 
          className="btn btn-ghost btn-sm" 
          onClick={() => navigate('/admin/events')}
        >
          Close
        </button>
      }
    >
      <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
        {/* Voice Part RSVP Balance Summary Card */}
        {voiceParts.length > 0 && (
          <AppCard 
            title="Voice Part RSVP Balance"
            actions={
              <span className="badge badge-rehearsal" style={{ fontSize: 'var(--font-size-label)', padding: '6px 16px', borderRadius: '20px' }}>
                {rsvpFilter === 'All' && `Total: ${mappedSingers.length} Active`}
                {rsvpFilter === 'Yes' && `Total: ${yesCount} Attending`}
                {rsvpFilter === 'No' && `Total: ${noCount} Declined`}
                {rsvpFilter === 'Pending' && `Total: ${pendingCount} No Response`}
              </span>
            }
            style={{ gap: 'var(--space-md)' }}
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
            `}</style>

            {/* RSVP Status Filters acting on Voice Part Counts */}
            <div 
              className="flex-row" 
              style={{ 
                gap: 'var(--space-sm)', 
                flexWrap: 'wrap', 
                paddingBottom: 'var(--space-sm)',
                borderBottom: '1px solid var(--border)'
              }}
            >
              <button
                type="button"
                onClick={() => setRsvpFilter('All')}
                className={`btn btn-sm`}
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
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: `repeat(${sections.length}, 1fr)`, 
              gap: 'var(--space-md)',
              paddingBottom: 'var(--space-md)',
              borderBottom: '1px solid var(--border)'
            }}>
              {sections.map(sec => {
                const isSelected = selectedVoiceParts.includes(sec.code);
                return (
                  <div 
                    key={sec.code} 
                    className={`flex-col voice-section-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleVoicePartToggle(sec.code)}
                    style={{ 
                      textAlign: 'center', 
                      padding: 'calc(var(--space-md) - 2px)', 
                      borderRadius: 'var(--radius-md)', 
                      backgroundColor: 'var(--primary-light)',
                      gap: 'var(--space-xs)',
                      borderWidth: '2px',
                      borderStyle: 'solid',
                      borderColor: isSelected ? 'var(--primary)' : 'transparent'
                    }}
                  >
                    <div className="text-xs" style={{ color: 'var(--primary-deep)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {sec.name}
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-deep)', lineHeight: 1 }}>{sectionCounts[sec.code] || 0}</div>
                  </div>
                );
              })}
            </div>

            {/* Individual Part Breakdowns */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', 
              gap: 'var(--space-sm)',
              marginTop: 0
            }}>
              {voiceParts.map(vp => {
                const isSelected = selectedVoiceParts.includes(vp.label);
                const count = partCounts.get(vp.label) || 0;
                return (
                  <div 
                    key={vp.label} 
                    className={`flex-col voice-part-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleVoicePartToggle(vp.label)}
                    style={{ 
                      textAlign: 'center', 
                      borderRadius: 'var(--radius-sm)', 
                      backgroundColor: 'var(--bg)',
                      gap: '2px',
                      borderStyle: 'solid',
                      borderWidth: isSelected ? '2px' : '1px',
                      padding: isSelected ? 'calc(var(--space-sm) - 1px)' : 'var(--space-sm)'
                    }}
                  >
                    <div className="text-xs text-muted" style={{ fontWeight: 700 }}>{vp.label}</div>
                    <div className="text-label" style={{ fontWeight: 700 }}>{count}</div>
                  </div>
                );
              })}
            </div>
          </AppCard>
        )}

        {/* Filters & Search Row (Positioned closer to the list of names) */}
        <div 
          className="flex-responsive" 
          style={{ 
            gap: 'var(--space-md)', 
            alignItems: 'center', 
            flexWrap: 'wrap',
            borderBottom: '1px solid var(--border)',
            paddingBottom: 'var(--space-md)',
            marginTop: 'var(--space-sm)'
          }}
        >
          {/* Name Search */}
          <div style={{ position: 'relative', flex: '1', minWidth: '240px', maxWidth: '400px' }}>
            <input
              type="text"
              placeholder="Search active singers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
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

          {/* Reset Filters */}
          {(searchQuery || selectedVoiceParts.length > 0 || rsvpFilter !== 'All') && (
            <button 
              onClick={() => {
                setSearchQuery('');
                setSelectedVoiceParts([]);
                setRsvpFilter('All');
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

        {/* Unified Event Roster Table */}
        <EventRosterTable 
          singers={filteredSingers}
          isUpdating={isUpdating}
          onUpdateRSVP={handleUpdateRSVP}
          onPhotoChange={handlePhotoChange}
        />
      </div>
    </AppCard>
  );
}
