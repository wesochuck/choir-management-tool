import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { AppCard } from '../../components/common/AppCard';
import { AuditionModal } from '../../components/admin/AuditionModal';
import { useDialog } from '../../contexts/DialogContext';
import { auditionService, type Audition, type AuditionInput } from '../../services/auditionService';
import { settingsService, type AuditionSettings } from '../../services/settingsService';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { useEvents } from '../../hooks/useEvents';
import { formatInTimezone, zonedInputValueToUtc, utcToZonedInputValue } from '../../lib/timezone';
import { profileService } from '../../services/profileService';
import { Button, Select, Input, Badge, Modal, Textarea } from '../../components/ui';

export default function AuditionsView() {
  const dialog = useDialog();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { timezone } = useChoirSettings();
  const { performances } = useEvents();

  const handleEmailClick = (email: string, name: string, voicePart: string) => {
    navigate('/admin/communications', {
      state: {
        initialRecipients: [
          {
            id: `audition-${email}`,
            name: name,
            email: email,
            phone: '',
            voicePart: voicePart,
            globalStatus: 'Auditionee',
          },
        ],
        initialSubject: 'Audition Inquiry',
        initialContent: `Dear ${name},\n\n`,
      },
    });
  };

  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'general' | 'slots'>('general');
  // Form draft: only populated when the settings modal is open. Read-only
  // display (status banner, schedule modal) reads settingsQuery.data directly.
  const [settingsDraft, setSettingsDraft] = useState<AuditionSettings | null>(null);
  const [backupDraft, setBackupDraft] = useState<AuditionSettings | null>(null);
  const [editingAudition, setEditingAudition] = useState<Audition | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [performanceFilter, setPerformanceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<Audition['status'][]>(['New', 'Scheduled']);

  // Slot Generator State
  const [genDate, setGenDate] = useState('');
  const [genStart, setGenStart] = useState('18:00');
  const [genEnd, setGenEnd] = useState('20:00');
  const [genInterval, setGenInterval] = useState('15');

  // ── Data queries ──
  const auditionsQuery = useQuery({
    queryKey: queryKeys.auditions.list,
    queryFn: auditionService.getAuditions,
  });

  const settingsQuery = useQuery({
    queryKey: queryKeys.auditions.settings,
    queryFn: settingsService.getAuditionSettings,
  });

  const adminsQuery = useQuery({
    queryKey: queryKeys.users.admins,
    queryFn: () => profileService.getAdminUsers(),
    staleTime: 60000,
  });

  const auditions = auditionsQuery.data ?? [];
  const admins = adminsQuery.data ?? [];
  const isLoading = auditionsQuery.isLoading || settingsQuery.isLoading || adminsQuery.isLoading;

  const generateSlots = () => {
    if (!genDate || !genStart || !genEnd || !genInterval) return;

    const startStr = `${genDate}T${genStart}`;
    const endStr = `${genDate}T${genEnd}`;

    const startUtc = new Date(zonedInputValueToUtc(startStr, timezone));
    const endUtc = new Date(zonedInputValueToUtc(endStr, timezone));

    if (startUtc >= endUtc) {
      dialog.showToast('End time must be after start time.');
      return;
    }

    const intervalMs = parseInt(genInterval) * 60 * 1000;
    const newSlots: string[] = [];

    let current = startUtc;
    while (current < endUtc) {
      newSlots.push(current.toISOString());
      current = new Date(current.getTime() + intervalMs);
    }

    if (settingsDraft) {
      const merged = [...(settingsDraft.slots || []), ...newSlots];
      // deduplicate and sort
      const uniqueSorted = Array.from(new Set(merged)).sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime()
      );
      setSettingsDraft({ ...settingsDraft, slots: uniqueSorted });
    }
  };

  const removeSlot = (slotToRemove: string) => {
    if (settingsDraft) {
      setSettingsDraft({
        ...settingsDraft,
        slots: settingsDraft.slots.filter((s) => s !== slotToRemove),
      });
    }
  };

  // Snapshot the current query data into a fresh draft so the user can edit
  // without mutating the cached server state.
  const openSettings = () => {
    if (settingsQuery.data) {
      const snapshot = JSON.parse(JSON.stringify(settingsQuery.data)) as AuditionSettings;
      setSettingsDraft(snapshot);
      setBackupDraft(snapshot);
    }
    setSettingsTab('general');
    setShowSettings(true);
  };

  // Scheduling Modal State
  const [schedulingAudition, setSchedulingAudition] = useState<Audition | null>(null);
  const [schedSlot, setSchedSlot] = useState('');
  const [schedCustom, setSchedCustom] = useState('');

  const openScheduleModal = (audition: Audition) => {
    setSchedulingAudition(audition);

    // Read from the query (saved settings) — not the in-progress draft.
    const savedSlots = settingsQuery.data?.slots ?? [];
    const prefSlots = audition.requestedSlots || [];
    const matchingSlot = prefSlots.find((s) => savedSlots.includes(s));

    if (matchingSlot) {
      setSchedSlot(matchingSlot);
      setSchedCustom('');
    } else if (audition.scheduledTimeSlot) {
      const isPredefined = savedSlots.includes(audition.scheduledTimeSlot);
      if (isPredefined) {
        setSchedSlot(audition.scheduledTimeSlot);
        setSchedCustom('');
      } else {
        setSchedSlot('__custom__');
        setSchedCustom(audition.scheduledTimeSlot);
      }
    } else if (savedSlots.length > 0) {
      setSchedSlot(savedSlots[0]);
      setSchedCustom('');
    } else {
      setSchedSlot('__custom__');
      setSchedCustom('');
    }
  };

  const confirmSchedule = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    if (!schedulingAudition) return;
    const finalSlot = schedSlot === '__custom__' ? schedCustom.trim() : schedSlot.trim();
    if (!finalSlot) return;

    try {
      await auditionService.updateAudition(schedulingAudition.id, {
        status: 'Scheduled',
        scheduledTimeSlot: finalSlot,
      });
      dialog.showToast('Audition scheduled and confirmation email sent.');
      setSchedulingAudition(null);
      refresh();
    } catch {
      dialog.showMessage({
        title: 'Error',
        message: 'Failed to schedule audition.',
        variant: 'danger',
      });
    }
  };

  const refresh = () => {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.auditions.list }),
      queryClient.invalidateQueries({ queryKey: queryKeys.auditions.settings }),
    ]);
  };

  // Auto-expand settings to guide user if no audition time slots are set.
  // Only fires while the modal is closed so a background refetch does not
  // re-open it after the user has dismissed it.
  useEffect(() => {
    if (!showSettings && settingsQuery.data && !settingsQuery.data.slots?.length) {
      const snapshot = JSON.parse(JSON.stringify(settingsQuery.data)) as AuditionSettings;
      setSettingsDraft(snapshot);
      setBackupDraft(snapshot);
      setSettingsTab('general');
      setShowSettings(true);
    }
  }, [settingsQuery.data, showSettings]);

  const handleSaveSettings = async () => {
    if (!settingsDraft) return;
    setIsSavingSettings(true);
    try {
      await settingsService.saveAuditionSettings(settingsDraft);
      setSettingsDraft(null);
      setBackupDraft(null);
      setShowSettings(false);
      dialog.showToast('Audition settings updated.');
    } catch {
      dialog.showMessage({
        title: 'Error',
        message: 'Failed to save settings.',
        variant: 'danger',
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleCancelSettings = () => {
    setSettingsDraft(null);
    setBackupDraft(null);
    setShowSettings(false);
  };

  const updateStatus = async (audition: Audition, status: Audition['status']) => {
    await auditionService.updateAudition(audition.id, { status });
    refresh();
  };

  const handleSaveAudition = async (id: string | null, data: Partial<Audition>) => {
    try {
      if (id) {
        await auditionService.updateAudition(id, data);
        dialog.showToast('Audition updated.');
      } else {
        const payload: AuditionInput = {
          name: data.name!,
          contact: data.contact!,
          scheduledTimeSlot: data.scheduledTimeSlot,
          requestedSlots: data.requestedSlots,
          voicePart: data.voicePart,
          experience: data.experience,
          performance: data.performance,
          notes: data.notes,
          status: data.status,
        };
        await auditionService.createAudition(payload);
        dialog.showToast('Audition created successfully.');
      }
      setIsModalOpen(false);
      refresh();
    } catch (err: unknown) {
      dialog.showMessage({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to save audition.',
        variant: 'danger',
      });
    }
  };

  const convertToSinger = async (audition: Audition) => {
    const shouldConvert = await dialog.confirm({
      title: 'Convert To Singer',
      message: `Create a singer profile for ${audition.name} and close this audition?`,
      confirmLabel: 'Convert',
    });
    if (!shouldConvert) return;

    try {
      await auditionService.convertAuditionToSinger(audition.id);
      dialog.showToast(`${audition.name} has been added to the choir roster.`);
      refresh();
    } catch (err: unknown) {
      await dialog.showMessage({
        title: 'Conversion Failed',
        message:
          err instanceof Error
            ? err.message
            : 'An error occurred while creating the singer profile.',
        variant: 'danger',
      });
    }
  };

  const removeAudition = async (audition: Audition) => {
    const shouldDelete = await dialog.confirm({
      title: 'Delete Audition',
      message: `Delete audition request for ${audition.name}?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!shouldDelete) return;

    await auditionService.deleteAudition(audition.id);
    refresh();
  };

  const [sortField, setSortField] = useState<'scheduledTimeSlot' | 'name'>('scheduledTimeSlot');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: 'scheduledTimeSlot' | 'name') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAuditions = auditions.filter(
    (a) =>
      (performanceFilter === 'all' || a.performance === performanceFilter) &&
      statusFilter.includes(a.status)
  );

  const sortedAuditions = useMemo(() => {
    return [...filteredAuditions].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'scheduledTimeSlot') {
        const timeA = a.scheduledTimeSlot ? new Date(a.scheduledTimeSlot).getTime() : 0;
        const timeB = b.scheduledTimeSlot ? new Date(b.scheduledTimeSlot).getTime() : 0;

        if (timeA === 0 && timeB === 0) {
          comparison = 0;
        } else if (timeA === 0) {
          comparison = 1; // Put unscheduled items at the end
        } else if (timeB === 0) {
          comparison = -1; // Put unscheduled items at the end
        } else {
          comparison = timeA - timeB;
        }
      } else if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredAuditions, sortField, sortDirection]);

  if (isLoading) return <div className="p-8">Loading auditions...</div>;
  if (auditionsQuery.error)
    return (
      <div className="text-danger-text p-8">
        {auditionsQuery.error instanceof Error
          ? auditionsQuery.error.message
          : 'Could not load auditions data.'}
      </div>
    );

  return (
    <div className="flex flex-col gap-8 py-8">
      {/* Header Area */}
      <div className="border-border flex flex-wrap items-center justify-end gap-2 border-b pb-4">
        <Button
          onClick={() => {
            setEditingAudition(null);
            setIsModalOpen(true);
          }}
          icon={<span className="text-base font-semibold">+</span>}
        >
          Add Audition
        </Button>
      </div>

      {/* Status Banner */}
      {!isLoading && settingsQuery.data && (
        <div
          className={`flex items-center justify-between rounded-xl border p-5 shadow-sm transition-all duration-200 ${
            settingsQuery.data.enabled && settingsQuery.data.defaultPerformanceId
              ? 'border-primary/30 bg-primary/5'
              : 'bg-surface-muted border-border'
          }`}
        >
          <div className="flex flex-row items-center gap-4">
            <div className="bg-surface flex size-8 items-center justify-center rounded-full text-base shadow-sm select-none">
              {settingsQuery.data.enabled && settingsQuery.data.defaultPerformanceId ? '🟢' : '⚪'}
            </div>
            <div className="flex flex-col">
              <div
                className={`text-sm font-bold tracking-wide ${
                  settingsQuery.data.enabled && settingsQuery.data.defaultPerformanceId
                    ? 'text-primary-deep'
                    : 'text-text-muted'
                }`}
              >
                PUBLIC AUDITIONS:{' '}
                {settingsQuery.data.enabled && settingsQuery.data.defaultPerformanceId
                  ? 'OPEN'
                  : 'CLOSED'}
              </div>
              <div className="text-text-muted mt-0.5 text-xs">
                {settingsQuery.data.enabled && settingsQuery.data.defaultPerformanceId ? (
                  <>
                    Accepting requests for:{' '}
                    {performances.find((p) => p.id === settingsQuery.data.defaultPerformanceId)
                      ?.title || 'Selected Performance'}
                    <br />
                    <span className="mt-1 inline-flex items-center gap-1 text-sm">
                      <span>🔗</span>
                      <a
                        href="/auditions"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary-deep font-semibold underline transition-colors"
                      >
                        Link to Public Form
                      </a>
                    </span>
                  </>
                ) : !settingsQuery.data.enabled ? (
                  'The public form is currently disabled.'
                ) : (
                  'A target performance must be selected to open the form.'
                )}
              </div>
            </div>
          </div>
          <Button
            variant={
              settingsQuery.data.enabled && settingsQuery.data.defaultPerformanceId
                ? 'secondary'
                : 'primary'
            }
            onClick={openSettings}
          >
            Configure
          </Button>
        </div>
      )}

      <Modal
        isOpen={showSettings}
        onClose={handleCancelSettings}
        title="Audition Settings"
        maxWidth="640px"
        isDirty={
          backupDraft !== null && JSON.stringify(settingsDraft) !== JSON.stringify(backupDraft)
        }
        footer={
          <div className="flex w-full items-center justify-between gap-4">
            <div className="text-left">
              {(!settingsDraft || !settingsDraft.slots || settingsDraft.slots.length === 0) && (
                <span className="text-danger-text text-xs font-semibold">
                  ⚠️ Configure at least one time slot to save.
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancelSettings}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveSettings}
                loading={isSavingSettings}
                disabled={
                  !settingsDraft || !settingsDraft.slots || settingsDraft.slots.length === 0
                }
              >
                Save Settings
              </Button>
            </div>
          </div>
        }
      >
        {settingsDraft && (
          <div className="flex flex-col gap-4">
            {/* Tabs Header */}
            <div className="border-border mb-2 flex flex-row gap-4 border-b">
              <button
                type="button"
                onClick={() => setSettingsTab('general')}
                className={`flex min-h-[40px] cursor-pointer items-center justify-center border-none bg-transparent px-4 py-2 text-sm transition-all duration-200 ${
                  settingsTab === 'general'
                    ? 'border-primary text-primary border-b-2 font-bold'
                    : 'text-text-muted border-b-2 border-transparent font-medium'
                }`}
              >
                General Settings
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab('slots')}
                className={`flex min-h-[40px] cursor-pointer items-center justify-center border-none bg-transparent px-4 py-2 text-sm transition-all duration-200 ${
                  settingsTab === 'slots'
                    ? 'border-primary text-primary border-b-2 font-bold'
                    : 'text-text-muted border-b-2 border-transparent font-medium'
                }`}
              >
                Time Slots
                {(!settingsDraft.slots || settingsDraft.slots.length === 0) && (
                  <span
                    className="text-danger-text ml-1.5 inline-flex items-center justify-center text-xs font-bold"
                    title="No time slots configured"
                  >
                    ⚠️
                  </span>
                )}
              </button>
            </div>

            {/* Tab 1: General Settings */}
            {settingsTab === 'general' && (
              <div className="flex flex-col gap-6">
                <label className="flex cursor-pointer flex-row items-center gap-2 self-start select-none">
                  <input
                    type="checkbox"
                    checked={settingsDraft.enabled}
                    onChange={(e) =>
                      setSettingsDraft({ ...settingsDraft, enabled: e.target.checked })
                    }
                    className="border-border text-primary accent-primary focus:ring-primary size-5 cursor-pointer rounded transition-all duration-200"
                  />
                  <span className="text-text text-sm font-semibold">
                    Accept public audition requests
                  </span>
                </label>

                <div className="flex flex-col gap-1">
                  <label className="text-text text-sm font-semibold">Target Performance</label>
                  <Select
                    value={settingsDraft.defaultPerformanceId || ''}
                    onChange={(e) =>
                      setSettingsDraft({ ...settingsDraft, defaultPerformanceId: e.target.value })
                    }
                  >
                    <option value="">-- No performance assigned --</option>
                    {performances.map((p) => (
                      <option key={p.id} value={p.id}>
                        {formatInTimezone(p.date, timezone, {
                          year: 'numeric',
                          month: 'numeric',
                          day: 'numeric',
                        })}{' '}
                        - {p.title}
                      </option>
                    ))}
                  </Select>
                  <p className="text-text-muted m-0 mt-1 text-xs">
                    A target performance is <strong className="text-text">REQUIRED</strong> for the
                    public audition form to accept requests.
                  </p>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-text text-sm font-semibold">Confirmation Message</label>
                  <Textarea
                    value={settingsDraft.confirmationMessage}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                      setSettingsDraft({ ...settingsDraft, confirmationMessage: e.target.value })
                    }
                    className="min-h-[80px]"
                  />
                </div>

                <div className="border-border flex flex-col gap-2 border-t pt-4">
                  <label className="flex cursor-pointer flex-row items-center gap-2 self-start select-none">
                    <input
                      type="checkbox"
                      checked={settingsDraft.adminNotifyEnabled || false}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          adminNotifyEnabled: e.target.checked,
                          adminNotifyUsers: settingsDraft.adminNotifyUsers || [],
                        })
                      }
                      className="border-border text-primary accent-primary focus:ring-primary size-5 cursor-pointer rounded transition-all duration-200"
                    />
                    <span className="text-text text-sm font-semibold">
                      Notify administrators of new submissions
                    </span>
                  </label>

                  {settingsDraft.adminNotifyEnabled && (
                    <div className="flex flex-col gap-1 pl-7">
                      <span className="text-overline text-text-muted">
                        Select Administrators to Notify
                      </span>
                      <div className="mt-1 flex flex-col gap-2">
                        {admins.map((admin) => {
                          const isChecked = (settingsDraft.adminNotifyUsers || []).includes(
                            admin.id
                          );
                          return (
                            <label
                              key={admin.id}
                              className="flex cursor-pointer flex-row items-center gap-2 select-none"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const currentUsers = settingsDraft.adminNotifyUsers || [];
                                  const updatedUsers = e.target.checked
                                    ? [...currentUsers, admin.id]
                                    : currentUsers.filter((id) => id !== admin.id);
                                  setSettingsDraft({
                                    ...settingsDraft,
                                    adminNotifyUsers: updatedUsers,
                                  });
                                }}
                                className="border-border text-primary accent-primary focus:ring-primary size-4 cursor-pointer rounded transition-all duration-200"
                              />
                              <span className="text-text text-sm">
                                {admin.name} ({admin.email})
                              </span>
                            </label>
                          );
                        })}
                        {admins.length === 0 && (
                          <span className="text-text-muted text-xs">
                            No administrative accounts found.
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: Time Slots */}
            {settingsTab === 'slots' && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-1">
                  <label className="text-text flex items-center gap-1.5 text-sm font-semibold">
                    <span>Available Audition Times</span>
                    {(!settingsDraft.slots || settingsDraft.slots.length === 0) && (
                      <span className="bg-danger-bg text-danger-text inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold tracking-wider uppercase">
                        Required
                      </span>
                    )}
                  </label>

                  <div className="bg-surface-muted border-border rounded-xl border p-5 shadow-sm">
                    <div className="flex flex-col gap-3">
                      <span className="text-overline text-text-muted">Generate Slots</span>
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] items-end gap-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-text-muted text-xs font-medium">Date</span>
                          <Input
                            type="date"
                            value={genDate}
                            onChange={(e) => setGenDate(e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-text-muted text-xs font-medium">Start Time</span>
                          <Input
                            type="time"
                            value={genStart}
                            onChange={(e) => setGenStart(e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-text-muted text-xs font-medium">End Time</span>
                          <Input
                            type="time"
                            value={genEnd}
                            onChange={(e) => setGenEnd(e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-text-muted text-xs font-medium">
                            Interval (mins)
                          </span>
                          <Select
                            value={genInterval}
                            onChange={(e) => setGenInterval(e.target.value)}
                          >
                            <option value="10">10</option>
                            <option value="15">15</option>
                            <option value="20">20</option>
                            <option value="30">30</option>
                          </Select>
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={generateSlots}
                          disabled={!genDate || !genStart || !genEnd}
                        >
                          Generate
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {settingsDraft.slots?.map((slot) => (
                      <div
                        key={slot}
                        className="border-border bg-surface hover:border-primary/50 flex w-full items-center justify-between gap-2 rounded-full border px-4 py-1.5 text-sm shadow-sm transition-colors"
                      >
                        <span className="text-text font-medium">
                          {formatInTimezone(slot, timezone, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSlot(slot)}
                          className="text-text-muted hover:text-danger-text cursor-pointer border-none bg-transparent p-0 text-base leading-none transition-colors"
                          title="Remove slot"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>

                  {(!settingsDraft.slots || settingsDraft.slots.length === 0) && (
                    <p className="text-danger-text m-0 mt-3 text-xs font-medium">
                      ⚠️ Generate at least one audition time slot so applicants can schedule their
                      audition.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Filters Bar */}
      <div className="border-border bg-surface flex flex-wrap items-end justify-between gap-4 rounded-xl border p-4 shadow-sm">
        <div className="flex flex-1 flex-wrap items-center gap-4">
          <div className="flex min-w-[280px] flex-col gap-1">
            <label className="text-label">Filter by Performance</label>
            <Select
              value={performanceFilter}
              onChange={(e) => setPerformanceFilter(e.target.value)}
            >
              <option value="all">All Auditions</option>
              {performances.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatInTimezone(p.date, timezone, {
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric',
                  })}{' '}
                  - {p.title}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label">Filter by Status</label>
            <div className="border-border bg-surface flex h-[44px] flex-row flex-wrap items-center gap-4 rounded-md border px-4">
              {(['New', 'Scheduled', 'Closed'] as Audition['status'][]).map((status) => {
                const isChecked = statusFilter.includes(status);
                return (
                  <label
                    key={status}
                    className="text-text flex cursor-pointer flex-row items-center gap-2 text-sm font-semibold select-none"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        if (isChecked) {
                          setStatusFilter(statusFilter.filter((s) => s !== status));
                        } else {
                          setStatusFilter([...statusFilter, status]);
                        }
                      }}
                      className="border-border text-primary accent-primary focus:ring-primary size-4 cursor-pointer rounded"
                    />
                    <span>{status}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
        <div className="text-text-muted pb-3 text-xs font-bold">
          {sortedAuditions.length} candidate{sortedAuditions.length !== 1 ? 's' : ''} shown
        </div>
      </div>

      {/* Auditions Table Card */}
      <AppCard noPadding>
        <div className="w-full overflow-x-auto text-left">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-border bg-bg/50 border-b">
                <th
                  onClick={() => handleSort('name')}
                  className="text-overline text-text-muted hover:text-text cursor-pointer p-4 transition-colors select-none"
                >
                  <div className="flex flex-row items-center gap-1.5">
                    <span>Name / Contact</span>
                    {sortField === 'name' && (
                      <span className="text-primary text-xs">
                        {sortDirection === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="text-overline text-text-muted p-4">Target Performance</th>
                <th
                  onClick={() => handleSort('scheduledTimeSlot')}
                  className="text-overline text-text-muted hover:text-text cursor-pointer p-4 transition-colors select-none"
                >
                  <div className="flex flex-row items-center gap-1.5">
                    <span>Audition Time</span>
                    {sortField === 'scheduledTimeSlot' && (
                      <span className="text-primary text-xs">
                        {sortDirection === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="text-overline text-text-muted w-[120px] p-4">Status</th>
                <th className="text-overline text-text-muted p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedAuditions.map((audition) => (
                <tr
                  key={audition.id}
                  className="group border-border hover:bg-primary-light/45 cursor-pointer border-b transition-colors"
                  onClick={() => {
                    setEditingAudition(audition);
                    setIsModalOpen(true);
                  }}
                >
                  <td data-label="Name" className="p-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-row items-center gap-2">
                        <span className="text-text group-hover:text-primary-deep font-semibold transition-colors">
                          {audition.name}
                        </span>
                        {audition.voicePart && <Badge tone="rehearsal">{audition.voicePart}</Badge>}
                      </div>
                      {audition.contact.includes('@') ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleEmailClick(
                              audition.contact,
                              audition.name,
                              audition.voicePart || ''
                            );
                          }}
                          className="text-text-muted hover:text-primary cursor-pointer border-none bg-transparent p-0 text-left text-sm font-medium underline transition-colors"
                        >
                          {audition.contact}
                        </button>
                      ) : (
                        <a
                          href={`tel:${audition.contact}`}
                          onClick={(event) => event.stopPropagation()}
                          className="text-text-muted hover:text-primary text-sm font-medium transition-colors hover:underline"
                        >
                          {audition.contact}
                        </a>
                      )}
                    </div>
                  </td>
                  <td data-label="Target Performance" className="p-4">
                    {audition.expand?.performance ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/events?eventId=${audition.performance}&openModal=true`);
                        }}
                        className="text-primary hover:text-primary-deep cursor-pointer border-none bg-transparent p-0 text-left font-semibold underline transition-colors"
                        title="Click to edit performance details"
                      >
                        {audition.expand.performance.title}
                      </button>
                    ) : (
                      <span className="text-text-muted text-sm">None</span>
                    )}
                  </td>
                  <td data-label="Audition Time" className="text-text-muted p-4 text-sm">
                    {audition.status === 'Scheduled' && audition.scheduledTimeSlot ? (
                      <span className="text-text font-semibold">
                        {formatInTimezone(audition.scheduledTimeSlot, timezone, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    ) : (
                      <Badge tone="neutral">
                        {audition.requestedSlots && audition.requestedSlots.length > 0
                          ? `${audition.requestedSlots.length} slot${audition.requestedSlots.length > 1 ? 's' : ''} requested`
                          : 'No times requested'}
                      </Badge>
                    )}
                  </td>
                  <td data-label="Status" className="p-4">
                    <Badge
                      tone={
                        audition.status === 'New'
                          ? 'rehearsal'
                          : audition.status === 'Scheduled'
                            ? 'success'
                            : 'neutral'
                      }
                    >
                      {audition.status}
                    </Badge>
                  </td>
                  <td data-label="Actions" className="p-4 text-right">
                    <div
                      className="flex flex-row flex-wrap justify-end gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {audition.contact.includes('@') && (
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() =>
                            handleEmailClick(
                              audition.contact,
                              audition.name,
                              audition.voicePart || ''
                            )
                          }
                        >
                          ✉️ Email
                        </Button>
                      )}
                      {audition.status === 'New' && (
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => openScheduleModal(audition)}
                        >
                          Schedule
                        </Button>
                      )}
                      {audition.status === 'Scheduled' && (
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => convertToSinger(audition)}
                        >
                          Convert to Singer
                        </Button>
                      )}
                      {audition.status !== 'Closed' && (
                        <Button
                          variant="outline"
                          size="small"
                          onClick={() => updateStatus(audition, 'Closed')}
                        >
                          Close
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        size="small"
                        onClick={() => removeAudition(audition)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {sortedAuditions.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-text-muted p-8 text-center text-sm">
                    No auditions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </AppCard>

      <AuditionModal
        audition={editingAudition}
        isOpen={isModalOpen}
        onClose={() => {
          setEditingAudition(null);
          setIsModalOpen(false);
        }}
        onSave={handleSaveAudition}
        settings={settingsQuery.data ?? null}
        performances={performances}
      />

      <Modal
        isOpen={!!schedulingAudition}
        onClose={() => setSchedulingAudition(null)}
        title="Schedule Audition"
        maxWidth="500px"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSchedulingAudition(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => confirmSchedule()}>
              Confirm & Send Email
            </Button>
          </div>
        }
      >
        <form id="schedule-form" onSubmit={confirmSchedule} className="flex flex-col gap-4">
          <p className="text-text-muted m-0 text-sm">
            Confirm the time slot for <strong>{schedulingAudition?.name}</strong>. An email will be
            sent to them with their scheduled time and an "Add to Calendar" link.
          </p>

          {schedulingAudition?.requestedSlots && schedulingAudition.requestedSlots.length > 0 && (
            <div className="flex flex-col gap-2">
              <label className="text-label">Applicant's Preferred Times</label>
              <div className="flex flex-row flex-wrap gap-2">
                {schedulingAudition.requestedSlots.map((slot) => {
                  const isSlotPredefined = (settingsQuery.data?.slots ?? []).includes(slot);
                  const isSelected =
                    schedSlot === slot || (schedSlot === '__custom__' && schedCustom === slot);
                  return (
                    <button
                      type="button"
                      key={slot}
                      onClick={() => {
                        if (isSlotPredefined) {
                          setSchedSlot(slot);
                          setSchedCustom('');
                        } else {
                          setSchedSlot('__custom__');
                          setSchedCustom(slot);
                        }
                      }}
                      className={`inline-flex cursor-pointer items-center rounded-lg border px-3 py-2 text-xs font-semibold transition-all duration-200 ${
                        isSelected
                          ? 'border-primary bg-primary-light text-primary-deep shadow-sm'
                          : 'border-border bg-surface text-text hover:border-primary/50 hover:bg-primary-light'
                      }`}
                    >
                      {formatInTimezone(slot, timezone, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-text text-sm font-semibold">Select Confirmed Time Slot</label>
            <Select value={schedSlot} onChange={(e) => setSchedSlot(e.target.value)}>
              {(settingsQuery.data?.slots ?? []).map((slot) => (
                <option key={slot} value={slot}>
                  {formatInTimezone(slot, timezone, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </option>
              ))}
              <option value="__custom__">Custom / Other</option>
            </Select>
          </div>
          {schedSlot === '__custom__' && (
            <div className="flex flex-col gap-1">
              <label className="text-text text-sm font-semibold">Custom Time Slot</label>
              <Input
                type="datetime-local"
                value={schedCustom ? utcToZonedInputValue(schedCustom, timezone) : ''}
                onChange={(e) => setSchedCustom(zonedInputValueToUtc(e.target.value, timezone))}
                required
              />
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
