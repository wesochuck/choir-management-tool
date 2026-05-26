import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventService, type Event } from '../../services/eventService';
import { rosterService, type EventRoster } from '../../services/rosterService';
import { profileService, type Profile, type ProfileInput } from '../../services/profileService';
import { getVoicePartsAndSections, settingsService, type VoicePartDef, type SectionDef } from '../../services/settingsService';
import { EventRosterTable } from '../../components/admin/EventRosterTable';
import { SingerModal } from '../../components/admin/SingerModal';
import { AppCard } from '../../components/common/AppCard';
import { useDialog } from '../../contexts/DialogContext';
import { matchesVoiceParts, getSectionFromVoicePart } from '../../lib/voicePartUtils';
import { getLastName } from '../../lib/stringUtils';
import { useAuth } from '../../contexts/AuthContext';

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
  const [event, setEvent] = useState<Event | null>(null);
  const [activeProfiles, setActiveProfiles] = useState<Profile[]>([]);
  const [eventRoster, setEventRoster] = useState<EventRoster[]>([]);
  const [voiceParts, setVoiceParts] = useState<VoicePartDef[]>([]);
  const [sections, setSections] = useState<SectionDef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Singer modal states
  const [isSingerModalOpen, setIsSingerModalOpen] = useState(false);
  const [selectedSingerProfile, setSelectedSingerProfile] = useState<Profile | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVoiceParts, setSelectedVoiceParts] = useState<string[]>([]);
  const [rsvpFilter, setRsvpFilter] = useState<'All' | 'Yes' | 'No' | 'Pending'>('All');
  
  // Sorting preference state
  const [defaultSort, setDefaultSort] = useState<'lastName' | 'voicePart'>('lastName');
  const sortBy = user?.preferences?.rsvpSort || defaultSort;
  const handleSortChange = (val: 'lastName' | 'voicePart') => {
    updatePreferences({ rsvpSort: val });
  };

  useEffect(() => {
    if (!eventId) {
      if (!isInline) {
        navigate('/admin/events');
      }
      return;
    }

    let isCurrent = true;
    setIsLoading(true);

    Promise.all([
      eventService.getEventById(eventId),
      profileService.getActiveProfiles(),
      rosterService.getEventRoster(eventId),
      getVoicePartsAndSections(),
      settingsService.getRosterSettings()
    ])
      .then(([evt, profiles, rosters, settings, rosterSettings]) => {
        if (isCurrent) {
          setEvent(evt);
          setActiveProfiles(profiles);
          setEventRoster(rosters);
          setVoiceParts(settings.voiceParts);
          setSections(settings.sections);
          if (rosterSettings && rosterSettings.defaultRsvpSort) {
            setDefaultSort(rosterSettings.defaultRsvpSort);
          }
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load roster data', err);
        if (isCurrent) {
          setIsLoading(false);
          dialog.showMessage({
            title: 'Event Not Found',
            message: 'The requested event or its RSVP roster could not be loaded.',
            variant: 'danger',
          }).then(() => {
            if (!isInline) {
              navigate('/admin/events');
            }
          });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [eventId, navigate, dialog, isInline]);

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

  const sortedSingers = useMemo(() => {
    const parts = voiceParts.map(vp => vp.label);
    return [...filteredSingers].sort((a, b) => {
      const profA = a.profile;
      const profB = b.profile;
      if (sortBy === 'voicePart') {
        const idxA = parts.indexOf(profA.voicePart);
        const idxB = parts.indexOf(profB.voicePart);
        const orderA = idxA === -1 ? 999 : idxA;
        const orderB = idxB === -1 ? 999 : idxB;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
      }
      
      const lastA = getLastName(profA.name);
      const lastB = getLastName(profB.name);
      const cmp = lastA.localeCompare(lastB);
      if (cmp !== 0) return cmp;
      return profA.name.localeCompare(profB.name);
    });
  }, [filteredSingers, sortBy, voiceParts]);

  if (isLoading || !event) {
    return <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>Loading RSVP details...</div>;
  }

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

  const handleBulkUpdateRSVP = async (nextRsvp: 'Yes' | 'No' | 'Pending') => {
    if (!eventId || sortedSingers.length === 0) return;

    const eligibleSingers = sortedSingers.filter(singer => singer.rsvp !== nextRsvp);
    if (eligibleSingers.length === 0) {
      dialog.showToast('Everyone shown already has that RSVP status.');
      return;
    }

    const statusLabel = nextRsvp === 'Yes' ? 'Attending' : nextRsvp === 'No' ? 'Declined' : 'No Response';
    const confirmed = await dialog.confirm({
      title: `Bulk Mark ${statusLabel}`,
      message: `Update ${eligibleSingers.length} displayed singer${eligibleSingers.length === 1 ? '' : 's'} to ${statusLabel}? This only affects the singers currently shown after your filters and search.`,
      confirmLabel: `Mark ${statusLabel}`,
      cancelLabel: 'Cancel',
      variant: nextRsvp === 'No' ? 'warning' : 'info',
    });

    if (!confirmed) return;

    setIsUpdating(true);
    try {
      await rosterService.bulkUpdateRSVP(
        eventId,
        eligibleSingers.map(singer => ({
          profileId: singer.profile.id,
          rsvp: nextRsvp,
        })),
      );
      const rosters = await rosterService.getEventRoster(eventId);
      setEventRoster(rosters);
      dialog.showToast(`Updated ${eligibleSingers.length} RSVP${eligibleSingers.length === 1 ? '' : 's'}.`);
    } catch (err: unknown) {
      await dialog.showMessage({
        title: 'Could Not Bulk Update RSVPs',
        message: err instanceof Error ? err.message : 'Failed to update RSVP statuses',
        variant: 'danger',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePhotoChange = () => {
    if (eventId) {
      rosterService.getEventRoster(eventId).then(setEventRoster).catch(console.error);
    }
  };

  const handleSingerClick = (profile: Profile) => {
    setSelectedSingerProfile(profile);
    setIsSingerModalOpen(true);
  };

  const refreshProfiles = async () => {
    try {
      const activeProfs = await profileService.getActiveProfiles();
      setActiveProfiles(activeProfs);
    } catch (err) {
      console.error('Failed to refresh active profiles', err);
    }
  };

  const handleSingerModalSave = async (formData: ProfileInput) => {
    if (!selectedSingerProfile) return;
    try {
      await profileService.updateProfile(selectedSingerProfile.id, formData);
      await refreshProfiles();
      if (eventId) {
        const rosters = await rosterService.getEventRoster(eventId);
        setEventRoster(rosters);
      }
    } catch (err) {
      console.error('Failed to save singer profile', err);
    }
  };

  const handleSingerModalDelete = async (profile: Profile) => {
    try {
      await profileService.deleteProfile(profile.id);
      await refreshProfiles();
      if (eventId) {
        const rosters = await rosterService.getEventRoster(eventId);
        setEventRoster(rosters);
      }
    } catch (err) {
      console.error('Failed to delete singer profile', err);
    }
  };

  const handleExportCSV = async () => {
    if (!event) return;

    // --- Build filter summary string ---
    const filterParts: string[] = [];
    if (rsvpFilter !== 'All') {
      const label = rsvpFilter === 'Yes' ? 'Attending' : rsvpFilter === 'No' ? 'Declined' : 'No Response';
      filterParts.push(`RSVP: ${label}`);
    }
    if (selectedVoiceParts.length > 0) filterParts.push(`Voice Parts: ${selectedVoiceParts.join(', ')}`);
    if (searchQuery.trim()) filterParts.push(`Search: "${searchQuery.trim()}"`);
    const filterSummary = filterParts.length > 0
      ? filterParts.join(' · ')
      : 'No filters active — all singers included';

    // Determine default sort from user preference
    const defaultExportSort: 'lastName' | 'section' =
      user?.preferences?.rsvpExportSort || 'section';

    // We use a ref on a container div to read the select value at confirm time
    let chosenSort: 'lastName' | 'section' = defaultExportSort;

    const confirmed = await dialog.confirm({
      title: 'Export RSVP Roster to CSV',
      message: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: 'var(--primary-light)', border: '1px solid rgba(74,117,89,0.2)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Exporting {filteredSingers.length} singer{filteredSingers.length !== 1 ? 's' : ''} currently shown
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--primary-deep)', fontWeight: 600 }}>
              {filterSummary}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Sort Order
            </label>
            <select
              id="rsvp-export-sort-select"
              defaultValue={defaultExportSort}
              onChange={(e) => { chosenSort = e.target.value as 'lastName' | 'section'; }}
              style={{ height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', fontSize: '0.9rem', fontWeight: 600 }}
            >
              <option value="lastName">Last Name</option>
              <option value="section">Section → Last Name</option>
            </select>
          </div>
        </div>
      ),
      confirmLabel: '📥 Export CSV',
      cancelLabel: 'Cancel',
      variant: 'info',
    });

    if (!confirmed) return;

    // Persist the chosen sort preference
    await updatePreferences({ rsvpExportSort: chosenSort }).catch(() => undefined);

    // --- Helper functions ---
    const getSectionIndex = (voicePart: string) => {
      const vpDef = voiceParts.find(vp => vp.label === voicePart);
      const secCode = vpDef ? vpDef.sectionCode : getSectionFromVoicePart(voicePart);
      const idx = sections.findIndex(s => s.code === secCode);
      return idx === -1 ? 999 : idx;
    };

    const getSingerSectionName = (voicePart: string) => {
      const vpDef = voiceParts.find(vp => vp.label === voicePart);
      const secCode = vpDef ? vpDef.sectionCode : getSectionFromVoicePart(voicePart);
      const secDef = sections.find(s => s.code === secCode);
      return secDef ? secDef.name : (voicePart ? secCode : 'Unassigned');
    };

    const sortGroup = (singers: typeof filteredSingers) =>
      [...singers].sort((a, b) => {
        if (chosenSort === 'section') {
          const idxA = getSectionIndex(a.profile.voicePart);
          const idxB = getSectionIndex(b.profile.voicePart);
          if (idxA !== idxB) return idxA - idxB;
        }
        const lastA = getLastName(a.profile.name);
        const lastB = getLastName(b.profile.name);
        const cmp = lastA.localeCompare(lastB);
        if (cmp !== 0) return cmp;
        return a.profile.name.localeCompare(b.profile.name);
      });

    // --- Build CSV ---
    const rsvpGroups: Array<{ label: string; status: 'Yes' | 'No' | 'Pending' }> = [
      { label: 'Attending (Yes)', status: 'Yes' },
      { label: 'Declined (No)', status: 'No' },
      { label: 'No Response (Pending)', status: 'Pending' },
    ];

    const q = (str: string) => {
      let val = (str || '').replace(/"/g, '""');
      if (val.match(/^[=+\-@]/)) {
        val = "'" + val; // Add single quote to neutralize formula
      }
      return `"${val}"`;
    };


    const csvLines: string[] = [];
    csvLines.push(['Name', 'Section', 'Voice Part', 'Event Title', 'RSVP Status'].join(','));

    let firstGroup = true;
    rsvpGroups.forEach((group) => {
      const groupSingers = filteredSingers.filter(s => s.rsvp === group.status);
      if (groupSingers.length === 0) return;

      if (!firstGroup) csvLines.push('');
      firstGroup = false;
      csvLines.push([q(group.label), '', '', '', ''].join(','));

      sortGroup(groupSingers).forEach(s => {
        csvLines.push([
          q(s.profile.name),
          q(getSingerSectionName(s.profile.voicePart)),
          q(s.profile.voicePart || 'Not sure'),
          q(event.title || event.type || 'Event'),
          q(s.rsvp),
        ].join(','));
      });
    });

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const sanitizedTitle = (event.title || event.type || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    link.setAttribute('download', `${sanitizedTitle}_rsvp_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <AppCard
      title={isInline ? '' : `RSVP Management: ${event.title || event.expand?.venue?.name || ''}`}
      actions={
        !isInline ? (
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
        ) : null
      }
    >
      <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
        {/* Voice Part RSVP Balance Summary Card */}
        {voiceParts.length > 0 && (
          <AppCard 
            title="Voice Part RSVP Balance"
            actions={
              <div style={{ display: 'flex', flexDirection: 'row', gap: 'var(--space-sm)', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="btn btn-secondary btn-sm"
                  style={{ fontWeight: 700 }}
                >
                  📥 Export CSV
                </button>
                <span className="badge badge-rehearsal" style={{ fontSize: 'var(--font-size-label)', padding: '6px 16px', borderRadius: '20px' }}>
                  {rsvpFilter === 'All' && `Total: ${mappedSingers.length} Active`}
                  {rsvpFilter === 'Yes' && `Total: ${yesCount} Attending`}
                  {rsvpFilter === 'No' && `Total: ${noCount} Declined`}
                  {rsvpFilter === 'Pending' && `Total: ${pendingCount} No Response`}
                </span>
              </div>
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
              onChange={(e) => handleSortChange(e.target.value as 'lastName' | 'voicePart')}
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
        />
      </div>

      <SingerModal 
        isOpen={isSingerModalOpen}
        onClose={() => setIsSingerModalOpen(false)}
        onSave={handleSingerModalSave}
        onDelete={handleSingerModalDelete}
        initialData={selectedSingerProfile}
      />
    </AppCard>
  );
}
