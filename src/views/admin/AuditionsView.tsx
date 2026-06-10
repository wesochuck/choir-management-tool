import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppCard } from '../../components/common/AppCard';
import { BaseModal } from '../../components/common/BaseModal';
import { AuditionModal } from '../../components/admin/AuditionModal';
import { useDialog } from '../../contexts/DialogContext';
import { auditionService, type Audition, type AuditionInput } from '../../services/auditionService';
import { settingsService, type AuditionSettings } from '../../services/settingsService';
import { eventService, type Event } from '../../services/eventService';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { formatInTimezone, zonedInputValueToUtc, utcToZonedInputValue } from '../../lib/timezone';
import { pb } from '../../lib/pocketbase';
import { type UserAccount } from '../../services/profileService';

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
      setShowSettings(false);
      dialog.showToast('Audition settings updated.');
    } catch {
      dialog.showMessage({ title: 'Error', message: 'Failed to save settings.', variant: 'danger' });
    } finally {
      setIsSavingSettings(false);
    }
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
      <div className="mb-6 flex items-center justify-between">
        <div className="admin-view-titles">
          {/* Page title is already handled by PageLayout in App.tsx */}
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-primary" onClick={() => { setEditingAudition(null); setIsModalOpen(true); }}>
            Add Audition
          </button>
          <button className="btn btn-secondary" onClick={() => setShowSettings(!showSettings)}>
            {showSettings ? 'Hide Settings' : 'Configure Times & Settings'}
          </button>
          <a className="btn btn-ghost" href="/auditions" target="_blank" rel="noopener noreferrer">Preview Public Form</a>
        </div>
      </div>

      {/* Status Banner */}
      {!isLoading && settings && (
        <div className={`card flex items-center justify-between rounded-lg p-4 px-6 ${settings.enabled && settings.defaultPerformanceId ? 'border border-primary bg-[rgba(74,117,89,0.05)]' : 'border border-gray-200 bg-[rgba(100,116,139,0.05)]'}`}>
          <div className="flex flex-row gap-4">
            <div className="text-2xl">{settings.enabled && settings.defaultPerformanceId ? '🟢' : '⚪'}</div>
            <div className="flex flex-col gap-0">
              <div className={`text-sm font-semibold ${settings.enabled && settings.defaultPerformanceId ? 'text-primary-deep' : 'text-gray-500'}`}>
                PUBLIC AUDITIONS: {settings.enabled && settings.defaultPerformanceId ? 'OPEN' : 'CLOSED'}
              </div>
              <div className="text-xs text-gray-500">
                {settings.enabled && settings.defaultPerformanceId 
                  ? `Accepting requests for: ${performances.find(p => p.id === settings.defaultPerformanceId)?.title || 'Selected Performance'}`
                  : !settings.enabled 
                    ? 'The public form is currently disabled.'
                    : 'A target performance must be selected to open the form.'}
              </div>
            </div>
          </div>
          {!showSettings && (
            <button 
              className={settings.enabled && settings.defaultPerformanceId ? "btn btn-secondary btn-sm" : "btn btn-primary btn-sm"} 
              onClick={() => setShowSettings(true)}
            >
              {settings.enabled && settings.defaultPerformanceId ? 'Configure Times' : 'Configure & Open'}
            </button>
          )}
        </div>
      )}

      {showSettings && settings && (
        <AppCard title="Audition Settings">
          <div className="flex flex-col gap-6">
            <label className="flex cursor-pointer flex-row gap-2 self-start select-none">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                className="size-5 cursor-pointer accent-primary"
              />
              <span className="text-sm font-semibold">Accept public audition requests</span>
            </label>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold">Target Performance</label>
              <select
                className="block w-full rounded-md border-border bg-surface px-3 py-2 text-sm"
                value={settings.defaultPerformanceId || ''}
                onChange={(e) => setSettings({ ...settings, defaultPerformanceId: e.target.value })}
              >
                <option value="">-- No performance assigned --</option>
                {performances.map(p => (
                  <option key={p.id} value={p.id}>{formatInTimezone(p.date, timezone, { year: 'numeric', month: 'numeric', day: 'numeric' })} - {p.title}</option>
                ))}
              </select>
              <p className="m-0 text-xs text-gray-500">
                A target performance is <strong>REQUIRED</strong> for the public audition form to accept requests.
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-1 text-sm font-semibold">
                <span>Available Audition Times</span>
                {(!settings.slots || settings.slots.length === 0) && (
                  <span className="inline-flex items-center rounded bg-danger-text px-1.5 py-0.5 text-xs font-semibold tracking-wider text-white uppercase">Required</span>
                )}
              </label>

              <div className="card bg-neutral-100 border border-gray-200 p-4">
                <div className="flex flex-col gap-2">
                  <span className="text-label text-xs">Generate Slots</span>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] items-end gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">Date</span>
                      <input type="date" className="card p-2" value={genDate} onChange={e => setGenDate(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">Start Time</span>
                      <input type="time" className="card p-2" value={genStart} onChange={e => setGenStart(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">End Time</span>
                      <input type="time" className="card p-2" value={genEnd} onChange={e => setGenEnd(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">Interval (mins)</span>
                      <select className="block w-full rounded-md border-border bg-surface px-3 py-2 text-sm" value={genInterval} onChange={e => setGenInterval(e.target.value)}>
                        <option value="10">10</option>
                        <option value="15">15</option>
                        <option value="20">20</option>
                        <option value="30">30</option>
                      </select>
                    </div>
                    <button type="button" className="btn btn-secondary" onClick={generateSlots} disabled={!genDate || !genStart || !genEnd}>
                      Generate
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-row flex-wrap gap-2">
                {settings.slots?.map(slot => (
                  <div key={slot} className="inline-flex items-center gap-1.5 rounded border border-gray-200 bg-white px-3 py-1.5 text-sm">
                    <span>{formatInTimezone(slot, timezone, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                    <button type="button" onClick={() => removeSlot(slot)} className="cursor-pointer border-none bg-none p-0 text-base leading-none text-gray-500">
                      &times;
                    </button>
                  </div>
                ))}
              </div>

              {(!settings.slots || settings.slots.length === 0) && (
                <p className="m-0 text-xs font-medium text-danger-text">
                  ⚠️ Generate at least one audition time slot so applicants can schedule their audition.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold">Confirmation Message</label>
              <textarea
                value={settings.confirmationMessage}
                onChange={(e) => setSettings({ ...settings, confirmationMessage: e.target.value })}
                className="card min-h-[80px] resize-y"
              />
            </div>

            <div className="flex flex-col gap-2 border-t border-gray-200 pt-4">
              <label className="flex cursor-pointer flex-row gap-2 self-start select-none">
                <input
                  type="checkbox"
                  checked={settings.adminNotifyEnabled || false}
                  onChange={(e) => setSettings({ 
                    ...settings, 
                    adminNotifyEnabled: e.target.checked,
                    adminNotifyUsers: settings.adminNotifyUsers || []
                  })}
                  className="size-5 cursor-pointer accent-primary"
                />
                <span className="text-sm font-semibold">Notify administrators of new submissions</span>
              </label>

              {settings.adminNotifyEnabled && (
                <div className="flex flex-col gap-1 pl-7">
                  <span className="text-sm text-sm font-semibold text-gray-500">Select Administrators to Notify</span>
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
                            className="size-4 cursor-pointer accent-primary"
                          />
                          <span className="text-sm">{admin.name} ({admin.email})</span>
                        </label>
                      );
                    })}
                    {admins.length === 0 && (
                      <span className="text-xs text-gray-500">No administrative accounts found.</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button className="btn btn-primary" onClick={handleSaveSettings} disabled={isSavingSettings}>
              {isSavingSettings ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </AppCard>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-1 flex-wrap">
          <div className="flex min-w-[240px] flex-col gap-1">
            <label className="text-sm font-semibold text-gray-500">Filter by Performance</label>
            <select
              className="block w-full rounded-md border-border bg-surface px-3 py-2 text-sm"
              value={performanceFilter}
              onChange={(e) => setPerformanceFilter(e.target.value)}
            >
              <option value="all">All Auditions</option>
              {performances.map(p => (
                <option key={p.id} value={p.id}>{formatInTimezone(p.date, timezone, { year: 'numeric', month: 'numeric', day: 'numeric' })} - {p.title}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-500">Filter by Status</label>
            <div className="flex h-10 flex-row flex-wrap items-center gap-4">
              {(['New', 'Scheduled', 'Closed'] as Audition['status'][]).map(status => {
                const isChecked = statusFilter.includes(status);
                return (
                  <label key={status} className="flex cursor-pointer flex-row items-center gap-2 select-none">
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
                      className="size-4 cursor-pointer accent-primary"
                    />
                    <span>{status}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <AppCard noPadding>
        <div className="w-full overflow-x-auto text-left">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-bg">
                <th 
                  onClick={() => handleSort('name')}
                  className="cursor-pointer p-4 text-sm font-semibold text-gray-500 select-none"
                >
                  <div className="flex flex-row items-center gap-1.5">
                    <span>Name / Contact</span>
                    {sortField === 'name' && (
                      <span className="text-xs text-primary-deep">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th className="p-4 text-sm font-semibold text-gray-500">Target Performance</th>
                <th 
                  onClick={() => handleSort('scheduledTimeSlot')}
                  className="cursor-pointer p-4 text-sm font-semibold text-gray-500 select-none"
                >
                  <div className="flex flex-row items-center gap-1.5">
                    <span>Audition Time</span>
                    {sortField === 'scheduledTimeSlot' && (
                      <span className="text-xs text-primary-deep">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th className="w-[120px] p-4 text-sm font-semibold text-gray-500">Status</th>
                <th className="p-4 text-right text-sm font-semibold text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedAuditions.map((audition) => (
                <tr 
                  key={audition.id} 
                  className="interactive-row cursor-pointer border-b border-gray-200" 
                  onClick={() => { setEditingAudition(audition); setIsModalOpen(true); }}
                >
                  <td data-label="Name" className="p-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-row items-center gap-2">
                        <span className="font-semibold">{audition.name}</span>
                        {audition.voicePart && <span className="inline-flex items-center rounded bg-primary-light px-2 py-0.5 text-xs font-semibold tracking-wider text-primary-deep uppercase">{audition.voicePart}</span>}
                      </div>
                      {audition.contact.includes('@') ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleEmailClick(audition.contact, audition.name, audition.voicePart || '');
                          }}
                          className="btn btn-link cursor-pointer border-none bg-none p-0 text-left text-sm text-gray-500 underline"
                        >
                          {audition.contact}
                        </button>
                      ) : (
                        <a
                          href={`tel:${audition.contact}`}
                          onClick={(event) => event.stopPropagation()}
                          className="text-sm text-gray-500"
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
                        className="btn btn-link inline cursor-pointer border-none bg-none p-0 text-left font-semibold text-primary underline"
                        title="Click to edit performance details"
                      >
                        {audition.expand.performance.title}
                      </button>
                    ) : (
                      <span className="text-sm text-gray-500">None</span>
                    )}
                  </td>
                  <td data-label="Audition Time" className="p-4 text-sm text-gray-500">
                    {audition.status === 'Scheduled' && audition.scheduledTimeSlot ? (
                      <span className="font-medium">
                        {formatInTimezone(audition.scheduledTimeSlot, timezone, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded bg-gray-100 px-2 py-1 text-xs font-semibold tracking-wider text-gray-700 uppercase">
                        {audition.requestedSlots && audition.requestedSlots.length > 0
                          ? `${audition.requestedSlots.length} slot${audition.requestedSlots.length > 1 ? 's' : ''} requested`
                          : 'No times requested'}
                      </span>
                    )}
                  </td>
                  <td data-label="Status" className="p-4">
                    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold tracking-wider uppercase ${audition.status === 'New' ? 'bg-blue-100 text-blue-700' : audition.status === 'Scheduled' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                      {audition.status}
                    </span>
                  </td>
                  <td data-label="Actions" className="p-4 text-right">
                    <div className="flex flex-row flex-wrap justify-end gap-2">
                      {audition.contact.includes('@') && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm inline-flex items-center gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEmailClick(audition.contact, audition.name, audition.voicePart || '');
                          }}
                        >
                          ✉️ Email
                        </button>
                      )}
                      {audition.status === 'New' && (
                        <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); openScheduleModal(audition); }}>Schedule</button>
                      )}
                      {audition.status === 'Scheduled' && (
                        <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); convertToSinger(audition); }}>Convert to Singer</button>
                      )}
                      {audition.status !== 'Closed' && (
                        <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); updateStatus(audition, 'Closed'); }}>Close</button>
                      )}
                      <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); removeAudition(audition); }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {sortedAuditions.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    No audition requests found for this filter.
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

      <BaseModal
        isOpen={!!schedulingAudition}
        onClose={() => setSchedulingAudition(null)}
        title="Schedule Audition"
        maxWidth="500px"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setSchedulingAudition(null)}>Cancel</button>
            <button type="submit" form="schedule-form" className="btn btn-primary">Confirm & Send Email</button>
          </>
        }
      >
        <form id="schedule-form" onSubmit={confirmSchedule} className="flex flex-col gap-4">
          <p className="m-0">
            Confirm the time slot for <strong>{schedulingAudition?.name}</strong>. An email will be sent to them with their scheduled time and an "Add to Calendar" link.
          </p>
          
          {schedulingAudition?.requestedSlots && schedulingAudition.requestedSlots.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-primary-deep">Applicant's Preferred Times</label>
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
                      className={`inline-flex cursor-pointer items-center rounded border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-800 transition-all duration-200 ${isSelected ? 'border-primary bg-primary-light font-bold text-primary-deep' : ''}`}
                    >
                      {formatInTimezone(slot, timezone, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold">Select Confirmed Time Slot</label>
            <select
              className="block w-full rounded-md border-border bg-surface px-3 py-2 text-sm"
              value={schedSlot}
              onChange={(e) => setSchedSlot(e.target.value)}
            >
              {settings?.slots?.map((slot) => (
                <option key={slot} value={slot}>
                  {formatInTimezone(slot, timezone, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </option>
              ))}
              <option value="__custom__">Custom / Other</option>
            </select>
          </div>
          {schedSlot === '__custom__' && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold">Custom Time Slot</label>
              <input
                type="datetime-local"
                className="card h-11 px-3"
                value={schedCustom ? utcToZonedInputValue(schedCustom, timezone) : ''}
                onChange={(e) => setSchedCustom(zonedInputValueToUtc(e.target.value, timezone))}
                required
              />
            </div>
          )}
        </form>
      </BaseModal>
    </div>
  );
}
