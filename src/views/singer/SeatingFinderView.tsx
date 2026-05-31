import { useState, useEffect } from 'react';
import { useMyEvents } from '../../hooks/useMyEvents';
import { useSeatingChart } from '../../hooks/useSeatingChart';
import { useParams } from 'react-router-dom';
import { PageLayout } from '../../components/common/PageLayout';
import { AppCard } from '../../components/common/AppCard';
import { profileService, type Profile } from '../../services/profileService';
import './SeatingFinderView.css';

export default function SeatingFinderView() {
  const { eventId } = useParams();
  const { events, myRosters, myProfile, isLoading: eventsLoading } = useMyEvents();
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);

  useEffect(() => {
    profileService.getActiveProfiles()
      .then(setAllProfiles)
      .catch(console.error)
      .finally(() => setProfilesLoading(false));
  }, []);

  const event = events.find(e => e.id === eventId);

  const { 
    chart, 
    charts, 
    activeChartId, 
    setActiveChartId, 
    rowCounts, 
    activeProfiles,
    sections,
    voiceParts,
    isLoading: chartLoading 
  } = useSeatingChart(eventId || '', event?.expand?.venue || null);

  const isLoading = eventsLoading || chartLoading || profilesLoading;

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

  const venue = event.expand?.venue;
  const isOpenSeating = venue?.isOpenSeating;
  const address = venue?.address;

  const myRoster = eventId ? myRosters[eventId] : undefined;
  const myRsvp = myRoster?.rsvp || 'Pending';
  const hasRsvpedYes = myRsvp === 'Yes';

  const activeProfileIds = new Set(activeProfiles.map(p => p.id));
  const visibleAssignments = Object.fromEntries(
    Object.entries(chart?.assignments || {}).filter(([, singerId]) =>
      activeProfileIds.has(singerId)
    )
  );

  const noAssignmentMessage = !myProfile
    ? 'No singer profile found for your login. Check with your director to connect your account.'
    : !hasRsvpedYes
      ? 'Seat assignments are only shown after you RSVP Yes for this event. Update your RSVP, or check with your director if you believe this is wrong.'
      : 'No seat assignment has been published for your profile yet. Check with your director if you expected one.';

  const seatLocation =
    myProfile && hasRsvpedYes
      ? Object.entries(visibleAssignments).find(([, id]) => id === myProfile.id)
      : null;

  const [row, seat] = seatLocation
    ? seatLocation[0].split('-').map(Number)
    : [null, null];

  // Helper to extract singer initials
  const getSingerInitials = (singerId: string) => {
    const profile = activeProfiles.find(p => p.id === singerId);
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
    const profile = activeProfiles.find(p => p.id === singerId);
    if (!profile) return 'var(--border)';
    const vp = voiceParts.find(v => v.label === profile.voicePart);
    const sectionCode = vp?.sectionCode || profile.voicePart[0];
    const sec = sections.find(s => s.code === sectionCode);
    return sec?.color || 'var(--primary)';
  };

  // Helper to get singer info
  const getSingerProfile = (singerId: string) => {
    return allProfiles.find(p => p.id === singerId) || null;
  };

  type NeighborInfo =
    | { status: 'empty'; profile: null }
    | { status: 'assigned'; profile: Profile }
    | { status: 'hidden'; profile: null };

  const getNeighborInfo = (singerId?: string): NeighborInfo => {
    if (!singerId) return { status: 'empty', profile: null };

    const profile = getSingerProfile(singerId);
    if (profile) return { status: 'assigned', profile };

    return { status: 'hidden', profile: null };
  };

  // Calculations for Standing Neighbors defensively
  let leftNeighbor: NeighborInfo = { status: 'empty', profile: null };
  let rightNeighbor: NeighborInfo = { status: 'empty', profile: null };

  if (row !== null && seat !== null) {
    const rawAssignments = chart?.assignments || {};
    const leftId = rawAssignments[`${row}-${seat - 1}`];
    const rightId = rawAssignments[`${row}-${seat + 1}`];

    leftNeighbor = getNeighborInfo(leftId);
    rightNeighbor = getNeighborInfo(rightId);
  }

  return (
    <PageLayout 
      title="Find Your Seat" 
      subtitle={event.title || venue?.name || ''}
      backTo="/"
      maxWidth="900px"
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
                Seat {seat! + 1} <span style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-muted)' }}>({seat! + 1} from left, {rowCounts[row] - seat!} from right)</span>
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
                      
                      <div className="flex-row" style={{ gap: '10px' }}>
                        {Array.from({ length: count }).map((_, sIdx) => {
                          const singerId = visibleAssignments[`${rIdx}-${sIdx}`];
                          const isMySeat = hasRsvpedYes && singerId === myProfile?.id;
                          const initials = singerId ? getSingerInitials(singerId) : '';
                          const singerColor = singerId ? getSingerColor(singerId) : 'var(--border)';
                          const profile = singerId ? getSingerProfile(singerId) : null;
 
                          return (
                            <div 
                              key={sIdx} 
                              className={`seat-node ${isMySeat ? 'self' : ''}`}
                              style={{ 
                                borderColor: singerColor,
                                color: singerId ? 'white' : 'var(--text-muted)',
                                backgroundColor: singerId ? singerColor : 'white',
                              }}
                            >
                              {initials || ''}
                              {profile && (
                                <div className="seat-tooltip">
                                  {profile.name} ({profile.voicePart})
                                </div>
                              )}
                            </div>
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

        {/* Standing Neighbors HUD Card */}
        {!isOpenSeating && row !== null && seat !== null && (
          <div className="flex-col" style={{ gap: 'var(--space-sm)' }}>
            <h3 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
              Standing Neighbors HUD
            </h3>
            
            <div className="neighbors-hud-container">
              
              {/* Left Neighbor */}
              <div className={`neighbor-card ${leftNeighbor.status === 'empty' ? 'empty' : ''}`}>
                <div className="neighbor-direction-icon">◀</div>
                <div className="neighbor-details">
                  <span className="neighbor-label">Standing to your Left</span>
                  <span className="neighbor-name">
                    {leftNeighbor.status === 'empty'
                      ? 'Empty Seat'
                      : leftNeighbor.status === 'hidden'
                        ? 'Assigned Singer'
                        : leftNeighbor.profile.name}
                  </span>
                  {leftNeighbor.profile && <span className="neighbor-part">{leftNeighbor.profile.voicePart}</span>}
                </div>
              </div>

              {/* Right Neighbor */}
              <div className={`neighbor-card ${rightNeighbor.status === 'empty' ? 'empty' : ''}`}>
                <div className="neighbor-direction-icon">▶</div>
                <div className="neighbor-details">
                  <span className="neighbor-label">Standing to your Right</span>
                  <span className="neighbor-name">
                    {rightNeighbor.status === 'empty'
                      ? 'Empty Seat'
                      : rightNeighbor.status === 'hidden'
                        ? 'Assigned Singer'
                        : rightNeighbor.profile.name}
                  </span>
                  {rightNeighbor.profile && <span className="neighbor-part">{rightNeighbor.profile.voicePart}</span>}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

