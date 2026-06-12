import { useEffect, useMemo, useState } from 'react';
import { useMyEvents } from '../../hooks/useMyEvents';
import { useSeatingChart } from '../../hooks/useSeatingChart';
import { useParams } from 'react-router-dom';
import { PageLayout } from '../../components/common/PageLayout';
import { AppCard } from '../../components/common/AppCard';
import { Button } from '../../components/ui';
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
        className="container rounded-md border border-border p-4 text-center text-text-muted"
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
    if (!profile) return 'var(--color-primary)';
    const vp = voiceParts.find(v => v.label === profile.voicePart);
    const sectionCode = vp?.sectionCode || profile.voicePart[0];
    const sec = sections.find(s => s.code === sectionCode);
    return sec?.color || 'var(--color-primary)';
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
          <div className="mb-1 flex flex-row flex-wrap justify-center gap-4 p-4">
            {charts.map(c => {
              const isActive = c.id === activeChartId;
              return (
                <Button
                  key={c.id}
                  onClick={() => setActiveChartId(c.id)}
                  variant={isActive ? 'primary' : 'outline'}
                  size="small"
                  className="font-semibold"
                >
                  {c.name}
                </Button>
              );
            })}
          </div>
        )}
        <AppCard>
          {isOpenSeating ? (
            <div className="flex-col rounded-md border border-border bg-bg p-4 text-center">
              <div className="mb-1 text-[0.85rem] font-bold tracking-wider text-primary-deep uppercase">Seating Type</div>
              <div className="text-lg font-semibold text-text-muted">
                 Open Seating
              </div>
              <div className="text-muted">Find a spot with your section when you arrive.</div>
              {address && (
                <div className="flex items-center">
                  <Button 
                    as="a"
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    variant="primary"
                  >
                    📍 Open in Google Maps
                  </Button>
                </div>
              )}
            </div>
          ) : row !== null ? (
            <div className="flex-col rounded-md border border-border bg-bg p-4 text-center">
              <div className="mb-1 text-[0.85rem] font-bold tracking-wider text-primary-deep uppercase">Your Assignment</div>
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
            <div className="mx-auto mb-1 w-max flex-row justify-center gap-1 rounded-md bg-[var(--surface-muted)] p-1">
              <Button
                variant={perspective === 'singer' ? 'primary' : 'outline'}
                size="small"
                onClick={() => setPerspective('singer')}
              >
                Singer View
              </Button>
              <Button
                variant={perspective === 'director' ? 'primary' : 'outline'}
                size="small"
                onClick={() => setPerspective('director')}
              >
                Director View
              </Button>
            </div>
            <h3 className="mb-1 text-center text-lg font-semibold tracking-widest text-text-muted uppercase">
              Interactive Stage Layout
            </h3>
            
            {isLoading ? (
              <div className="p-4 text-center text-text-muted">Loading Stage Map...</div>
            ) : (
              <div className="relative flex flex-col items-center overflow-visible rounded-lg border border-border bg-surface p-8 px-6 shadow-sm">
                {/* Mirrored Stage Grid Wrapper */}
                <div className="mb-8 flex w-full scrollbar-thin flex-col-reverse items-stretch gap-3 overflow-x-auto overflow-y-visible py-[40px] pb-[10px]">
                  {rowCounts.map((count, rIdx) => (
                    <div key={rIdx} className="mx-auto grid w-max min-w-max grid-cols-[72px_max-content_72px] items-center justify-center gap-x-3">
                      <span className="w-auto min-w-18 text-right text-sm font-bold tracking-wider whitespace-nowrap text-text uppercase select-none">Row {rIdx + 1}</span>
                      
                      <div
                        className="flex min-w-max items-center justify-center gap-[10px]"
                        // @allow-inline-style - dynamic flex direction for perspective toggle
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
                          const singerColor = singerId ? getSingerColor(singerId) : 'var(--color-border)';

                          return (
                            <button
                              key={sIdx}
                              type="button"
                              className={[
                                'group appearance-none p-0 w-8 h-8 min-w-8 min-h-8 shrink-0 aspect-square rounded-full flex items-center justify-center text-[0.7rem] font-bold cursor-pointer relative transition-all duration-200 shadow-[0_1px_3px_rgb(0_0_0_/_5%)] hover:scale-120 hover:shadow-[0_4px_10px_rgb(0_0_0_/_10%)] hover:z-10',
                                isMySeat ? 'shadow-[0_0_0_4px_rgba(74,124,89,0.3)] z-[5] !border-primary-deep' : '',
                                selectedSeat?.row === rIdx && selectedSeat?.seat === sIdx ? 'outline-[3px] outline-primary-deep outline-offset-[3px]' : '',
                              ].join(' ')}
                              // @allow-inline-style - dynamic singer seat color from voice part mapping
                              style={{ 
                                borderColor: singerColor,
                                borderWidth: isMySeat ? '2px' : '2px',
                                color: singerId ? 'white' : 'var(--color-text-muted)',
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
                                <div className="pointer-events-none invisible absolute bottom-[130%] left-1/2 z-[100] -translate-x-1/2 translate-y-1 rounded bg-text px-[10px] py-1.5 text-xs font-semibold whitespace-nowrap text-surface opacity-0 shadow-[0_10px_15px_-3px_rgb(0_0_0_/_20%)] transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-5 after:border-solid after:border-text after:border-transparent after:border-x-transparent after:border-t-text after:border-b-transparent after:content-['']">
                                  {profile.name} ({profile.voicePart})
                                </div>
                              ) : singerId ? (
                                <div className="pointer-events-none invisible absolute bottom-[130%] left-1/2 z-[100] -translate-x-1/2 translate-y-1 rounded bg-text px-[10px] py-1.5 text-xs font-semibold whitespace-nowrap text-surface opacity-0 shadow-[0_10px_15px_-3px_rgb(0_0_0_/_20%)] transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-5 after:border-solid after:border-text after:border-transparent after:border-x-transparent after:border-t-text after:border-b-transparent after:content-['']">
                                  Assigned Singer
                                </div>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                      
                      <span className="w-auto min-w-18 text-left text-sm font-bold tracking-wider whitespace-nowrap text-text uppercase select-none">Row {rIdx + 1}</span>
                    </div>
                  ))}
                </div>

                {/* Stage Front Orienters graphic at the bottom of the stage view */}
                <div className="relative flex w-full flex-col items-center gap-2 border-t border-dashed border-border pt-4">
                  <div className="mb-1 h-2 w-60 rounded-[50%] border-b-2 border-primary-deep opacity-30"></div>
                  <div className="flex items-center justify-center gap-8">
                    <span className="flex items-center gap-1.5 rounded-full border border-[rgba(74,124,89,0.2)] bg-primary-light px-3 py-1.5 text-xs font-bold tracking-wider text-primary-deep uppercase shadow-sm select-none">🎼 Director & Audience</span>
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
                <div className="text-[0.72rem] font-extrabold tracking-[0.08em] text-text-muted uppercase max-sm:text-[0.72rem]">
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

              <Button
                type="button"
                variant="outline"
                size="small"
                onClick={() => setSelectedSeat(null)}
              >
                Clear
              </Button>
            </div>
          </AppCard>
        )}

        {/* Standing Neighbors HUD Card */}
        {!isOpenSeating && row !== null && seat !== null && (
          <div className="flex-col gap-4 py-8">
            <div className="flex flex-col items-center">
              <h3 className="mb-1 text-lg font-semibold tracking-widest text-text-muted uppercase">
                Standing Neighbors HUD
              </h3>
              <span className="text-sm text-text-muted italic">
                Always from your perspective facing the director
              </span>
            </div>
            
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              
              {/* Left Neighbor */}
              <div className={`flex items-center gap-4 rounded-lg border border-border bg-surface p-4 shadow-sm transition-all duration-200 hover:border-primary hover:shadow-[0_4px_12px_rgba(74,124,89,0.06)] ${leftNeighbor.status === 'empty' ? '' : ''}`}>
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-light text-xl font-extrabold text-primary-deep ${leftNeighbor.status === 'empty' ? 'bg-slate-100 text-slate-500' : ''}`}>◀</div>
                <div className="flex min-w-0 flex-col gap-[2px]">
                  <span className="text-[0.675rem] font-bold tracking-wider text-text-muted uppercase">Standing to your Left</span>
                  <span className="truncate text-[0.925rem] font-bold text-text">{getNeighborName(leftNeighbor)}</span>
                  {getNeighborPart(leftNeighbor) && (
                    <span className="text-[0.725rem] font-semibold text-primary-deep">{getNeighborPart(leftNeighbor)}</span>
                  )}
                </div>
              </div>

              {/* Right Neighbor */}
              <div className={`flex items-center gap-4 rounded-lg border border-border bg-surface p-4 shadow-sm transition-all duration-200 hover:border-primary hover:shadow-[0_4px_12px_rgba(74,124,89,0.06)] ${rightNeighbor.status === 'empty' ? '' : ''}`}>
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-light text-xl font-extrabold text-primary-deep ${rightNeighbor.status === 'empty' ? 'bg-slate-100 text-slate-500' : ''}`}>▶</div>
                <div className="flex min-w-0 flex-col gap-[2px]">
                  <span className="text-[0.675rem] font-bold tracking-wider text-text-muted uppercase">Standing to your Right</span>
                  <span className="truncate text-[0.925rem] font-bold text-text">{getNeighborName(rightNeighbor)}</span>
                  {getNeighborPart(rightNeighbor) && (
                    <span className="text-[0.725rem] font-semibold text-primary-deep">{getNeighborPart(rightNeighbor)}</span>
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
