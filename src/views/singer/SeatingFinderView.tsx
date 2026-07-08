import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { useMyEvents } from '../../hooks/useMyEvents';
import { useParams } from 'react-router-dom';
import { PageLayout } from '../../components/common/PageLayout';
import { AppCard } from '../../components/common/AppCard';
import { Button } from '../../components/ui';
import { type Profile } from '../../services/profileService';
import { seatingService, type SeatingSingerProfile } from '../../services/seatingService';
import { getVoicePartsAndSections } from '../../services/settingsService';
import { useDialog } from '../../contexts/DialogContext';
import { safeLocalStorage } from '../../lib/storage';
import { SeatingPerspectiveToggle } from '../../components/seating/SeatingPerspectiveToggle';
import { ReadOnlySeatingGrid } from '../../components/seating/ReadOnlySeatingGrid';
import { SelectedSeatCard } from '../../components/seating/SelectedSeatCard';
import type { SeatingDisplayProfile } from '../../components/seating/types';
import { useChoirSettings } from '../../hooks/useDocumentTitle';

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
    const saved = safeLocalStorage.getItem('seating-perspective');
    return saved === 'singer' || saved === 'director' ? saved : 'singer';
  });

  useEffect(() => {
    safeLocalStorage.setItem('seating-perspective', perspective);
  }, [perspective]);

  const { eventId } = useParams();
  const { events, myRosters, myProfile, isLoading: eventsLoading } = useMyEvents();
  const [selectedSeat, setSelectedSeat] = useState<SelectedSeatInfo | null>(null);

  const event = events.find((e) => e.id === eventId);
  const venue = event?.expand?.venue;
  const isOpenSeating = venue?.isOpenSeating;
  const address = venue?.address;

  const { performerLabel } = useChoirSettings();
  const dialog = useDialog();

  const chartsQuery = useQuery({
    queryKey: queryKeys.seating.data(eventId ?? '', venue?.id ?? ''),
    queryFn: () => seatingService.getChartsForPerformance(eventId!, venue?.id ?? null),
    enabled: !!eventId,
  });

  const vpSettingsQuery = useQuery({
    queryKey: queryKeys.voiceParts.list(),
    queryFn: () => getVoicePartsAndSections(),
  });

  const vpSettings = vpSettingsQuery.data;

  const sections = useMemo(() => vpSettings?.sections ?? [], [vpSettings?.sections]);
  const voiceParts = useMemo(() => {
    const trackOnlySections = new Set(sections.filter((s) => s.trackOnly).map((s) => s.code));
    return (vpSettings?.voiceParts ?? []).filter((vp) => !trackOnlySections.has(vp.sectionCode));
  }, [vpSettings, sections]);

  const charts = useMemo(() => chartsQuery.data ?? [], [chartsQuery.data]);
  const [activeChartId, setActiveChartId] = useState<string>('');

  useEffect(() => {
    if (!activeChartId && charts.length > 0) {
      setActiveChartId(charts[0].id);
    }
  }, [charts, activeChartId]);

  const activeChart = useMemo(
    () => charts.find((c) => c.id === activeChartId) ?? charts[0] ?? null,
    [charts, activeChartId]
  );

  const rowCounts = activeChart?.layoutOverride ?? venue?.rowCounts ?? [];

  const isLoading = eventsLoading || chartsQuery.isLoading || vpSettingsQuery.isLoading;

  const seatingProfilesQuery = useQuery({
    queryKey: queryKeys.seatingProfiles.byEventAndChart(eventId ?? '', activeChart?.id ?? ''),
    queryFn: () => seatingService.getSingerSeatingProfiles(eventId!, activeChart!.id),
    enabled: !!eventId && !!activeChart?.id && !isOpenSeating,
  });

  useEffect(() => {
    if (seatingProfilesQuery.error) {
      dialog.showToast('Failed to load seating profiles');
    }
  }, [seatingProfilesQuery.error, dialog]);

  const assignedSingerProfiles = useMemo(
    () => seatingProfilesQuery.data ?? [],
    [seatingProfilesQuery.data]
  );

  // Build a profile lookup map from seating profiles assigned to seats.
  const profilesById = useMemo(() => {
    const map = new Map<string, SeatingDisplayProfile>();
    assignedSingerProfiles.forEach((profile) => map.set(profile.id, profile));
    return map;
  }, [assignedSingerProfiles]);

  if (isLoading) {
    return (
      <div className="text-text-muted container p-4 text-center">Loading Seating Assignment...</div>
    );
  }

  if (!event) {
    return (
      <div className="border-border text-text-muted container rounded-md border p-4 text-center">
        Event not found.
      </div>
    );
  }

  const myRoster = eventId ? myRosters[eventId] : undefined;
  const singerProfileId = myProfile?.id || myRoster?.profile || null;

  const assignments = activeChart?.assignments || {};

  const noAssignmentMessage = !singerProfileId
    ? `No ${performerLabel.toLowerCase()} roster/profile link was found for your login. Check with your director to connect your account.`
    : 'No seat assignment has been published for your roster entry yet. Check with your director if you expected one.';

  const seatLocation = singerProfileId
    ? Object.entries(assignments).find(([, id]) => id === singerProfileId)
    : null;

  const [row, seat] = seatLocation ? seatLocation[0].split('-').map(Number) : [null, null];

  // Helper to get singer info
  const getSingerProfile = (singerId: string) => {
    return profilesById.get(singerId) || null;
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
    if (neighbor.status === 'assignedUnknown') return `Assigned ${performerLabel}`;
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

  return (
    <PageLayout
      title="Find Your Seat"
      subtitle={event.title || venue?.name || ''}
      backTo="/dashboard"
      maxWidth="1100px"
    >
      <div className="flex flex-col gap-4 py-8">
        {charts.length > 1 && (
          <div className="mb-1 flex flex-row flex-wrap justify-center gap-4 p-4">
            {charts.map((c) => {
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
            <div className="border-border bg-bg flex flex-col rounded-md border p-4 text-center">
              <div className="text-primary-deep mb-1 text-[0.85rem] font-bold tracking-wider uppercase">
                Seating Type
              </div>
              <div className="text-text-muted text-lg font-semibold">Open Seating</div>
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
          ) : charts.length === 0 ? (
            <div className="text-text-muted p-4 text-center">
              <p className="text-muted">
                Seating has not been posted yet. Check back closer to the performance.
              </p>
            </div>
          ) : row !== null ? (
            <div className="border-border bg-bg flex flex-col rounded-md border p-4 text-center">
              <div className="text-primary-deep mb-1 text-[0.85rem] font-bold tracking-wider uppercase">
                Your Assignment
              </div>
              <div className="text-text-muted text-lg font-semibold">Row {row + 1}</div>
              <div className="text-text-muted text-lg font-semibold">
                Seat {seat! + 1}{' '}
                <span className="text-text-muted text-lg font-semibold">
                  (
                  {perspective === 'singer'
                    ? `${seat! + 1} from left, ${rowCounts[row] - seat!} from right, looking at stage`
                    : `${seat! + 1} from right, ${rowCounts[row] - seat!} from left, looking at choir`}
                  )
                </span>
              </div>
            </div>
          ) : (
            <div className="text-text-muted p-4 text-center">
              <p className="text-muted">{noAssignmentMessage}</p>
            </div>
          )}
        </AppCard>

        {!isOpenSeating && (
          <div className="flex flex-col gap-4 py-8">
            <SeatingPerspectiveToggle value={perspective} onChange={setPerspective} />
            <h3 className="text-text-muted mb-1 text-center text-lg font-semibold tracking-widest uppercase">
              Interactive Stage Layout
            </h3>

            {isLoading ? (
              <div className="text-text-muted p-4 text-center">Loading Stage Map...</div>
            ) : (
              <ReadOnlySeatingGrid
                rowCounts={rowCounts}
                assignments={assignments}
                profilesById={profilesById}
                sections={sections}
                voiceParts={voiceParts}
                perspective={perspective}
                selectedSeat={selectedSeat}
                highlightedProfileId={singerProfileId}
                showVoicePartColors
                onSeatSelect={(seat) => setSelectedSeat(seat)}
              />
            )}
          </div>
        )}

        {selectedSeat && (
          <SelectedSeatCard selectedSeat={selectedSeat} onClear={() => setSelectedSeat(null)} />
        )}

        {/* Standing Neighbors HUD Card */}
        {!isOpenSeating && row !== null && seat !== null && (
          <div className="flex flex-col gap-4 py-8">
            <div className="flex flex-col items-center">
              <h3 className="text-text-muted mb-1 text-lg font-semibold tracking-widest uppercase">
                Standing Neighbors HUD
              </h3>
              <span className="text-text-muted text-sm italic">
                Always from your perspective facing the director
              </span>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Left Neighbor */}
              <div
                className={`border-border bg-surface hover:border-primary flex items-center gap-4 rounded-lg border p-4 shadow-sm transition-all duration-200 hover:shadow-[0_4px_12px_rgba(74,124,89,0.06)] ${leftNeighbor.status === 'empty' ? '' : ''}`}
              >
                <div
                  className={`bg-primary-light text-primary-deep flex size-10 shrink-0 items-center justify-center rounded-md text-xl font-extrabold ${leftNeighbor.status === 'empty' ? 'bg-slate-100 text-slate-500' : ''}`}
                >
                  ◀
                </div>
                <div className="flex min-w-0 flex-col gap-[2px]">
                  <span className="text-overline text-text-muted">Standing to your Left</span>
                  <span className="text-text truncate text-[0.925rem] font-bold">
                    {getNeighborName(leftNeighbor)}
                  </span>
                  {getNeighborPart(leftNeighbor) && (
                    <span className="text-primary-deep text-[0.725rem] font-semibold">
                      {getNeighborPart(leftNeighbor)}
                    </span>
                  )}
                </div>
              </div>

              {/* Right Neighbor */}
              <div
                className={`border-border bg-surface hover:border-primary flex items-center gap-4 rounded-lg border p-4 shadow-sm transition-all duration-200 hover:shadow-[0_4px_12px_rgba(74,124,89,0.06)] ${rightNeighbor.status === 'empty' ? '' : ''}`}
              >
                <div
                  className={`bg-primary-light text-primary-deep flex size-10 shrink-0 items-center justify-center rounded-md text-xl font-extrabold ${rightNeighbor.status === 'empty' ? 'bg-slate-100 text-slate-500' : ''}`}
                >
                  ▶
                </div>
                <div className="flex min-w-0 flex-col gap-[2px]">
                  <span className="text-overline text-text-muted">Standing to your Right</span>
                  <span className="text-text truncate text-[0.925rem] font-bold">
                    {getNeighborName(rightNeighbor)}
                  </span>
                  {getNeighborPart(rightNeighbor) && (
                    <span className="text-primary-deep text-[0.725rem] font-semibold">
                      {getNeighborPart(rightNeighbor)}
                    </span>
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
