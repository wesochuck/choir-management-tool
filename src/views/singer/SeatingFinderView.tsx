import { useEffect, useMemo, useState } from 'react';
import { useMyEvents } from '../../hooks/useMyEvents';
import { useSeatingChart } from '../../hooks/useSeatingChart';
import { useParams } from 'react-router-dom';
import { PageLayout } from '../../components/common/PageLayout';
import { AppCard } from '../../components/common/AppCard';
import { type Profile } from '../../services/profileService';
import { seatingService, type SeatingSingerProfile } from '../../services/seatingService';

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
        className="container p-4 text-center text-text-muted"
      >
        Loading Seating Assignment...
      </div>
    );
  }

  if (!event) {
    return (
      <div
        className="container p-4 text-center text-text-muted border border-border rounded-md"
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
      <div className="flex-col gap-4 py-8">
        {charts.length > 1 && (
          <div className="flex-row gap-4 p-4 flex-wrap justify-center mb-1">
            {charts.map(c => {
              const isActive = c.id === activeChartId;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveChartId(c.id)}
                  className={`btn btn-sm font-semibold text-text-muted ${isActive ? 'btn-primary' : 'btn-ghost'}`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        )}
        <AppCard>
          {isOpenSeating ? (
            <div className="flex-col p-4 border border-border rounded-md bg-bg text-center">
              <div className="text-[0.85rem] font-bold text-primary-deep mb-1 uppercase tracking-wider">Seating Type</div>
              <div className="text-lg font-semibold text-text-muted">
                 Open Seating
              </div>
              <div className="text-muted">Find a spot with your section when you arrive.</div>
              {address && (
                <div className="flex items-center">
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                    📍 Open in Google Maps
                  </a>
                </div>
              )}
            </div>
          ) : row !== null ? (
            <div className="flex-col p-4 border border-border rounded-md bg-bg text-center">
              <div className="text-[0.85rem] font-bold text-primary-deep mb-1 uppercase tracking-wider">Your Assignment</div>
              <div className="text-lg font-semibold text-text-muted">
                 Row {row + 1}
              </div>
              <div className="text-lg font-semibold text-text-muted">
                Seat {seat! + 1} <span className="text-lg font-semibold text-text-muted">
                  ({perspective === 'singer' 
                    ? `${seat! + 1} from left, ${rowCounts[row] - seat!} from right, looking at stage`
                    : `${seat! + 1} from right, ${rowCounts[row] - seat!} from left, looking at choir`
                  })
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-text-muted">
              <p className="text-muted">{noAssignmentMessage}</p>
            </div>
          )}
        </AppCard>
 
        {!isOpenSeating && (
          <div className="flex-col gap-4 py-8">
            <div className="flex-row justify-center gap-1 mb-1 bg-[var(--surface-muted)] p-1 rounded-md w-max mx-auto">
              <button
                className={`btn btn-sm ${perspective === 'singer' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setPerspective('singer')}
              >
                Singer View
              </button>
              <button
                className={`btn btn-sm ${perspective === 'director' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setPerspective('director')}
              >
                Director View
              </button>
            </div>
            <h3 className="text-lg font-semibold text-text-muted mb-1 uppercase tracking-[0.1em] text-center">
              Interactive Stage Layout
            </h3>
            
            {isLoading ? (
              <div className="p-4 text-center text-text-muted">Loading Stage Map...</div>
            ) : (
              <div className="bg-surface border border-border rounded-lg p-8 px-6 shadow-sm flex flex-col items-center relative overflow-visible">
                {/* Mirrored Stage Grid Wrapper */}
                <div className="flex flex-col-reverse gap-3 w-full mb-8 items-stretch overflow-x-auto overflow-y-visible py-[40px] pb-[10px] scrollbar-thin">
                  {rowCounts.map((count, rIdx) => (
                    <div key={rIdx} className="grid grid-cols-[64px_max-content_64px] items-center gap-x-3 justify-center w-max min-w-max mx-auto">
                      <span className="text-xs text-text-muted font-bold w-auto min-w-16 text-right uppercase tracking-wider select-none whitespace-nowrap">Row {rIdx + 1}</span>
                      
                      <div
                        className="flex gap-[10px] items-center justify-center min-w-max"
                        // @allow-inline-style - dynamic flex direction based on perspective toggle
                        style={{
                          flexDirection: perspective === 'director' ? 'row-reverse' : 'row'
                        }}
                      >
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
                              className={[
                                'group appearance-none p-0 w-8 h-8 min-w-8 min-h-8 shrink-0 aspect-square rounded-full flex items-center justify-center text-[0.7rem] font-bold cursor-pointer relative transition-all duration-200 shadow-[0_1px_3px_rgb(0_0_0_/_5%)] hover:scale-120 hover:shadow-[0_4px_10px_rgb(0_0_0_/_10%)] hover:z-10',
                                isMySeat ? 'shadow-[0_0_0_4px_rgba(74,124,89,0.3)] z-[5] !border-primary-deep' : '',
                                selectedSeat?.row === rIdx && selectedSeat?.seat === sIdx ? 'outline-[3px] outline-primary-deep outline-offset-[3px]' : '',
                              ].join(' ')}
                              // @allow-inline-style - dynamic singer color based on voice part/section
                              style={{ 
                                borderColor: singerColor,
                                borderWidth: isMySeat ? '2px' : '2px',
                                color: singerId ? 'white' : 'var(--text-muted)',
                                backgroundColor: singerId ? singerColor : 'white',
                                borderStyle: 'solid',
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
                                <div className="invisible opacity-0 absolute bottom-[130%] left-1/2 -translate-x-1/2 translate-y-1 bg-text text-surface px-[10px] py-1.5 rounded text-xs font-semibold whitespace-nowrap shadow-[0_10px_15px_-3px_rgb(0_0_0_/_20%)] pointer-events-none z-[100] transition-all duration-200 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-5 after:border-solid after:border-text after:border-transparent after:border-t-text after:border-x-transparent after:border-b-transparent">
                                  {profile.name} ({profile.voicePart})
                                </div>
                              ) : singerId ? (
                                <div className="invisible opacity-0 absolute bottom-[130%] left-1/2 -translate-x-1/2 translate-y-1 bg-text text-surface px-[10px] py-1.5 rounded text-xs font-semibold whitespace-nowrap shadow-[0_10px_15px_-3px_rgb(0_0_0_/_20%)] pointer-events-none z-[100] transition-all duration-200 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-5 after:border-solid after:border-text after:border-transparent after:border-t-text after:border-x-transparent after:border-b-transparent">
                                  Assigned Singer
                                </div>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                      
                      <span className="text-xs text-text-muted font-bold w-auto min-w-16 text-left uppercase tracking-wider select-none whitespace-nowrap">Row {rIdx + 1}</span>
                    </div>
                  ))}
                </div>

                {/* Stage Front Orienters graphic at the bottom of the stage view */}
                <div className="flex flex-col items-center gap-2 w-full pt-4 border-t border-dashed border-border relative">
                  <div className="w-60 h-2 rounded-[50%] border-b-2 border-primary-deep opacity-30 mb-1"></div>
                  <div className="flex gap-8 justify-center items-center">
                    <span className="flex items-center gap-1.5 bg-primary-light text-primary-deep border border-[rgba(74,124,89,0.2)] px-3 py-1.5 rounded-full text-[0.75rem] font-bold tracking-wider uppercase shadow-sm select-none">🎼 Director & Audience</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Selected Seat Card */}
        {!isOpenSeating && selectedSeat && (
          <AppCard className="max-sm:block">
            <div className="flex items-center justify-between gap-4 max-sm:flex">
              <div>
                <div className="text-[0.72rem] text-text-muted uppercase tracking-[0.08em] font-extrabold max-sm:text-[0.72rem]">
                  Row {selectedSeat.row + 1} • Seat {selectedSeat.seat + 1}
                </div>
                <div className="text-base font-extrabold text-text max-sm:text-base">
                  {selectedSeat.status === 'empty' && 'Empty seat'}
                  {selectedSeat.status === 'assignedUnknown' && 'Assigned singer'}
                  {selectedSeat.status === 'assigned' && selectedSeat.name}
                  {selectedSeat.status === 'self' && 'Your seat'}
                </div>
                {selectedSeat.status === 'self' && selectedSeat.name && (
                  <div className="text-sm text-text-muted max-sm:text-sm">{selectedSeat.name}</div>
                )}
                {selectedSeat.voicePart && (
                  <div className="text-sm text-text-muted max-sm:text-sm">{selectedSeat.voicePart}</div>
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
          <div className="flex-col gap-4 py-8">
            <div className="flex flex-col items-center">
              <h3 className="text-lg font-semibold text-text-muted mb-1 uppercase tracking-[0.1em]">
                Standing Neighbors HUD
              </h3>
              <span className="text-sm text-text-muted italic">
                Always from your perspective facing the director
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              
              {/* Left Neighbor */}
              <div className={`flex items-center gap-4 p-4 bg-surface border border-border rounded-lg shadow-sm transition-all duration-200 hover:border-primary hover:shadow-[0_4px_12px_rgba(74,124,89,0.06)] ${leftNeighbor.status === 'empty' ? '' : ''}`}>
                <div className={`w-10 h-10 rounded-md bg-primary-light text-primary-deep flex items-center justify-center text-xl font-extrabold shrink-0 ${leftNeighbor.status === 'empty' ? 'bg-slate-100 text-slate-500' : ''}`}>◀</div>
                <div className="flex flex-col gap-[2px] min-w-0">
                  <span className="text-[0.675rem] uppercase tracking-wider text-text-muted font-bold">Standing to your Left</span>
                  <span className="font-bold text-[0.925rem] text-text whitespace-nowrap overflow-hidden text-ellipsis">{getNeighborName(leftNeighbor)}</span>
                  {getNeighborPart(leftNeighbor) && (
                    <span className="text-[0.725rem] text-primary-deep font-semibold">{getNeighborPart(leftNeighbor)}</span>
                  )}
                </div>
              </div>

              {/* Right Neighbor */}
              <div className={`flex items-center gap-4 p-4 bg-surface border border-border rounded-lg shadow-sm transition-all duration-200 hover:border-primary hover:shadow-[0_4px_12px_rgba(74,124,89,0.06)] ${rightNeighbor.status === 'empty' ? '' : ''}`}>
                <div className={`w-10 h-10 rounded-md bg-primary-light text-primary-deep flex items-center justify-center text-xl font-extrabold shrink-0 ${rightNeighbor.status === 'empty' ? 'bg-slate-100 text-slate-500' : ''}`}>▶</div>
                <div className="flex flex-col gap-[2px] min-w-0">
                  <span className="text-[0.675rem] uppercase tracking-wider text-text-muted font-bold">Standing to your Right</span>
                  <span className="font-bold text-[0.925rem] text-text whitespace-nowrap overflow-hidden text-ellipsis">{getNeighborName(rightNeighbor)}</span>
                  {getNeighborPart(rightNeighbor) && (
                    <span className="text-[0.725rem] text-primary-deep font-semibold">{getNeighborPart(rightNeighbor)}</span>
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
