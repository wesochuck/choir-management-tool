import React, { useState, useEffect, useMemo } from 'react';
import type { Event, BulkRehearsalConfig } from '../../services/eventService';
import type { Venue } from '../../services/venueService';
import { useDialog } from '../../contexts/DialogContext';
import { BaseModal } from '../common/BaseModal';
import { formatPocketBaseError } from '../../lib/pocketbase';
import { settingsService } from '../../services/settingsService';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { utcToZonedInputValue, zonedInputValueToUtc } from '../../lib/timezone';
import './EventModal.css';


interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Event>, bulkConfig?: BulkRehearsalConfig, openAuditions?: boolean) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  initialData?: Event | null;
  performances: Event[];
  venues: Venue[];
  onAddVenue: (data: Partial<Venue>) => Promise<Venue>;
}

const getDefaultDurationMinutes = (type: Event['type']) =>
  type === 'Performance' ? 150 : 120;

export const EventModal: React.FC<EventModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  onDelete, 
  initialData, 
  performances,
  venues,
  onAddVenue
}) => {
  const dialog = useDialog();
  const { timezone } = useChoirSettings();
  const [formData, setFormData] = useState<Partial<Event>>({
    title: '',
    date: utcToZonedInputValue(new Date(), timezone),
    type: 'Rehearsal',
    durationMinutes: 120,
    details: '',
    callTime: '',
    parentPerformanceId: '',
    venue: '',
  });

  const [eventGraphicFile, setEventGraphicFile] = useState<File | null>(null);

  const [shouldBulkAdd, setShouldBulkAdd] = useState(false);
  const [isOpenAuditions, setIsOpenAuditions] = useState(false);
  const [initialOpenAuditions, setInitialOpenAuditions] = useState(false);
  const [bulkCount, setBulkCount] = useState(8);
  const [bulkDay, setBulkDay] = useState(2); // Tuesday
  const [bulkTime, setBulkTime] = useState('19:00');
  const [bulkVenue, setBulkVenue] = useState('');

  const [isSubmitting, setIsLoading] = useState(false);
  const titleInputRef = React.useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'details' | 'tickets'>('details');
  const [advancePriceInput, setAdvancePriceInput] = useState('');
  const [dayOfPriceInput, setDayOfPriceInput] = useState('');


  useEffect(() => {
    if (isOpen) {
      setActiveTab('details');
      setTimeout(() => {
        if (titleInputRef.current) {
          titleInputRef.current.focus();
          titleInputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen]);


  // Inline Quick-Add Venue States
  const [isAddingNewVenue, setIsAddingNewVenue] = useState(false);
  const [newVenueName, setNewVenueName] = useState('');
  const [newVenueRows, setNewVenueRows] = useState('');
  const [newVenueAddress, setNewVenueAddress] = useState('');
  const [isSavingVenue, setIsSavingVenue] = useState(false);

  useEffect(() => {
    setEventGraphicFile(null);
    if (initialData) {
      const formattedDate = utcToZonedInputValue(initialData.date, timezone);
      setFormData({ 
        ...initialData, 
        date: formattedDate,
        durationMinutes: initialData.durationMinutes || getDefaultDurationMinutes(initialData.type)
      });
      setAdvancePriceInput(
        initialData.advancePriceCents !== undefined && initialData.advancePriceCents !== null 
          ? (initialData.advancePriceCents / 100).toString() 
          : ''
      );
      setDayOfPriceInput(
        initialData.dayOfPriceCents !== undefined && initialData.dayOfPriceCents !== null 
          ? (initialData.dayOfPriceCents / 100).toString() 
          : ''
      );
      setShouldBulkAdd(false);
    } else {
      setFormData({
        title: '',
        date: utcToZonedInputValue(new Date(), timezone),
        type: 'Rehearsal',
        durationMinutes: 120,
        details: '',
        callTime: '',
        parentPerformanceId: '',
        venue: '',
      });
      setAdvancePriceInput('');
      setDayOfPriceInput('');
      setBulkVenue('');
      setShouldBulkAdd(false);
    }
  }, [initialData, isOpen, timezone]);

  useEffect(() => {
    if (!isOpen) {
      setIsAddingNewVenue(false);
      setNewVenueName('');
      setNewVenueRows('');
      setNewVenueAddress('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!bulkVenue && formData.venue) {
        setBulkVenue(formData.venue);
    }
  }, [formData.venue, bulkVenue]);

  const startDate = useMemo(() => {
    if (!formData.date) return null;
    const current = new Date(formData.date);
    current.setHours(parseInt(bulkTime.split(':')[0]), parseInt(bulkTime.split(':')[1]), 0, 0);

    if (current.getDay() === bulkDay) {
       current.setDate(current.getDate() - 7);
    } else {
      while (current.getDay() !== bulkDay) {
        current.setDate(current.getDate() - 1);
      }
    }
    current.setDate(current.getDate() - (7 * (bulkCount - 1)));
    return current;
  }, [formData.date, bulkCount, bulkDay, bulkTime]);

  const endTime = useMemo(() => {
    if (!formData.date || !formData.durationMinutes) return null;
    try {
      const start = new Date(formData.date);
      if (isNaN(start.getTime())) return null;
      const end = new Date(start.getTime() + formData.durationMinutes * 60 * 1000);
      return end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return null;
    }
  }, [formData.date, formData.durationMinutes]);

  useEffect(() => {
    if (isOpen && initialData && initialData.type === 'Performance') {
      settingsService.getAuditionSettings().then(settings => {
        const isActive = settings.enabled && settings.defaultPerformanceId === initialData.id;
        setIsOpenAuditions(isActive);
        setInitialOpenAuditions(isActive);
      });
    } else if (isOpen) {
      setIsOpenAuditions(false);
      setInitialOpenAuditions(false);
    }
  }, [initialData, isOpen]);

  const handleCreateVenueInline = async () => {
    if (!newVenueName.trim() || !newVenueRows.trim()) return;
    const rowCounts = newVenueRows
      .split(',')
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n));
      
    if (rowCounts.length === 0) {
      await dialog.showMessage({
        title: 'Invalid Capacities',
        message: 'Please enter valid row capacities separated by commas (e.g. 10, 12, 14).',
        variant: 'danger',
      });
      return;
    }

    setIsSavingVenue(true);
    try {
      const created = await onAddVenue({ 
        name: newVenueName.trim(), 
        rowCounts,
        address: newVenueAddress.trim() || undefined
      });
      setFormData(prev => ({
        ...prev,
        venue: created.id,
      }));
      setIsAddingNewVenue(false);
      setNewVenueName('');
      setNewVenueRows('');
      setNewVenueAddress('');
    } catch (err: unknown) {
      await dialog.showMessage({
        title: 'Could Not Add Venue',
        message: err instanceof Error ? err.message : 'Error saving inline venue',
        variant: 'danger',
      });
    } finally {
      setIsSavingVenue(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const bulkConfig: BulkRehearsalConfig | undefined = shouldBulkAdd && formData.type === 'Performance' 
        ? { count: bulkCount, dayOfWeek: bulkDay, time: bulkTime, venue: bulkVenue }
        : undefined;

      const utcDate = zonedInputValueToUtc(formData.date || '', timezone);
      const durationMinutes = formData.durationMinutes || getDefaultDurationMinutes(formData.type || 'Rehearsal');
      const eventData = { ...formData, date: utcDate, durationMinutes };

      let submitData: Partial<Event> | FormData = eventData;
      if (formData.type === 'Performance') {
        const fd = new FormData();
        Object.entries(eventData).forEach(([key, val]) => {
          if (val !== undefined && val !== null) {
            if (key === 'setList') {
              fd.append(key, JSON.stringify(val));
            } else if (key === 'expand') {
              // skip expanded relations in raw form payload
            } else {
              fd.append(key, String(val));
            }
          }
        });
        if (eventGraphicFile) {
          fd.append('eventGraphic', eventGraphicFile);
        }
        submitData = fd;
      }

      await onSave(submitData, bulkConfig, isOpenAuditions);
      onClose();
    } catch (err: unknown) {
      await dialog.showMessage({
        title: 'Could Not Save Event',
        message: formatPocketBaseError(err),
        variant: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isDirty = useMemo(() => {
    if (initialData) {
      const formattedDate = utcToZonedInputValue(initialData.date, timezone);
      
      const titleChanged = (formData.title || '') !== (initialData.title || '');
      const dateChanged = formData.date !== formattedDate;
      const typeChanged = formData.type !== initialData.type;
      const detailsChanged = (formData.details || '') !== (initialData.details || '');
      const durationChanged = (formData.durationMinutes || 0) !== (initialData.durationMinutes || 0);
      const callTimeChanged = (formData.callTime || '') !== (initialData.callTime || '');
      const parentChanged = (formData.parentPerformanceId || '') !== (initialData.parentPerformanceId || '');
      const venueChanged = (formData.venue || '') !== (initialData.venue || '');
      const rsvpChanged = Boolean(formData.isOpenForRSVP) !== Boolean(initialData.isOpenForRSVP);
      const auditionsChanged = isOpenAuditions !== initialOpenAuditions;
      const ticketingEnabledChanged = Boolean(formData.isTicketingEnabled) !== Boolean(initialData.isTicketingEnabled);
      const advancePriceChanged = (formData.advancePriceCents || 0) !== (initialData.advancePriceCents || 0);
      const dayOfPriceChanged = (formData.dayOfPriceCents || 0) !== (initialData.dayOfPriceCents || 0);
      const capacityChanged = (formData.ticketCapacity || 0) !== (initialData.ticketCapacity || 0);
      const doorsOpenChanged = (formData.doorsOpenTime || '') !== (initialData.doorsOpenTime || '');
      const publicDetailsChanged = (formData.publicDetails || '') !== (initialData.publicDetails || '');
      const graphicChanged = eventGraphicFile !== null;
      
      return titleChanged || dateChanged || typeChanged || detailsChanged || durationChanged || callTimeChanged || parentChanged || venueChanged || rsvpChanged || auditionsChanged || ticketingEnabledChanged || advancePriceChanged || dayOfPriceChanged || capacityChanged || doorsOpenChanged || publicDetailsChanged || graphicChanged;
    } else {
      const hasTitle = Boolean(formData.title?.trim());
      const hasDetails = Boolean(formData.details?.trim());
      const hasVenue = Boolean(formData.venue);
      const hasParent = Boolean(formData.parentPerformanceId);
      const hasRsvp = Boolean(formData.isOpenForRSVP);
      const hasCallTime = Boolean(formData.callTime);
      const isDurationChanged = formData.durationMinutes !== 120;
      const isTypeChanged = formData.type !== 'Rehearsal';
      const hasBulkAdd = shouldBulkAdd;
      
      const hasInlineVenue = Boolean(newVenueName.trim() || newVenueRows.trim() || newVenueAddress.trim());
      const hasTicketing = Boolean(formData.isTicketingEnabled || formData.advancePriceCents || formData.dayOfPriceCents || formData.ticketCapacity || formData.doorsOpenTime || formData.publicDetails || eventGraphicFile);

      return hasTitle || hasDetails || hasVenue || hasParent || hasRsvp || hasCallTime || isDurationChanged || isTypeChanged || hasBulkAdd || hasInlineVenue || hasTicketing;
    }
  }, [formData, initialData, timezone, shouldBulkAdd, newVenueName, newVenueRows, newVenueAddress, isOpenAuditions, initialOpenAuditions, eventGraphicFile]);

  const handleClose = async () => {
    if (isDirty) {
      const confirmDiscard = await dialog.confirm({
        title: 'Unsaved Changes',
        message: initialData 
          ? 'You have unsaved changes to this event. Do you want to discard them?' 
          : 'You are scheduling a new event with unsaved details. Do you want to discard this event?',
        confirmLabel: 'Discard Changes',
        cancelLabel: 'Keep Editing',
        variant: 'warning',
      });
      if (!confirmDiscard) return;
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!initialData || !onDelete) return;
    const eventName = initialData.title || initialData.type || 'this event';
    const shouldDelete = await dialog.confirm({
      title: 'Delete Event',
      message: `Are you sure you want to delete "${eventName}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!shouldDelete) return;

    onClose();
    dialog.showToast('Deleting event...');
    try {
      await onDelete(initialData.id);
      dialog.showToast('Event deleted successfully.');
    } catch (err: unknown) {
      await dialog.showMessage({
        title: 'Error Deleting Event',
        message: err instanceof Error ? err.message : 'Failed to delete event',
        variant: 'danger',
      });
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={initialData && initialData.id ? 'Edit Event' : 'Schedule Event'}
      footer={
        <>
          {initialData && initialData.id && onDelete && (
            <button 
              type="button" 
              onClick={handleDelete}
              className="btn btn-danger"
              style={{ marginRight: 'auto' }}
            >
              Delete
            </button>
          )}
          <button type="button" onClick={handleClose} className="btn btn-ghost">Cancel</button>
          <button 
            type="submit" 
            form="event-form"
            disabled={isSubmitting}
            className="btn btn-primary"
          >
            {isSubmitting ? 'Saving...' : 'Save Event'}
          </button>
        </>
      }
    >
      {formData.type === 'Performance' && (
        <div className="event-modal-tabs">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`event-modal-tab-btn ${activeTab === 'details' ? 'active' : 'inactive'}`}
          >
            Event Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tickets')}
            className={`event-modal-tab-btn ${activeTab === 'tickets' ? 'active' : 'inactive'}`}
          >
            Tickets
          </button>
        </div>
      )}

      <form id="event-form" onSubmit={handleSubmit} className="flex-col" style={{ gap: 'var(--space-md)' }}>
        {activeTab === 'details' && (
          <>
            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <label className="text-label">Event Title {formData.type === 'Performance' ? '(Concert Title)' : '(Optional)'}</label>
              <input 
                ref={titleInputRef}
                value={formData.title} 
                onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                placeholder={formData.type === 'Performance' ? 'e.g. Spring Gala 2026' : 'e.g. Mid-week Rehearsal'}
                className="card"
                style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
              />
            </div>

            <div className="flex-row" style={{ gap: 'var(--space-md)' }}>
              <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
                <label className="text-label">Type</label>
                <select 
                  value={formData.type} 
                  onChange={(e) => {
                    const newType = e.target.value as 'Performance' | 'Rehearsal';
                    const oldType = formData.type || 'Rehearsal';
                    let newDuration = formData.durationMinutes;
                    
                    // If duration is missing or matches the old default, update to new default
                    if (!newDuration || newDuration === getDefaultDurationMinutes(oldType)) {
                      newDuration = getDefaultDurationMinutes(newType);
                    }

                    setFormData({ 
                      ...formData, 
                      type: newType, 
                      durationMinutes: newDuration,
                      parentPerformanceId: newType === 'Performance' ? '' : formData.parentPerformanceId 
                    });

                    if (newType === 'Rehearsal') {
                      setActiveTab('details');
                    }
                  }}
                  className="card"
                  style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
                >
                  <option value="Rehearsal">Rehearsal</option>
                  <option value="Performance">Performance</option>
                </select>
              </div>
              <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
                <label className="text-label">Date & Time</label>
                <input 
                  type="datetime-local"
                  value={formData.date} 
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })} 
                  required
                  className="card"
                  style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
                />
              </div>
            </div>

            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <label className="text-label">Event Duration</label>
              <select 
                value={formData.durationMinutes || getDefaultDurationMinutes(formData.type || 'Rehearsal')} 
                onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
                className="card"
                style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
              >
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
                <option value={75}>1 hour 15 mins</option>
                <option value={90}>1.5 hours</option>
                <option value={105}>1 hour 45 mins</option>
                <option value={120}>2 hours</option>
                <option value={135}>2 hours 15 mins</option>
                <option value={150}>2.5 hours</option>
                <option value={165}>2 hours 45 mins</option>
                <option value={180}>3 hours</option>
                <option value={210}>3.5 hours</option>
                <option value={240}>4 hours</option>
              </select>
              {endTime && (
                <div className="text-xs text-muted" style={{ marginTop: '2px', fontWeight: 500 }}>
                  Ends at approximately <span style={{ color: 'var(--primary)' }}>{endTime}</span>
                </div>
              )}
            </div>

            {formData.type === 'Performance' && (
              <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                <label className="text-label">Performance Call Time (Optional)</label>
                <input 
                  type="time"
                  value={formData.callTime || ''} 
                  onChange={(e) => setFormData({ ...formData, callTime: e.target.value })} 
                  className="card"
                  style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
                />
              </div>
            )}

            <label className="flex-row" style={{ alignItems: 'center', gap: 'var(--space-sm)' }}>
              <input
                type="checkbox"
                checked={formData.isOpenForRSVP || false}
                onChange={(e) => setFormData({ ...formData, isOpenForRSVP: e.target.checked })}
                style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
              />
              <span className="text-label">Open for RSVP Links</span>
            </label>

            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <label className="text-label">Venue</label>
              <select
                value={formData.venue || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'new') {
                    setIsAddingNewVenue(true);
                  } else {
                    setFormData({ 
                      ...formData, 
                      venue: val
                    });
                  }
                }}
                required
                className="card"
                style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
              >
                <option value="">-- Select Venue --</option>
                {venues.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
                <option value="new" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>+ Add New Venue...</option>
              </select>
            </div>

            {isAddingNewVenue && (
              <div className="flex-col" style={{ 
                gap: 'var(--space-md)', 
                backgroundColor: 'rgba(107, 70, 193, 0.05)', 
                padding: 'var(--space-md)', 
                borderRadius: 'var(--radius-md)', 
                border: '1px dashed var(--primary)',
                marginTop: '-4px'
              }}>
                <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.9rem' }}>✨ Create New Venue Template Inline</div>
                
                <div className="flex-responsive" style={{ gap: 'var(--space-md)', width: '100%' }}>
                  <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
                    <label className="text-muted text-xs" style={{ fontWeight: 600 }}>Venue Name</label>
                    <input 
                      value={newVenueName} 
                      onChange={(e) => setNewVenueName(e.target.value)}
                      placeholder="e.g. Grace Hall"
                      className="card"
                      style={{ width: '100%', padding: '0 8px', height: '36px', border: '1px solid var(--border)', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
                    <label className="text-muted text-xs" style={{ fontWeight: 600 }}>Row Capacities (e.g. 10, 12, 14)</label>
                    <input 
                      value={newVenueRows} 
                      onChange={(e) => setNewVenueRows(e.target.value)}
                      placeholder="e.g. 8, 10, 12"
                      className="card"
                      style={{ width: '100%', padding: '0 8px', height: '36px', border: '1px solid var(--border)', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div className="flex-col" style={{ gap: 'var(--space-xs)', width: '100%' }}>
                  <label className="text-muted text-xs" style={{ fontWeight: 600 }}>Venue Address (Optional, for Google Maps)</label>
                  <input 
                    value={newVenueAddress} 
                    onChange={(e) => setNewVenueAddress(e.target.value)}
                    placeholder="e.g. 123 Main St, Anytown, ST 12345"
                    className="card"
                    style={{ width: '100%', padding: '0 8px', height: '36px', border: '1px solid var(--border)', fontSize: '0.85rem' }}
                  />
                </div>

                <div className="flex-row" style={{ gap: 'var(--space-sm)', justifyContent: 'flex-end', width: '100%' }}>
                  <button 
                    type="button" 
                    onClick={() => setIsAddingNewVenue(false)}
                    className="btn btn-ghost btn-sm"
                    style={{ height: '28px', padding: '0 12px', fontSize: '0.8rem' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={handleCreateVenueInline}
                    disabled={isSavingVenue || !newVenueName.trim() || !newVenueRows.trim()}
                    className="btn btn-primary btn-sm"
                    style={{ height: '28px', padding: '0 12px', fontSize: '0.8rem' }}
                  >
                    {isSavingVenue ? 'Adding...' : 'Add & Select Venue'}
                  </button>
                </div>
              </div>
            )}

            {formData.type === 'Performance' && (
              <div className="flex-col" style={{ 
                backgroundColor: 'rgba(255, 138, 101, 0.05)', 
                padding: 'var(--space-md)', 
                borderRadius: 'var(--radius-md)', 
                border: '1px dashed #ff8a65',
                gap: 'var(--space-sm)'
              }}>
                <label className="flex-row" style={{ gap: 'var(--space-sm)', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={isOpenAuditions} 
                    onChange={(e) => setIsOpenAuditions(e.target.checked)}
                    style={{ width: '20px', height: '20px', accentColor: '#ff8a65' }}
                  />
                  <div className="flex-col" style={{ gap: 0 }}>
                    <span className="text-label" style={{ fontWeight: 700, color: '#e64a19' }}>Open Public Auditions?</span>
                    <span className="text-xs text-muted">If checked, this performance will be the target for new audition requests.</span>
                  </div>
                </label>
              </div>
            )}

            {formData.type === 'Performance' && !initialData && (
              <div className="flex-col" style={{ backgroundColor: 'var(--bg)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)', gap: 'var(--space-md)' }}>
                <label className="flex-row" style={{ gap: 'var(--space-sm)', cursor: 'pointer', fontWeight: 600 }}>
                  <input 
                    type="checkbox" 
                    checked={shouldBulkAdd} 
                    onChange={(e) => setShouldBulkAdd(e.target.checked)}
                    style={{ width: '20px', height: '20px', accentColor: 'var(--primary)' }}
                  />
                  <span className="text-label">Auto-generate weekly rehearsals?</span>
                </label>

                {shouldBulkAdd && (
                  <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
                    <div className="flex-row" style={{ gap: 'var(--space-sm)' }}>
                      <div className="flex-col" style={{ flex: 1, gap: '2px' }}>
                        <label className="text-xs text-muted" style={{ fontWeight: 700 }}>Count</label>
                        <input 
                          type="number" min="1" max="20"
                          value={bulkCount} onChange={(e) => setBulkCount(parseInt(e.target.value))}
                          className="card"
                          style={{ width: '100%', padding: '0 8px', border: '1px solid var(--border)', height: '36px' }}
                        />
                      </div>
                      <div className="flex-col" style={{ flex: 2, gap: '2px' }}>
                        <label className="text-xs text-muted" style={{ fontWeight: 700 }}>Day</label>
                        <select 
                          value={bulkDay} onChange={(e) => setBulkDay(parseInt(e.target.value))}
                          className="card"
                          style={{ width: '100%', padding: '0 8px', border: '1px solid var(--border)', height: '36px' }}
                        >
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                            <option key={d} value={i}>{d}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-col" style={{ flex: 2, gap: '2px' }}>
                        <label className="text-xs text-muted" style={{ fontWeight: 700 }}>Time</label>
                        <input 
                          type="time" value={bulkTime} onChange={(e) => setBulkTime(e.target.value)}
                          className="card"
                          style={{ width: '100%', padding: '0 8px', border: '1px solid var(--border)', height: '36px' }}
                        />
                      </div>
                    </div>
                    <div className="flex-col" style={{ gap: '2px' }}>
                      <label className="text-xs text-muted" style={{ fontWeight: 700 }}>Rehearsal Venue</label>
                      <select 
                        value={bulkVenue} onChange={(e) => setBulkVenue(e.target.value)}
                        required
                        className="card"
                        style={{ width: '100%', padding: '0 8px', border: '1px solid var(--border)', height: '36px' }}
                      >
                        <option value="">-- Select Rehearsal Venue --</option>
                        {venues.map(v => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                    </div>
                    {startDate && (
                      <div className="badge badge-rehearsal" style={{ padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', textAlign: 'center', textTransform: 'none' }}>
                        📅 First rehearsal: <strong>{startDate.toLocaleDateString()}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {formData.type === 'Rehearsal' && (
              <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                <label className="text-label">Linked Performance (Parent)</label>
                <select 
                  value={formData.parentPerformanceId} 
                  onChange={(e) => setFormData({ ...formData, parentPerformanceId: e.target.value })}
                  className="card"
                  style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
                >
                  <option value="">None</option>
                  {performances.filter(p => p.id !== initialData?.id).map(p => (
                    <option key={p.id} value={p.id}>{p.title || new Date(p.date).toLocaleDateString()} - {p.expand?.venue?.name || ''}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <label className="text-label">Details / Notes</label>
              <textarea 
                value={formData.details} 
                onChange={(e) => setFormData({ ...formData, details: e.target.value })} 
                className="card"
                style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', height: '80px', resize: 'vertical' }}
              />
            </div>
          </>
        )}

        {formData.type === 'Performance' && activeTab === 'tickets' && (
          <>
            <div style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '0.9rem' }}>🎟️ Ticketing Configuration</div>
            
            <label className="flex-row" style={{ alignItems: 'center', gap: 'var(--space-sm)' }}>
              <input
                type="checkbox"
                checked={formData.isTicketingEnabled || false}
                onChange={(e) => setFormData({ ...formData, isTicketingEnabled: e.target.checked })}
                style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
              />
              <span className="text-label">Enable Online Ticket Sales</span>
            </label>

            {formData.isTicketingEnabled && (
              <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
                <div className="flex-responsive" style={{ gap: 'var(--space-md)' }}>
                  <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
                    <label className="text-label">Advance Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 15.00"
                      value={advancePriceInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAdvancePriceInput(val);
                        const parsed = parseFloat(val);
                        if (val === '') {
                          setFormData(prev => ({ ...prev, advancePriceCents: undefined }));
                        } else if (!isNaN(parsed)) {
                          setFormData(prev => ({ ...prev, advancePriceCents: Math.round(parsed * 100) }));
                        }
                      }}
                      className="card"
                      style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
                    />
                  </div>
                  <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
                    <label className="text-label">Day-Of Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 20.00"
                      value={dayOfPriceInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDayOfPriceInput(val);
                        const parsed = parseFloat(val);
                        if (val === '') {
                          setFormData(prev => ({ ...prev, dayOfPriceCents: undefined }));
                        } else if (!isNaN(parsed)) {
                          setFormData(prev => ({ ...prev, dayOfPriceCents: Math.round(parsed * 100) }));
                        }
                      }}
                      className="card"
                      style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
                    />
                  </div>
                </div>

                <div className="flex-responsive" style={{ gap: 'var(--space-md)' }}>
                  <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
                    <label className="text-label">Ticket Capacity</label>
                    <input
                      type="number"
                      placeholder="e.g. 150"
                      value={formData.ticketCapacity === undefined ? '' : formData.ticketCapacity}
                      onChange={(e) => setFormData({ ...formData, ticketCapacity: e.target.value === '' ? undefined : Number(e.target.value) })}
                      className="card"
                      style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
                    />
                  </div>
                  <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
                    <label className="text-label">Doors Open Time</label>
                    <input
                      type="text"
                      placeholder="e.g. 6:30 PM"
                      value={formData.doorsOpenTime || ''}
                      onChange={(e) => setFormData({ ...formData, doorsOpenTime: e.target.value })}
                      className="card"
                      style={{ width: '100%', padding: '0 12px', height: '44px', border: '1px solid var(--border)' }}
                    />
                  </div>
                </div>

                <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                  <label className="text-label">Event Graphic / Flyer Image</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setEventGraphicFile(file);
                    }}
                    className="card"
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', display: 'block', height: 'auto' }}
                  />
                  {initialData?.eventGraphic && (
                    <span className="text-xs text-muted">Current file: {initialData.eventGraphic}</span>
                  )}
                </div>

                <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                  <label className="text-label">Public Details (HTML / Text)</label>
                  <textarea
                    placeholder="Describe the concert program, parking info, dress code, etc."
                    value={formData.publicDetails || ''}
                    onChange={(e) => setFormData({ ...formData, publicDetails: e.target.value })}
                    className="card"
                    style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', height: '100px', resize: 'vertical' }}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </form>
    </BaseModal>
  );
};
