import { useEffect, useMemo, useState } from 'react';
import { useMyEvents } from '../../hooks/useMyEvents';
import { useSeatingChart } from '../../hooks/useSeatingChart';
import { useParams } from 'react-router-dom';
import { PageLayout } from '../../components/common/PageLayout';
import { AppCard } from '../../components/common/AppCard';
import { type Profile } from '../../services/profileService';
import { seatingService, type SeatingSingerProfile } from '../../services/seatingService';
import './SeatingFinderView.css';

type SingerDisplayProfile = Pick<Profile, 'id' | 'name' | 'voicePart'> | SeatingSingerProfile;

type SelectedSeatInfo = {
  row: number;
  seat: number;
  status: 'empty' | 'assignedUnknown' | 'assigned' | 'self';
  name?: string;
  voicePart?: string;
};

export default function SeatingFinderView() {
  type Perspective = 'singer' | 'director';

  const [perspective, setPerspective] = useState<Perspective>(() => {
    return (localStorage.getItem('seating-perspective') as Perspective) || 'singer';
  });

  useEffect(() => {
    localStorage.setItem('seating-perspective', perspective);
  }, [perspective]);

  const { eventId } = useParams();
  const { events, myRosters, myProfile, isLoading: eventsLoading } = useMyEvents();
  const [assignedSingerProfiles, setAssignedSingerProfiles] = useState<SeatingSingerProfile[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<SelectedSeatInfo | null>(null);

  const event = events.find(e => e.id === eventId);
  const venue = event?.expand?.venue;
  const isOpenSeating = venue?.isOpenSeating;
  const address = venue?.address;

  const { 
    chart, 
    charts, 
    activeChartId, 
    setActiveChartId, 
    rowCounts, 
    allProfiles,
    sections,
    voiceParts,
    isLoading: chartLoading 
  } = useSeatingChart(eventId || '', event?.expand?.venue || null);

  const isLoading = eventsLoading || chartLoading;

  useEffect(() => {
    let isCancelled = false;

    if (!eventId || !chart?.id || isOpenSeating) {
      setAssignedSingerProfiles([]);
      return () => {
        isCancelled = true;
      };
    }

    seatingService.getSingerSeatingProfiles(eventId, chart.id)
      .then(profiles => {
        if (!isCancelled) setAssignedSingerProfiles(profiles);
      })
      .catch((err: unknown) => {
        console.error('Failed to load seating profile names', err);
        if (!isCancelled) setAssignedSingerProfiles([]);
      });

    return () => {
      isCancelled = true;
    };
  }, [chart?.id, eventId, isOpenSeating]);

  // Build a profile lookup map from available profile records plus limited seating display summaries.
  const profilesById = useMemo(() => {
    const map = new Map<string, SingerDisplayProfile>();
    allProfiles.forEach(profile => map.set(profile.id, profile));
    assignedSingerProfiles.forEach(profile => map.set(profile.id, profile));
    return map;
  }, [allProfiles, assignedSingerProfiles]);

  if (isLoading) {
    return (
      <div
        className="container"
        style={{ padding: 'var(--space-xl)', textAlign: 'center' }}
      >
        Loading Seating Assignment...
      </div>
    );
  }

  if (!event) {
    return (
      <div
        className="container"
        style={{ padding: 'var(--space-xl)', textAlign: 'center' }}
      >
        Event not found.
      </div>
    );
  }

  const myRoster = eventId ? myRosters[eventId] : undefined;
  const singerProfileId = myProfile?.id || myRoster?.profile || null;

  const assignments = chart?.assignments || {};

  const noAssignmentMessage = !singerProfileId
    ? 'No singer roster/profile link was found for your login. Check with your director to connect your account.'
    : 'No seat assignment has been published for your roster entry yet. Check with your director if you expected one.';

  const seatLocation =
    singerProfileId
      ? Object.entries(assignments).find(([, id]) => id === singerProfileId)
      : null;

  const [row, seat] = seatLocation
    ? seatLocation[0].split('-').map(Number)
    : [null, null];

  // Helper to get singer info
  const getSingerProfile = (singerId: string) => {
    return profilesById.get(singerId) || null;
  };

  // Helper to extract singer initials
  const getSingerInitials = (singerId: string) => {
    const profile = getSingerProfile(singerId);
    if (!profile || !profile.name) return '';
    return profile.name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Helper to get section/voice part color
  const getSingerColor = (singerId: string) => {
    const profile = getSingerProfile(singerId);
    if (!profile) return 'var(--primary)';
    const vp = voiceParts.find(v => v.label === profile.voicePart);
    const sectionCode = vp?.sectionCode || profile.voicePart[0];
    const sec = sections.find(s => s.code === sectionCode);
    return sec?.color || 'var(--primary)';
  };

  type NeighborInfo =
    | { status: 'empty'; profile: null }
    | { status: 'assigned'; profile: SingerDisplayProfile }
    | { status: 'assignedUnknown'; profile: null };

  const getNeighborInfo = (singerId?: string): NeighborInfo => {
    if (!singerId) return { status: 'empty', profile: null };

    const profile = getSingerProfile(singerId);
    if (profile) return { status: 'assigned', profile };

    return { status: 'assignedUnknown', profile: null };
  };

  const getNeighborName = (neighbor: NeighborInfo) => {
    if (neighbor.status === 'empty') return 'Empty Seat';
    if (neighbor.status === 'assignedUnknown') return 'Assigned Singer';
    return neighbor.profile.name;
  };

  const getNeighborPart = (neighbor: NeighborInfo) => {
    return neighbor.status === 'assigned' ? neighbor.profile.voicePart : null;
  };

  // Calculations for Standing Neighbors defensively
  let leftNeighbor: NeighborInfo = { status: 'empty', profile: null };
  let rightNeighbor: NeighborInfo = { status: 'empty', profile: null };

  if (row !== null && seat !== null) {
    const leftId = assignments[`${row}-${seat + 1}`];
    const rightId = assignments[`${row}-${seat - 1}`];

    leftNeighbor = getNeighborInfo(leftId);
    rightNeighbor = getNeighborInfo(rightId);
  }

  const handleSeatSelect = (
    rowIndex: number,
    seatIndex: number,
    singerId?: string
  ) => {
    const isSelf = singerId === singerProfileId;
    const profile = singerId ? getSingerProfile(singerId) : null;

    if (!singerId) {
      setSelectedSeat({
        row: rowIndex,
        seat: seatIndex,
        status: 'empty',
      });
      return;
    }

    if (profile) {
      setSelectedSeat({
        row: rowIndex,
        seat: seatIndex,
        status: isSelf ? 'self' : 'assigned',
        name: profile.name,
        voicePart: profile.voicePart,
      });
      return;
    }

    setSelectedSeat({
      row: rowIndex,
      seat: seatIndex,
      status: 'assignedUnknown',
    });
  };

  return (
    <PageLayout 
      title="Find Your Seat" 
      subtitle={event.title || venue?.name || ''}
      backTo="/"
      maxWidth="1100px"
    >
      <div className="flex-col" style={{ gap: 'var(--space-xl)', padding: 'var(--space-xl) 0' }}>
        {charts.length > 1 && (
          <div className="flex-row" style={{ gap: 'var(--space-xs)', justifyContent: 'center', flexWrap: 'wrap', marginBottom: 'var(--space-xs)' }}>
            {charts.map(c => {
              const isActive = c.id === activeChartId;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveChartId(c.id)}
                  className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontWeight: 700 }}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        )}
        <AppCard>
          {isOpenSeating ? (
            <div className="flex-col" style={{ 
              textAlign: 'center', 
              padding: 'var(--space-xl)', 
              backgroundColor: 'var(--primary-light)', 
              borderRadius: 'var(--radius-lg)', 
              border: '2px solid var(--primary)',
              gap: 'var(--space-sm)'
            }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--primary-deep)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Seating Type</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary-deep)', margin: 'var(--space-sm) 0', lineHeight: 1.2 }}>
                 Open Seating
              </div>
              <div className="text-muted">Find a spot with your section when you arrive.</div>
              {address && (
                <div style={{ marginTop: 'var(--space-md)' }}>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                    📍 Open in Google Maps
                  </a>
                </div>
              )}
            </div>
          ) : row !== null ? (
            <div className="flex-col" style={{ 
              textAlign: 'center', 
              padding: 'var(--space-xl)', 
              backgroundColor: 'var(--primary-light)', 
              borderRadius: 'var(--radius-lg)', 
              border: '2px solid var(--primary)',
              gap: 'var(--space-sm)'
            }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--primary-deep)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Assignment</div>
              <div style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--primary-deep)', margin: 'var(--space-sm) 0', lineHeight: 1 }}>
                 Row {row + 1}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
                Seat {seat! + 1} <span style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-muted)' }}>({seat! + 1} from left, {rowCounts[row] - seat!} from right, looking at stage)</span>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 'var(--space-md)' }}>
              <p className="text-muted">{noAssignmentMessage}</p>
            </div>
          )}
        </AppCard>
 
        {!isOpenSeating && (
          <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
            <h3 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
              Interactive Stage Layout
            </h3>
            
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">Loading Stage Map...</div>
            ) : (
              <div className="stage-container">
                {/* Mirrored Stage Grid Wrapper */}
                <div className="stage-rows-wrapper">
                  {rowCounts.map((count, rIdx) => (
                    <div key={rIdx} className="stage-row">
                      <span className="stage-row-label">Row {rIdx + 1}</span>
                      
                      <div className="stage-seat-row">
                        {Array.from({ length: count }).map((_, sIdx) => {
                          const singerId = assignments[`${rIdx}-${sIdx}`];
                          const isMySeat = singerId === singerProfileId;
                          const profile = singerId ? getSingerProfile(singerId) : null;
                          const initials = profile
                            ? getSingerInitials(singerId)
                            : singerId
                              ? '•'
                              : '';
                          const singerColor = singerId ? getSingerColor(singerId) : 'var(--border)';

                          return (
                            <button
                              key={sIdx}
                              type="button"
                              className={`seat-node ${isMySeat ? 'self' : ''} ${
                                selectedSeat?.row === rIdx && selectedSeat?.seat === sIdx ? 'selected' : ''
                              }`}
                              style={{ 
                                borderColor: singerColor,
                                color: singerId ? 'white' : 'var(--text-muted)',
                                backgroundColor: singerId ? singerColor : 'white',
                              }}
                              onClick={() => handleSeatSelect(rIdx, sIdx, singerId)}
                              aria-label={
                                profile
                                  ? `Row ${rIdx + 1}, seat ${sIdx + 1}, ${profile.name}, ${profile.voicePart}`
                                  : singerId
                                    ? `Row ${rIdx + 1}, seat ${sIdx + 1}, assigned singer`
                                    : `Row ${rIdx + 1}, seat ${sIdx + 1}, empty`
                              }
                            >
                              {initials || ''}
                              {profile ? (
                                <div className="seat-tooltip">
                                  {profile.name} ({profile.voicePart})
                                </div>
                              ) : singerId ? (
                                <div className="seat-tooltip">
                                  Assigned Singer
                                </div>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                      
                      <span className="stage-row-label label-right">Row {rIdx + 1}</span>
                    </div>
                  ))}
                </div>
 
                {/* Stage Front Orienters graphic at the bottom of the stage view */}
                <div className="stage-front-orienter">
                  <div className="stage-podium-arc"></div>
                  <div className="orienter-badges-wrapper">
                    <span className="orienter-badge">🎼 Director & Audience</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Selected Seat Card */}
        {!isOpenSeating && selectedSeat && (
          <AppCard className="selected-seat-card">
            <div className="selected-seat-content">
              <div>
                <div className="selected-seat-eyebrow">
                  Row {selectedSeat.row + 1} • Seat {selectedSeat.seat + 1}
                </div>
                <div className="selected-seat-title">
                  {selectedSeat.status === 'empty' && 'Empty seat'}
                  {selectedSeat.status === 'assignedUnknown' && 'Assigned singer'}
                  {selectedSeat.status === 'assigned' && selectedSeat.name}
                  {selectedSeat.status === 'self' && 'Your seat'}
                </div>
                {selectedSeat.status === 'self' && selectedSeat.name && (
                  <div className="selected-seat-meta">{selectedSeat.name}</div>
                )}
                {selectedSeat.voicePart && (
                  <div className="selected-seat-meta">{selectedSeat.voicePart}</div>
                )}
              </div>

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setSelectedSeat(null)}
              >
                Clear
              </button>
            </div>
          </AppCard>
        )}

        {/* Standing Neighbors HUD Card */}
        {!isOpenSeating && row !== null && seat !== null && (
          <div className="flex-col" style={{ gap: 'var(--space-sm)' }}>
            <h3 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
              Standing Neighbors HUD (Facing Director)
            </h3>
            
            <div className="neighbors-hud-container">
              
              {/* Left Neighbor */}
              <div className={`neighbor-card ${leftNeighbor.status === 'empty' ? 'empty' : ''}`}>
                <div className="neighbor-direction-icon">◀</div>
                <div className="neighbor-details">
                  <span className="neighbor-label">Standing to your Left</span>
                  <span className="neighbor-name">{getNeighborName(leftNeighbor)}</span>
                  {getNeighborPart(leftNeighbor) && (
                    <span className="neighbor-part">{getNeighborPart(leftNeighbor)}</span>
                  )}
                </div>
              </div>

              {/* Right Neighbor */}
              <div className={`neighbor-card ${rightNeighbor.status === 'empty' ? 'empty' : ''}`}>
                <div className="neighbor-direction-icon">▶</div>
                <div className="neighbor-details">
                  <span className="neighbor-label">Standing to your Right</span>
                  <span className="neighbor-name">{getNeighborName(rightNeighbor)}</span>
                  {getNeighborPart(rightNeighbor) && (
                    <span className="neighbor-part">{getNeighborPart(rightNeighbor)}</span>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
