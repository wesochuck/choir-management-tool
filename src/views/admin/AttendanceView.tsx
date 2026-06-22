import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useEvents } from '../../hooks/useEvents';
import { useAttendance } from '../../hooks/useAttendance';
import { useProfiles } from '../../hooks/useProfiles';
import { useDialog } from '../../contexts/DialogContext';
import { SingerModal } from '../../components/admin/SingerModal';
import { AttendanceSingerActionsSheet } from '../../components/admin/AttendanceSingerActionsSheet';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import type { Profile, ProfileInput } from '../../services/profileService';
import { resolveInitialEventId } from '../../lib/eventUtils';
import { useVoiceParts } from '../../hooks/useVoiceParts';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { useRateLimitRetryToast } from '../../hooks/useRateLimitRetryToast';
import { AppCard } from '../../components/common/AppCard';
import { useAttendanceData } from './attendance/useAttendanceData';
import { AttendanceEventSwitcher } from './attendance/AttendanceEventSwitcher';
import { AttendanceProgressBar } from './attendance/AttendanceProgressBar';
import { AttendanceFilterPills } from './attendance/AttendanceFilterPills';
import { AttendanceSectionGroup } from './attendance/AttendanceSectionGroup';
import { AttendanceDeclinedRescue } from './attendance/AttendanceDeclinedRescue';

export default function AttendanceView() {
  const dialog = useDialog();
  const [searchParams] = useSearchParams();
  const { timezone } = useChoirSettings();
  const { events } = useEvents();
  const { profiles, editProfile } = useProfiles();

  const [selectedEventId, setSelectedEventId] = useState('');
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [quickActionsProfile, setQuickActionsProfile] = useState<Profile | null>(null);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [filter, setFilter] = useState<'All' | 'Present' | 'Absent' | 'Unmarked'>('Unmarked');
  const [selectedDeclinedProfileId, setSelectedDeclinedProfileId] = useState('');
  const hasDefaultedRef = useRef(false);

  const { voiceParts, sections } = useVoiceParts();

  const { onRetry: onAttendanceRateLimitRetry, reset: resetAttendanceRateLimitToast } =
    useRateLimitRetryToast('Attendance action is being rate-limited; retrying automatically...');

  const { items, isLoading, error, setAttendance, setRSVP, refresh } = useAttendance(
    selectedEventId,
    {
      onRateLimitRetry: onAttendanceRateLimitRetry,
    }
  );

  const data = useAttendanceData(
    events,
    selectedEventId,
    profiles,
    filter,
    items,
    voiceParts,
    sections
  );

  useEffect(() => {
    if (events.length > 0 && !selectedEventId && !hasDefaultedRef.current) {
      const urlEventId = searchParams.get('eventId');
      const resolved = resolveInitialEventId(events, urlEventId);
      if (resolved) {
        setSelectedEventId(resolved);
        hasDefaultedRef.current = true;
      }
    }
  }, [events, selectedEventId, searchParams]);

  useEffect(() => {
    if (isLoading) {
      resetAttendanceRateLimitToast();
    }
  }, [isLoading, resetAttendanceRateLimitToast]);

  const handleSetAttendance = async (profileId: string, next: 'Present' | 'Absent' | 'Pending') => {
    try {
      const originalItem = items.find((i) => i.profileId === profileId);
      const rosterId = originalItem?.rosterId;
      const rsvpUpdate =
        originalItem && originalItem.rsvp === 'Pending' && next === 'Present' ? 'Yes' : undefined;

      await setAttendance(profileId, next, rosterId, rsvpUpdate);
    } catch (err: unknown) {
      await dialog.showMessage({
        title: 'Could Not Update Attendance',
        message: err instanceof Error ? err.message : 'Failed to update attendance',
        variant: 'danger',
      });
    }
  };

  const handleToggleAttendance = (profileId: string) => {
    const item = items.find((i) => i.profileId === profileId);
    if (!item) return;
    const nextStatus: Record<'Present' | 'Absent' | 'Pending', 'Present' | 'Absent' | 'Pending'> = {
      Pending: 'Present',
      Present: 'Absent',
      Absent: 'Pending',
    };
    handleSetAttendance(profileId, nextStatus[item.attendance]);
  };

  const handleMoreClick = (profileId: string) => {
    const profile = profiles.find((p) => p.id === profileId);
    if (profile) {
      setQuickActionsProfile(profile);
    }
  };

  const handleRescueDeclined = async (profileId: string) => {
    if (!profileId) return;
    try {
      await setRSVP(profileId, 'Yes');
      setSelectedDeclinedProfileId('');
      dialog.showToast(
        'The singer has been successfully set to Attending and added to the check-in list.'
      );
    } catch (err: unknown) {
      await dialog.showMessage({
        title: 'Error Adding Singer',
        message: err instanceof Error ? err.message : 'Failed to update RSVP',
        variant: 'danger',
      });
    }
  };

  const handleSaveProfile = async (data: ProfileInput) => {
    if (!editingProfile) return;
    await editProfile(editingProfile.id, data);
    setEditingProfile(null);
  };

  return (
    <div className="flex w-full flex-col gap-6 pb-8">
      <AdminPageHeader
        title="Attendance Check-in"
        description="Record attendance and check in members for rehearsals and performances."
      />
      <AppCard noPadding>
        {!selectedEventId ? (
          <div className="border-border bg-surface/20 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-24 text-center shadow-xs">
            <span className="text-5xl opacity-40">📅</span>
            <p className="text-text-muted mt-6 text-lg font-semibold">
              Please select an event to start check-in.
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {data.selectedEvent && (
              <AttendanceEventSwitcher
                selectedEvent={data.selectedEvent}
                sortedEvents={data.sortedEvents}
                selectedEventId={selectedEventId}
                setSelectedEventId={setSelectedEventId}
                eventStats={data.eventStats}
                showSwitcher={showSwitcher}
                setShowSwitcher={setShowSwitcher}
                timezone={timezone}
                moduleLoadTime={data.MODULE_LOAD_TIME}
              />
            )}

            <AttendanceProgressBar
              presentCount={data.presentCount}
              expectedCount={data.expectedCount}
            />

            <AttendanceFilterPills filter={filter} setFilter={setFilter} />

            <p className="border-b border-gray-100 bg-gray-50/50 px-4 py-2 text-xs font-medium text-gray-500">
              <span className="md:hidden">Tap to check in. Use ⋯ for details.</span>
              <span className="hidden md:inline">Click row to check in. Use ⋯ for details.</span>
            </p>

            {isLoading ? (
              <div className="border-border bg-surface m-4 rounded-lg border p-12 text-center shadow-xs">
                <p className="text-text-muted m-0 font-medium">Loading attendance data...</p>
              </div>
            ) : error ? (
              <div className="border-danger-text/30 bg-danger-bg m-4 rounded-lg border p-8 text-center shadow-xs">
                <p className="text-danger-text m-0 font-bold">{error}</p>
              </div>
            ) : Object.keys(data.grouped).length === 0 ? (
              <div className="border-border bg-surface/30 m-4 flex flex-col items-center rounded-lg border-2 border-dashed p-12 text-center shadow-xs">
                <span className="text-4xl">🔍</span>
                <h3 className="text-text mt-4 mb-2 text-xl font-extrabold">No Matching Singers</h3>
                <p className="text-text-muted mt-0 mb-6 max-w-sm text-sm font-medium">
                  Try adjusting your filter pills or active event choice.
                </p>
              </div>
            ) : (
              <div className="flex w-full flex-col">
                {Object.entries(data.grouped).map(([section, members]) => (
                  <AttendanceSectionGroup
                    key={section}
                    section={section}
                    members={members}
                    missCounts={data.missCounts}
                    maxRehearsalMisses={data.maxRehearsalMisses}
                    onToggle={handleToggleAttendance}
                    onMore={handleMoreClick}
                  />
                ))}
              </div>
            )}

            <AttendanceDeclinedRescue
              declinedSingers={data.declinedSingers}
              selectedDeclinedProfileId={selectedDeclinedProfileId}
              setSelectedDeclinedProfileId={setSelectedDeclinedProfileId}
              handleRescueDeclined={handleRescueDeclined}
            />
          </div>
        )}
      </AppCard>

      <AttendanceSingerActionsSheet
        profile={quickActionsProfile}
        isOpen={Boolean(quickActionsProfile)}
        onClose={() => setQuickActionsProfile(null)}
        onViewProfile={(profile) => {
          setQuickActionsProfile(null);
          setEditingProfile(profile);
        }}
      />

      <SingerModal
        isOpen={Boolean(editingProfile)}
        onClose={() => {
          setEditingProfile(null);
          refresh();
        }}
        onSave={handleSaveProfile}
        initialData={editingProfile}
      />
    </div>
  );
}
