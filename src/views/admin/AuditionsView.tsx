import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppCard } from '../../components/common/AppCard';
import { AuditionModal } from '../../components/admin/AuditionModal';
import { useDialog } from '../../contexts/DialogContext';
import { auditionService, type Audition, type AuditionInput } from '../../services/auditionService';
import { settingsService, type AuditionSettings } from '../../services/settingsService';
import { eventService, type Event } from '../../services/eventService';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { formatInTimezone, zonedInputValueToUtc, utcToZonedInputValue } from '../../lib/timezone';
import { pb } from '../../lib/pocketbase';
import { type UserAccount } from '../../services/profileService';
import { Button, Select, Input, Badge, Modal } from '../../components/ui';

export default function AuditionsView() {
  const dialog = useDialog();
  const navigate = useNavigate();
  const { timezone } = useChoirSettings();

  const handleEmailClick = (email: string, name: string, voicePart: string) => {
    navigate('/admin/communications', {
      state: {
        initialRecipients: [{
          id: `audition-${email}`,
          name: name,
          email: email,
          phone: '',
          voicePart: voicePart,
          globalStatus: 'Auditionee'
        }],
        initialSubject: 'Audition Inquiry',
        initialContent: `Dear ${name},\n\n`
      }
    });
  };

  const [auditions, setAuditions] = useState<Audition[]>([]);
  const [performances, setPerformances] = useState<Event[]>([]);
  const [settings, setSettings] = useState<AuditionSettings | null>(null);
  const [admins, setAdmins] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'general' | 'slots'>('general');
  const [backupSettings, setBackupSettings] = useState<AuditionSettings | null>(null);
  const [error, setError] = useState('');
  const [editingAudition, setEditingAudition] = useState<Audition | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [performanceFilter, setPerformanceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<Audition['status'][]>(['New', 'Scheduled']);

  // Slot Generator State
  const [genDate, setGenDate] = useState('');
  const [genStart, setGenStart] = useState('18:00');
  const [genEnd, setGenEnd] = useState('20:00');
  const [genInterval, setGenInterval] = useState('15');

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

    if (settings) {
      const merged = [...(settings.slots || []), ...newSlots];
      // deduplicate and sort
      const uniqueSorted = Array.from(new Set(merged)).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      setSettings({ ...settings, slots: uniqueSorted });
    }
  };

  const removeSlot = (slotToRemove: string) => {
    if (settings) {
      setSettings({ ...settings, slots: settings.slots.filter(s => s !== slotToRemove) });
    }
  };

  // Scheduling Modal State
  const [schedulingAudition, setSchedulingAudition] = useState<Audition | null>(null);
  const [schedSlot, setSchedSlot] = useState('');
  const [schedCustom, setSchedCustom] = useState('');

  const openScheduleModal = (audition: Audition) => {
    setSchedulingAudition(audition);
    
    const prefSlots = audition.requestedSlots || [];
    const matchingSlot = prefSlots.find(s => settings?.slots?.includes(s));
    
    if (matchingSlot) {
      setSchedSlot(matchingSlot);
      setSchedCustom('');
    } else if (audition.scheduledTimeSlot) {
      const isPredefined = settings?.slots?.includes(audition.scheduledTimeSlot);
      if (isPredefined) {
        setSchedSlot(audition.scheduledTimeSlot);
        setSchedCustom('');
      } else {
        setSchedSlot('__custom__');
        setSchedCustom(audition.scheduledTimeSlot);
      }
    } else if (settings?.slots && settings.slots.length > 0) {
      setSchedSlot(settings.slots[0]);
      setSchedCustom('');
    } else {
      setSchedSlot('__custom__');
      setSchedCustom('');
    }
  };

  const confirmSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingAudition) return;
    const finalSlot = schedSlot === '__custom__' ? schedCustom.trim() : schedSlot.trim();
    if (!finalSlot) return;

    try {
      const updated = await auditionService.updateAudition(schedulingAudition.id, { 
        status: 'Scheduled', 
        scheduledTimeSlot: finalSlot 
      });
      setAuditions((current) => current.map((item) => item.id === updated.id ? updated : item));
      dialog.showToast('Audition scheduled and confirmation email sent.');
      setSchedulingAudition(null);
    } catch {
      dialog.showMessage({ title: 'Error', message: 'Failed to schedule audition.', variant: 'danger' });
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [auditionList, allEvents, auditionSettings, adminList] = await Promise.all([
        auditionService.getAuditions(),
        eventService.getEvents(),
        settingsService.getAuditionSettings(),
        pb.collection('users').getFullList<UserAccount>({ filter: 'role = "admin"' })
      ]);
      setAuditions(auditionList);
      setPerformances(allEvents.filter(e => e.type === 'Performance'));
      setSettings(auditionSettings);
      setAdmins(adminList);
      // Auto-expand settings to guide user if no audition times are set
      if (!auditionSettings.slots || auditionSettings.slots.length === 0) {
        setBackupSettings(JSON.parse(JSON.stringify(auditionSettings)));
        setSettingsTab('general');
        setShowSettings(true);
      }
      setError('');
    } catch {
      setError('Could not load auditions data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveSettings = async () => {
    if (!settings) return;
    setIsSavingSettings(true);
    try {
      await settingsService.saveAuditionSettings(settings);
      setBackupSettings(null);
      setShowSettings(false);
      dialog.showToast('Audition settings updated.');
    } catch {
      dialog.showMessage({ title: 'Error', message: 'Failed to save settings.', variant: 'danger' });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleCancelSettings = () => {
    if (backupSettings) {
      setSettings(backupSettings);
      setBackupSettings(null);
    }
    setShowSettings(false);
  };

  const updateStatus = async (audition: Audition, status: Audition['status']) => {
    const updated = await auditionService.updateAudition(audition.id, { status });
    setAuditions((current) => current.map((item) => item.id === updated.id ? updated : item));
  };

  const handleSaveAudition = async (id: string | null, data: Partial<Audition>) => {
    try {
      if (id) {
        const updated = await auditionService.updateAudition(id, data);
        setAuditions((current) => current.map((item) => item.id === updated.id ? updated : item));
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
        const created = await auditionService.createAudition(payload);
        setAuditions((current) => [created, ...current]);
        dialog.showToast('Audition created successfully.');
      }
      setIsModalOpen(false);
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
      await fetchData();
    } catch (err: unknown) {
      await dialog.showMessage({
        title: 'Conversion Failed',
        message: err instanceof Error ? err.message : 'An error occurred while creating the singer profile.',
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
    setAuditions((current) => current.filter((item) => item.id !== audition.id));
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

  const filteredAuditions = auditions.filter(a => 
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
  if (error) return <div className="p-8 text-danger-text">{error}</div>;

  return (
    <div className="flex flex-col gap-8 py-8">
      {/* Header Area */}
      <div className="flex flex-wrap items-center justify-end gap-2 border-b border-border pb-4">
        <Button onClick={() => { setEditingAudition(null); setIsModalOpen(true); }} icon={<span className="text-base font-semibold">+</span>}>
          Add Audition
        </Button>
      </div>

      {/* Status Banner */}
      {!isLoading && settings && (
        <div className={`flex items-center justify-between rounded-xl p-5 shadow-sm border transition-all duration-200 ${
          settings.enabled && settings.defaultPerformanceId 
            ? 'border-primary/30 bg-primary/5' 
            : 'border-border bg-surface-muted'
        }`}>
          <div className="flex flex-row items-center gap-4">
            <div className="flex items-center justify-center size-8 rounded-full bg-surface shadow-sm text-base select-none">
              {settings.enabled && settings.defaultPerformanceId ? '🟢' : '⚪'}
            </div>
            <div className="flex flex-col">
              <div className={`text-sm font-bold tracking-wide ${
                settings.enabled && settings.defaultPerformanceId ? 'text-primary-deep' : 'text-text-muted'
              }`}>
                PUBLIC AUDITIONS: {settings.enabled && settings.defaultPerformanceId ? 'OPEN' : 'CLOSED'}
              </div>
              <div className="text-xs text-text-muted mt-0.5">
                {settings.enabled && settings.defaultPerformanceId 
                  ? (
                    <>
                      Accepting requests for: {performances.find(p => p.id === settings.defaultPerformanceId)?.title || 'Selected Performance'}
                      <br />
                      <span className="inline-flex items-center gap-1 mt-1 text-sm">
                        <span>🔗</span>
                        <a href="/auditions" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary-deep transition-colors font-semibold">
                          Link to Public Form
                        </a>
                      </span>
                    </>
                  )
                  : !settings.enabled 
                    ? 'The public form is currently disabled.'
                    : 'A target performance must be selected to open the form.'}
              </div>
            </div>
          </div>
          <Button 
            variant={settings.enabled && settings.defaultPerformanceId ? "secondary" : "primary"} 
            onClick={() => {
              setBackupSettings(JSON.parse(JSON.stringify(settings)));
              setSettingsTab('general');
              setShowSettings(true);
            }}
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
        isDirty={backupSettings !== null && JSON.stringify(settings) !== JSON.stringify(backupSettings)}
        footer={
          <div className="flex w-full items-center justify-between gap-4">
            <div className="text-left">
              {(!settings || !settings.slots || settings.slots.length === 0) && (
                <span className="text-xs font-semibold text-danger-text">
                  ⚠️ Configure at least one time slot to save.
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleCancelSettings}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveSettings} 
                loading={isSavingSettings}
                disabled={!settings || !settings.slots || settings.slots.length === 0}
              >
                Save Settings
              </Button>
            </div>
          </div>
        }
      >
        {settings && (
          <div className="flex flex-col gap-4">
            {/* Tabs Header */}
            <div className="mb-2 flex flex-row gap-4 border-b border-border">
              <button
                type="button"
                onClick={() => setSettingsTab('general')}
                className={`flex min-h-[40px] cursor-pointer items-center justify-center border-none bg-transparent px-4 py-2 text-sm transition-all duration-200 ${
                  settingsTab === 'general'
                    ? 'border-b-2 border-primary font-bold text-primary'
                    : 'border-b-2 border-transparent font-medium text-text-muted'
                }`}
              >
                General Settings
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab('slots')}
                className={`flex min-h-[40px] cursor-pointer items-center justify-center border-none bg-transparent px-4 py-2 text-sm transition-all duration-200 ${
                  settingsTab === 'slots'
                    ? 'border-b-2 border-primary font-bold text-primary'
                    : 'border-b-2 border-transparent font-medium text-text-muted'
                }`}
              >
                Time Slots
                {(!settings.slots || settings.slots.length === 0) && (
                  <span className="ml-1.5 inline-flex items-center justify-center text-xs font-bold text-danger-text" title="No time slots configured">
                    ⚠️
                  </span>
                )}
              </button>
            </div>

            {/* Tab 1: General Settings */}
            {settingsTab === 'general' && (
              <div className="flex flex-col gap-6">
                <label className="flex cursor-pointer flex-row gap-2 self-start select-none items-center">
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                    className="size-5 cursor-pointer rounded border-border text-primary focus:ring-primary accent-primary transition-all duration-200"
                  />
                  <span className="text-sm font-semibold text-text">Accept public audition requests</span>
                </label>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-text">Target Performance</label>
                  <Select
                    value={settings.defaultPerformanceId || ''}
                    onChange={(e) => setSettings({ ...settings, defaultPerformanceId: e.target.value })}
                  >
                    <option value="">-- No performance assigned --</option>
                    {performances.map(p => (
                      <option key={p.id} value={p.id}>{formatInTimezone(p.date, timezone, { year: 'numeric', month: 'numeric', day: 'numeric' })} - {p.title}</option>
                    ))}
                  </Select>
                  <p className="m-0 text-xs text-text-muted mt-1">
                    A target performance is <strong className="text-text">REQUIRED</strong> for the public audition form to accept requests.
                  </p>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-text">Confirmation Message</label>
                  <textarea
                    value={settings.confirmationMessage}
                    onChange={(e) => setSettings({ ...settings, confirmationMessage: e.target.value })}
                    className="bg-surface border border-border rounded-md outline-none transition-[border-color,box-shadow] duration-200 focus:border-primary focus:shadow-[0_0_0_3px_rgba(74,124,89,0.25)] min-h-[80px] resize-y p-3 text-sm text-text"
                  />
                </div>

                <div className="flex flex-col gap-2 border-t border-border pt-4">
                  <label className="flex cursor-pointer flex-row gap-2 self-start select-none items-center">
                    <input
                      type="checkbox"
                      checked={settings.adminNotifyEnabled || false}
                      onChange={(e) => setSettings({ 
                        ...settings, 
                        adminNotifyEnabled: e.target.checked,
                        adminNotifyUsers: settings.adminNotifyUsers || []
                      })}
                      className="size-5 cursor-pointer rounded border-border text-primary focus:ring-primary accent-primary transition-all duration-200"
                    />
                    <span className="text-sm font-semibold text-text">Notify administrators of new submissions</span>
                  </label>

                  {settings.adminNotifyEnabled && (
                    <div className="flex flex-col gap-1 pl-7">
                      <span className="text-xs font-bold text-text-muted tracking-wider uppercase">Select Administrators to Notify</span>
                      <div className="mt-1 flex flex-col gap-2">
                        {admins.map((admin) => {
                          const isChecked = (settings.adminNotifyUsers || []).includes(admin.id);
                          return (
                            <label key={admin.id} className="flex cursor-pointer flex-row items-center gap-2 select-none">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const currentUsers = settings.adminNotifyUsers || [];
                                  const updatedUsers = e.target.checked
                                    ? [...currentUsers, admin.id]
                                    : currentUsers.filter(id => id !== admin.id);
                                  setSettings({ ...settings, adminNotifyUsers: updatedUsers });
                                }}
                                className="size-4 cursor-pointer rounded border-border text-primary focus:ring-primary accent-primary transition-all duration-200"
                              />
                              <span className="text-sm text-text">{admin.name} ({admin.email})</span>
                            </label>
                          );
                        })}
                        {admins.length === 0 && (
                          <span className="text-xs text-text-muted">No administrative accounts found.</span>
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
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-text">
                    <span>Available Audition Times</span>
                    {(!settings.slots || settings.slots.length === 0) && (
                      <span className="inline-flex items-center rounded bg-danger-bg px-1.5 py-0.5 text-xs font-semibold tracking-wider text-danger-text uppercase">Required</span>
                    )}
                  </label>

                  <div className="rounded-xl border border-border bg-surface-muted p-5 shadow-sm">
                    <div className="flex flex-col gap-3">
                      <span className="text-xs font-bold text-text-muted tracking-wider uppercase">Generate Slots</span>
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] items-end gap-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-text-muted">Date</span>
                          <Input type="date" value={genDate} onChange={e => setGenDate(e.target.value)} />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-text-muted">Start Time</span>
                          <Input type="time" value={genStart} onChange={e => setGenStart(e.target.value)} />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-text-muted">End Time</span>
                          <Input type="time" value={genEnd} onChange={e => setGenEnd(e.target.value)} />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-text-muted">Interval (mins)</span>
                          <Select value={genInterval} onChange={e => setGenInterval(e.target.value)}>
                            <option value="10">10</option>
                            <option value="15">15</option>
                            <option value="20">20</option>
                            <option value="30">30</option>
                          </Select>
                        </div>
                        <Button type="button" variant="secondary" onClick={generateSlots} disabled={!genDate || !genStart || !genEnd}>
                          Generate
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                    {settings.slots?.map(slot => (
                      <div key={slot} className="flex items-center justify-between gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-sm hover:border-primary/50 transition-colors shadow-sm w-full">
                        <span className="text-text font-medium">{formatInTimezone(slot, timezone, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                        <button 
                          type="button" 
                          onClick={() => removeSlot(slot)} 
                          className="cursor-pointer border-none bg-transparent p-0 text-base leading-none text-text-muted hover:text-danger-text transition-colors"
                          title="Remove slot"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>

                  {(!settings.slots || settings.slots.length === 0) && (
                    <p className="m-0 text-xs font-medium text-danger-text mt-3">
                      ⚠️ Generate at least one audition time slot so applicants can schedule their audition.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-end justify-between gap-4 bg-surface p-4 border border-border rounded-xl shadow-sm">
        <div className="flex flex-wrap items-center gap-4 flex-1">
          <div className="flex min-w-[280px] flex-col gap-1">
            <label className="text-xs font-bold text-text-muted tracking-wider uppercase">Filter by Performance</label>
            <Select
              value={performanceFilter}
              onChange={(e) => setPerformanceFilter(e.target.value)}
            >
              <option value="all">All Auditions</option>
              {performances.map(p => (
                <option key={p.id} value={p.id}>{formatInTimezone(p.date, timezone, { year: 'numeric', month: 'numeric', day: 'numeric' })} - {p.title}</option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-text-muted tracking-wider uppercase">Filter by Status</label>
            <div className="flex h-[44px] flex-row flex-wrap items-center gap-4 border border-border rounded-md px-4 bg-surface">
              {(['New', 'Scheduled', 'Closed'] as Audition['status'][]).map(status => {
                const isChecked = statusFilter.includes(status);
                return (
                  <label key={status} className="flex cursor-pointer flex-row items-center gap-2 select-none text-sm font-semibold text-text">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        if (isChecked) {
                          setStatusFilter(statusFilter.filter(s => s !== status));
                        } else {
                          setStatusFilter([...statusFilter, status]);
                        }
                      }}
                      className="size-4 cursor-pointer rounded border-border text-primary focus:ring-primary accent-primary"
                    />
                    <span>{status}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
        <div className="text-xs font-bold text-text-muted pb-3">
          {sortedAuditions.length} candidate{sortedAuditions.length !== 1 ? 's' : ''} shown
        </div>
      </div>

      {/* Auditions Table Card */}
      <AppCard noPadding>
        <div className="w-full overflow-x-auto text-left">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-bg/50">
                <th 
                  onClick={() => handleSort('name')}
                  className="cursor-pointer p-4 text-xs font-bold tracking-wider text-text-muted uppercase select-none hover:text-text transition-colors"
                >
                  <div className="flex flex-row items-center gap-1.5">
                    <span>Name / Contact</span>
                    {sortField === 'name' && (
                      <span className="text-xs text-primary">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th className="p-4 text-xs font-bold tracking-wider text-text-muted uppercase">Target Performance</th>
                <th 
                  onClick={() => handleSort('scheduledTimeSlot')}
                  className="cursor-pointer p-4 text-xs font-bold tracking-wider text-text-muted uppercase select-none hover:text-text transition-colors"
                >
                  <div className="flex flex-row items-center gap-1.5">
                    <span>Audition Time</span>
                    {sortField === 'scheduledTimeSlot' && (
                      <span className="text-xs text-primary">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th className="w-[120px] p-4 text-xs font-bold tracking-wider text-text-muted uppercase">Status</th>
                <th className="p-4 text-right text-xs font-bold tracking-wider text-text-muted uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedAuditions.map((audition) => (
                <tr 
                  key={audition.id} 
                  className="hover:bg-primary-light/45 transition-colors border-b border-border cursor-pointer group" 
                  onClick={() => { setEditingAudition(audition); setIsModalOpen(true); }}
                >
                  <td data-label="Name" className="p-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-row items-center gap-2">
                        <span className="font-semibold text-text group-hover:text-primary-deep transition-colors">{audition.name}</span>
                        {audition.voicePart && <Badge tone="rehearsal">{audition.voicePart}</Badge>}
                      </div>
                      {audition.contact.includes('@') ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleEmailClick(audition.contact, audition.name, audition.voicePart || '');
                          }}
                          className="cursor-pointer border-none bg-transparent p-0 text-left text-sm text-text-muted underline hover:text-primary transition-colors font-medium"
                        >
                          {audition.contact}
                        </button>
                      ) : (
                        <a
                          href={`tel:${audition.contact}`}
                          onClick={(event) => event.stopPropagation()}
                          className="text-sm text-text-muted hover:text-primary hover:underline transition-colors font-medium"
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
                        className="cursor-pointer border-none bg-transparent p-0 text-left font-semibold text-primary underline hover:text-primary-deep transition-colors"
                        title="Click to edit performance details"
                      >
                        {audition.expand.performance.title}
                      </button>
                    ) : (
                      <span className="text-sm text-text-muted">None</span>
                    )}
                  </td>
                  <td data-label="Audition Time" className="p-4 text-sm text-text-muted">
                    {audition.status === 'Scheduled' && audition.scheduledTimeSlot ? (
                      <span className="font-semibold text-text">
                        {formatInTimezone(audition.scheduledTimeSlot, timezone, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
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
                    <Badge tone={audition.status === 'New' ? 'rehearsal' : audition.status === 'Scheduled' ? 'success' : 'neutral'}>
                      {audition.status}
                    </Badge>
                  </td>
                  <td data-label="Actions" className="p-4 text-right">
                    <div className="flex flex-row flex-wrap justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      {audition.contact.includes('@') && (
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => handleEmailClick(audition.contact, audition.name, audition.voicePart || '')}
                        >
                          ✉️ Email
                        </Button>
                      )}
                      {audition.status === 'New' && (
                        <Button variant="secondary" size="small" onClick={() => openScheduleModal(audition)}>
                          Schedule
                        </Button>
                      )}
                      {audition.status === 'Scheduled' && (
                        <Button variant="secondary" size="small" onClick={() => convertToSinger(audition)}>
                          Convert to Singer
                        </Button>
                      )}
                      {audition.status !== 'Closed' && (
                        <Button variant="ghost" size="small" onClick={() => updateStatus(audition, 'Closed')}>
                          Close
                        </Button>
                      )}
                      <Button variant="danger" size="small" onClick={() => removeAudition(audition)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {sortedAuditions.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-sm text-text-muted">
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
        onClose={() => { setEditingAudition(null); setIsModalOpen(false); }}
        onSave={handleSaveAudition}
        settings={settings}
        performances={performances}
      />

      <Modal
        isOpen={!!schedulingAudition}
        onClose={() => setSchedulingAudition(null)}
        title="Schedule Audition"
        maxWidth="500px"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setSchedulingAudition(null)}>Cancel</Button>
            <Button variant="primary" type="submit" form="schedule-form">Confirm & Send Email</Button>
          </div>
        }
      >
        <form id="schedule-form" onSubmit={confirmSchedule} className="flex flex-col gap-4">
          <p className="m-0 text-sm text-text-muted">
            Confirm the time slot for <strong>{schedulingAudition?.name}</strong>. An email will be sent to them with their scheduled time and an "Add to Calendar" link.
          </p>
          
          {schedulingAudition?.requestedSlots && schedulingAudition.requestedSlots.length > 0 && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-text-muted tracking-wider uppercase">Applicant's Preferred Times</label>
              <div className="flex flex-row flex-wrap gap-2">
                {schedulingAudition.requestedSlots.map((slot) => {
                  const isSlotPredefined = settings?.slots?.includes(slot);
                  const isSelected = schedSlot === slot || (schedSlot === '__custom__' && schedCustom === slot);
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
                          : 'border-border bg-surface text-text hover:bg-primary-light hover:border-primary/50'
                      }`}
                    >
                      {formatInTimezone(slot, timezone, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-text">Select Confirmed Time Slot</label>
            <Select
              value={schedSlot}
              onChange={(e) => setSchedSlot(e.target.value)}
            >
              {settings?.slots?.map((slot) => (
                <option key={slot} value={slot}>
                  {formatInTimezone(slot, timezone, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </option>
              ))}
              <option value="__custom__">Custom / Other</option>
            </Select>
          </div>
          {schedSlot === '__custom__' && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-text">Custom Time Slot</label>
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
