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
import './Auditions.css';

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

  if (isLoading) return <div className="audition-loading-error">Loading auditions...</div>;
  if (error) return <div className="audition-loading-error audition-error-text">{error}</div>;

  return (
    <div className="flex-col audition-view-container">
      <div className="admin-view-header">
        <div className="admin-view-titles">
          {/* Page title is already handled by PageLayout in App.tsx */}
        </div>
        <div className="admin-view-actions">
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
        <div className={`card audition-status-banner ${settings.enabled && settings.defaultPerformanceId ? 'audition-status-banner-open' : 'audition-status-banner-closed'}`}>
          <div className="flex-row audition-status-info-row">
            <div className="audition-status-icon">{settings.enabled && settings.defaultPerformanceId ? '🟢' : '⚪'}</div>
            <div className="flex-col audition-status-info-group">
              <div className={`text-label audition-status-label ${settings.enabled && settings.defaultPerformanceId ? 'audition-status-label-open' : 'audition-status-label-closed'}`}>
                PUBLIC AUDITIONS: {settings.enabled && settings.defaultPerformanceId ? 'OPEN' : 'CLOSED'}
              </div>
              <div className="text-xs text-muted">
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
          <div className="flex-col audition-settings-form">
            <label className="flex-row audition-checkbox-label">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                className="audition-checkbox"
              />
              <span className="text-label">Accept public audition requests</span>
            </label>

            <div className="flex-col audition-generator-input-group">
              <label className="text-label">Target Performance</label>
              <select
                className="form-select"
                value={settings.defaultPerformanceId || ''}
                onChange={(e) => setSettings({ ...settings, defaultPerformanceId: e.target.value })}
              >
                <option value="">-- No performance assigned --</option>
                {performances.map(p => (
                  <option key={p.id} value={p.id}>{formatInTimezone(p.date, timezone, { year: 'numeric', month: 'numeric', day: 'numeric' })} - {p.title}</option>
                ))}
              </select>
              <p className="text-muted audition-target-perf-hint">
                A target performance is <strong>REQUIRED</strong> for the public audition form to accept requests.
              </p>
            </div>

            <div className="flex-col audition-generator-input-group">
              <label className="text-label audition-available-times-label">
                <span>Available Audition Times</span>
                {(!settings.slots || settings.slots.length === 0) && (
                  <span className="badge badge-rehearsal audition-required-badge">Required</span>
                )}
              </label>

              <div className="card audition-generator-card">
                <div className="flex-col audition-generator-inner">
                  <span className="text-label audition-generator-title">Generate Slots</span>
                  <div className="slots-generator-grid">
                    <div className="flex-col audition-generator-input-stack">
                      <span className="text-xs text-muted">Date</span>
                      <input type="date" className="card audition-generator-input" value={genDate} onChange={e => setGenDate(e.target.value)} />
                    </div>
                    <div className="flex-col audition-generator-input-stack">
                      <span className="text-xs text-muted">Start Time</span>
                      <input type="time" className="card audition-generator-input" value={genStart} onChange={e => setGenStart(e.target.value)} />
                    </div>
                    <div className="flex-col audition-generator-input-stack">
                      <span className="text-xs text-muted">End Time</span>
                      <input type="time" className="card audition-generator-input" value={genEnd} onChange={e => setGenEnd(e.target.value)} />
                    </div>
                    <div className="flex-col audition-generator-input-stack">
                      <span className="text-xs text-muted">Interval (mins)</span>
                      <select className="form-select" value={genInterval} onChange={e => setGenInterval(e.target.value)}>
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

              <div className="flex-row audition-slots-list">
                {settings.slots?.map(slot => (
                  <div key={slot} className="badge audition-slot-badge">
                    <span>{formatInTimezone(slot, timezone, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                    <button type="button" onClick={() => removeSlot(slot)} className="audition-slot-remove-btn">
                      &times;
                    </button>
                  </div>
                ))}
              </div>

              {(!settings.slots || settings.slots.length === 0) && (
                <p className="audition-slot-warning">
                  ⚠️ Generate at least one audition time slot so applicants can schedule their audition.
                </p>
              )}
            </div>

            <div className="flex-col audition-generator-input-group">
              <label className="text-label">Confirmation Message</label>
              <textarea
                value={settings.confirmationMessage}
                onChange={(e) => setSettings({ ...settings, confirmationMessage: e.target.value })}
                className="card audition-confirmation-msg-textarea"
              />
            </div>

            <div className="flex-col audition-admin-notify-section">
              <label className="flex-row audition-checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.adminNotifyEnabled || false}
                  onChange={(e) => setSettings({ 
                    ...settings, 
                    adminNotifyEnabled: e.target.checked,
                    adminNotifyUsers: settings.adminNotifyUsers || []
                  })}
                  className="audition-checkbox"
                />
                <span className="text-label">Notify administrators of new submissions</span>
              </label>

              {settings.adminNotifyEnabled && (
                <div className="flex-col audition-admin-list-container">
                  <span className="text-label text-muted audition-admin-info">Select Administrators to Notify</span>
                  <div className="audition-admin-list">
                    {admins.map((admin) => {
                      const isChecked = (settings.adminNotifyUsers || []).includes(admin.id);
                      return (
                        <label key={admin.id} className="flex-row audition-admin-checkbox-label">
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
                            className="audition-admin-checkbox"
                          />
                          <span className="audition-admin-info">{admin.name} ({admin.email})</span>
                        </label>
                      );
                    })}
                    {admins.length === 0 && (
                      <span className="text-muted text-xs">No administrative accounts found.</span>
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

      <div className="flex-responsive audition-filters-container">
        <div className="flex-responsive audition-filters-inner">
          <div className="flex-col audition-filter-perf-group">
            <label className="text-label text-muted">Filter by Performance</label>
            <select
              className="form-select"
              value={performanceFilter}
              onChange={(e) => setPerformanceFilter(e.target.value)}
            >
              <option value="all">All Auditions</option>
              {performances.map(p => (
                <option key={p.id} value={p.id}>{formatInTimezone(p.date, timezone, { year: 'numeric', month: 'numeric', day: 'numeric' })} - {p.title}</option>
              ))}
            </select>
          </div>

          <div className="flex-col audition-filter-status-group">
            <label className="text-label text-muted">Filter by Status</label>
            <div className="flex-row audition-filter-status-list">
              {(['New', 'Scheduled', 'Closed'] as Audition['status'][]).map(status => {
                const isChecked = statusFilter.includes(status);
                return (
                  <label key={status} className="flex-row audition-admin-checkbox-label">
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
                      className="audition-admin-checkbox"
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
        <div className="table-responsive admin-responsive-table">
          <table className="text-left audition-table">
            <thead>
              <tr className="audition-table-header-row">
                <th 
                  onClick={() => handleSort('name')}
                  className="audition-table-header-cell audition-table-header-sortable"
                >
                  <div className="flex-row audition-table-header-inner">
                    <span>Name / Contact</span>
                    {sortField === 'name' && (
                      <span className="audition-table-sort-icon">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th className="audition-table-header-cell">Target Performance</th>
                <th 
                  onClick={() => handleSort('scheduledTimeSlot')}
                  className="audition-table-header-cell audition-table-header-sortable"
                >
                  <div className="flex-row audition-table-header-inner">
                    <span>Audition Time</span>
                    {sortField === 'scheduledTimeSlot' && (
                      <span className="audition-table-sort-icon">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th className="audition-table-header-cell audition-table-width-sm">Status</th>
                <th className="audition-table-header-cell audition-table-header-cell-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedAuditions.map((audition) => (
                <tr 
                  key={audition.id} 
                  className="interactive-row audition-table-row" 
                  onClick={() => { setEditingAudition(audition); setIsModalOpen(true); }}
                >
                  <td data-label="Name" className="audition-name-cell">
                    <div className="flex-col audition-name-inner">
                      <div className="flex-row audition-name-top">
                        <span className="audition-name-text">{audition.name}</span>
                        {audition.voicePart && <span className="badge badge-rehearsal">{audition.voicePart}</span>}
                      </div>
                      {audition.contact.includes('@') ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleEmailClick(audition.contact, audition.name, audition.voicePart || '');
                          }}
                          className="btn btn-link text-muted audition-contact-btn"
                        >
                          {audition.contact}
                        </button>
                      ) : (
                        <a
                          href={`tel:${audition.contact}`}
                          onClick={(event) => event.stopPropagation()}
                          className="text-muted audition-contact-link"
                        >
                          {audition.contact}
                        </a>
                      )}
                    </div>
                  </td>
                  <td data-label="Target Performance" className="audition-perf-cell">
                    {audition.expand?.performance ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/events?eventId=${audition.performance}&openModal=true`);
                        }}
                        className="btn btn-link audition-perf-link"
                        title="Click to edit performance details"
                      >
                        {audition.expand.performance.title}
                      </button>
                    ) : (
                      <span className="text-muted text-sm">None</span>
                    )}
                  </td>
                  <td data-label="Audition Time" className="audition-time-cell">
                    {audition.status === 'Scheduled' && audition.scheduledTimeSlot ? (
                      <span className="audition-time-scheduled">
                        {formatInTimezone(audition.scheduledTimeSlot, timezone, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </span>
                    ) : (
                      <span className="badge audition-time-requested-badge">
                        {audition.requestedSlots && audition.requestedSlots.length > 0
                          ? `${audition.requestedSlots.length} slot${audition.requestedSlots.length > 1 ? 's' : ''} requested`
                          : 'No times requested'}
                      </span>
                    )}
                  </td>
                  <td data-label="Status" className="audition-status-cell">
                    <span className={`badge ${audition.status === 'New' ? 'audition-status-badge-new' : audition.status === 'Scheduled' ? 'audition-status-badge-scheduled' : 'audition-status-badge-closed'}`}>
                      {audition.status}
                    </span>
                  </td>
                  <td data-label="Actions" className="audition-actions-cell">
                    <div className="flex-row audition-actions-group">
                      {audition.contact.includes('@') && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm audition-action-btn-email"
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
                  <td colSpan={5} className="audition-empty-state">
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
        <form id="schedule-form" onSubmit={confirmSchedule} className="flex-col audition-schedule-form">
          <p className="audition-schedule-msg">
            Confirm the time slot for <strong>{schedulingAudition?.name}</strong>. An email will be sent to them with their scheduled time and an "Add to Calendar" link.
          </p>
          
          {schedulingAudition?.requestedSlots && schedulingAudition.requestedSlots.length > 0 && (
            <div className="flex-col audition-generator-input-stack">
              <label className="text-label audition-schedule-preferred-label">Applicant's Preferred Times</label>
              <div className="flex-row audition-preferred-slots-list">
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
                      className={`badge audition-preferred-slot-btn ${isSelected ? 'audition-preferred-slot-selected' : ''}`}
                    >
                      {formatInTimezone(slot, timezone, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex-col audition-generator-input-stack">
            <label className="text-label">Select Confirmed Time Slot</label>
            <select
              className="form-select"
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
            <div className="flex-col audition-generator-input-stack">
              <label className="text-label">Custom Time Slot</label>
              <input
                type="datetime-local"
                className="card audition-custom-time-input"
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
