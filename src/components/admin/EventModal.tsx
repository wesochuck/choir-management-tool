import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Event, BulkRehearsalConfig } from '../../services/eventService';
import type { Venue } from '../../services/venueService';
import { useDialog } from '../../contexts/DialogContext';
import { Modal, Select, Button } from '../ui';
import { pb, formatPocketBaseError } from '../../lib/pocketbase';
import { settingsService } from '../../services/settingsService';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { utcToZonedInputValue, zonedInputValueToUtc } from '../../lib/timezone';


interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Event>, bulkConfig?: BulkRehearsalConfig) => Promise<void>;
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
  const navigate = useNavigate();
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
  const [graphicPreviewUrl, setGraphicPreviewUrl] = useState<string>('');
  const [isGraphicRemoved, setIsGraphicRemoved] = useState<boolean>(false);

  useEffect(() => {
    if (eventGraphicFile) {
      const objectUrl = URL.createObjectURL(eventGraphicFile);
      setGraphicPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else if (initialData?.eventGraphic && !isGraphicRemoved) {
      setGraphicPreviewUrl(pb.files.getURL(initialData, initialData.eventGraphic));
    } else {
      setGraphicPreviewUrl('');
    }
  }, [eventGraphicFile, initialData, isGraphicRemoved]);

  const dayOfLiveText = useMemo(() => {
    if (!formData.date) return '';
    try {
      const dateParts = formData.date.split('T')[0];
      if (!dateParts) return '';
      const [year, month, day] = dateParts.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      if (isNaN(d.getTime())) return '';
      
      const formattedDate = d.toLocaleDateString([], {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      let tzAbbr = '';
      try {
        const formatter = new Intl.DateTimeFormat([], { timeZone: timezone, timeZoneName: 'short' });
        const parts = formatter.formatToParts(new Date());
        const tzPart = parts.find(p => p.type === 'timeZoneName');
        tzAbbr = tzPart ? ` ${tzPart.value}` : '';
      } catch {
        // Fallback to empty string if timeZoneName is unsupported
      }

      return `Live on the day of the show: ${formattedDate} (12:00 AM - 11:59 PM${tzAbbr})`;
    } catch {
      return '';
    }
  }, [formData.date, timezone]);

  const [shouldBulkAdd, setShouldBulkAdd] = useState(false);
  const [bulkCount, setBulkCount] = useState(8);
  const [bulkDay, setBulkDay] = useState(2); // Tuesday
  const [bulkTime, setBulkTime] = useState('19:00');
  const [bulkVenue, setBulkVenue] = useState('');

  const [isSubmitting, setIsLoading] = useState(false);
  const [isAuditionTarget, setIsAuditionTarget] = useState(false);
  const titleInputRef = React.useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'details' | 'tickets'>('details');
  const [advancePriceInput, setAdvancePriceInput] = useState('');
  const [dayOfPriceInput, setDayOfPriceInput] = useState('');
  const [hasPurchases, setHasPurchases] = useState(false);

  useEffect(() => {
    if (isOpen && initialData?.id) {
      pb.collection('ticketPurchases').getFirstListItem(
        pb.filter('event = {:eventId} && status = "paid"', { eventId: initialData.id })
      ).then(() => {
        setHasPurchases(true);
      }).catch(() => {
        setHasPurchases(false);
      });
    } else {
      setHasPurchases(false);
    }
  }, [isOpen, initialData]);

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
    setIsGraphicRemoved(false);
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
    if (isOpen && initialData?.type === 'Performance') {
      settingsService.getAuditionSettings().then(settings => {
        setIsAuditionTarget(settings.enabled && settings.defaultPerformanceId === initialData.id);
      });
    } else {
      setIsAuditionTarget(false);
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
            } else if (key === 'expand' || key === 'eventGraphic') {
              // skip expanded relations and file fields in raw form payload
            } else {
              fd.append(key, String(val));
            }
          }
        });
        if (eventGraphicFile) {
          fd.append('eventGraphic', eventGraphicFile);
        } else if (isGraphicRemoved) {
          fd.append('eventGraphic', '');
        }
        submitData = fd;
      }

      await onSave(submitData, bulkConfig);
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
      const initialDuration = initialData.durationMinutes || getDefaultDurationMinutes(initialData.type);
      const durationChanged = (formData.durationMinutes || 0) !== (initialDuration || 0);
      const callTimeChanged = (formData.callTime || '') !== (initialData.callTime || '');
      const parentChanged = (formData.parentPerformanceId || '') !== (initialData.parentPerformanceId || '');
      const venueChanged = (formData.venue || '') !== (initialData.venue || '');
      const rsvpChanged = Boolean(formData.isOpenForRSVP) !== Boolean(initialData.isOpenForRSVP);
      const ticketingEnabledChanged = Boolean(formData.isTicketingEnabled) !== Boolean(initialData.isTicketingEnabled);
      const advancePriceChanged = (formData.advancePriceCents || 0) !== (initialData.advancePriceCents || 0);
      const dayOfPriceChanged = (formData.dayOfPriceCents || 0) !== (initialData.dayOfPriceCents || 0);
      const capacityChanged = (formData.ticketCapacity || 0) !== (initialData.ticketCapacity || 0);
      const doorsOpenChanged = (formData.doorsOpenTime || '') !== (initialData.doorsOpenTime || '');
      const publicDetailsChanged = (formData.publicDetails || '') !== (initialData.publicDetails || '');
      const graphicChanged = eventGraphicFile !== null || isGraphicRemoved;
      
      return titleChanged || dateChanged || typeChanged || detailsChanged || durationChanged || callTimeChanged || parentChanged || venueChanged || rsvpChanged || ticketingEnabledChanged || advancePriceChanged || dayOfPriceChanged || capacityChanged || doorsOpenChanged || publicDetailsChanged || graphicChanged;
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
  }, [formData, initialData, timezone, shouldBulkAdd, newVenueName, newVenueRows, newVenueAddress, eventGraphicFile]);

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
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={initialData && initialData.id ? 'Edit Event' : 'Schedule Event'}
      footer={
        <>
          {initialData && initialData.id && onDelete && (
            <Button
              variant="danger"
              onClick={handleDelete}
              className="mr-auto"
            >
              Delete
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting}
            type="submit"
            form="event-form"
          >
            Save Event
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {formData.type === 'Performance' && (
          <div className="mb-4 flex flex-row gap-4 border-b border-border">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`flex min-h-[40px] cursor-pointer items-center justify-center border-none bg-transparent px-4 py-2 text-[15px] transition-all duration-200 ${activeTab === 'details' ? 'border-b-2 border-primary font-bold text-primary' : 'border-b-2 border-transparent font-medium text-text-muted'}`}
            >
              Event Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tickets')}
              className={`flex min-h-[40px] cursor-pointer items-center justify-center border-none bg-transparent px-4 py-2 text-[15px] transition-all duration-200 ${activeTab === 'tickets' ? 'border-b-2 border-primary font-bold text-primary' : 'border-b-2 border-transparent font-medium text-text-muted'}`}
            >
              Tickets
            </button>
          </div>
        )}

        <form id="event-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {activeTab === 'details' && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-label">Event Title {formData.type === 'Performance' ? '(Concert Title)' : '(Optional)'}</label>
              <input 
                ref={titleInputRef}
                value={formData.title} 
                onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                placeholder={formData.type === 'Performance' ? 'e.g. Spring Gala 2026' : 'e.g. Mid-week Rehearsal'}
                className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm shadow-sm transition-colors focus:border-primary focus:ring-1 focus:ring-primary focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-label">Type</label>
                <Select 
                  value={formData.type} 
                  onChange={(e) => {
                    const newType = e.target.value as 'Performance' | 'Rehearsal';
                    const oldType = formData.type || 'Rehearsal';
                    let newDuration = formData.durationMinutes;
                    
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
                  size="small"
                >
                  <option value="Rehearsal">Rehearsal</option>
                  <option value="Performance">Performance</option>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-label">Date & Time</label>
                <input 
                  type="datetime-local"
                  value={formData.date} 
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })} 
                  required
                  className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm shadow-sm transition-colors focus:border-primary focus:ring-1 focus:ring-primary focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-label">Event Duration</label>
                <Select 
                  value={formData.durationMinutes || getDefaultDurationMinutes(formData.type || 'Rehearsal')} 
                  onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
                  size="small"
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
                </Select>
                {endTime && (
                  <div className="mt-1 text-xs font-medium text-text-muted">
                    Ends at approximately <span className="font-bold text-primary">{endTime}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-label">Call Time (Optional)</label>
                <input 
                  type="time"
                  value={formData.callTime || ''}
                  onChange={(e) => setFormData({ ...formData, callTime: e.target.value })}
                  className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm shadow-sm transition-colors focus:border-primary focus:ring-1 focus:ring-primary focus:outline-hidden"
                />
              </div>
            </div>

            <label className="flex cursor-pointer flex-row items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isOpenForRSVP || false}
                onChange={(e) => setFormData({ ...formData, isOpenForRSVP: e.target.checked })}
                className="size-4 rounded-sm border-border text-primary focus:ring-primary focus:ring-offset-0"
              />
              <span className="text-sm font-bold text-text">Open for RSVP Links</span>
            </label>

            <div className="flex flex-col gap-1.5">
              <label className="text-label">Venue</label>
              <Select
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
                size="small"
              >
                <option value="">-- Select Venue --</option>
                {venues.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
                <option value="new" className="font-bold text-primary">+ Add New Venue...</option>
              </Select>
            </div>

            {isAddingNewVenue && (
              <div className="flex flex-col gap-4 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4">
                <div className="text-sm font-semibold text-primary-deep">✨ Create New Venue Template Inline</div>
                
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-label">Venue Name</label>
                    <input 
                      value={newVenueName} 
                      onChange={(e) => setNewVenueName(e.target.value)}
                      placeholder="e.g. Grace Hall"
                      className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm shadow-sm transition-colors focus:border-primary focus:ring-1 focus:ring-primary focus:outline-hidden"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-label">Row Capacities (e.g. 10, 12, 14)</label>
                    <input 
                      value={newVenueRows} 
                      onChange={(e) => setNewVenueRows(e.target.value)}
                      placeholder="e.g. 8, 10, 12"
                      className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm shadow-sm transition-colors focus:border-primary focus:ring-1 focus:ring-primary focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="flex w-full flex-col gap-1.5">
                  <label className="text-label">Venue Address (Optional, for Google Maps)</label>
                  <input 
                    value={newVenueAddress} 
                    onChange={(e) => setNewVenueAddress(e.target.value)}
                    placeholder="e.g. 123 Main St, Anytown, ST 12345"
                    className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm shadow-sm transition-colors focus:border-primary focus:ring-1 focus:ring-primary focus:outline-hidden"
                  />
                </div>

                <div className="flex w-full flex-row justify-end gap-3 pt-2">
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => setIsAddingNewVenue(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="small"
                    onClick={handleCreateVenueInline}
                    disabled={isSavingVenue || !newVenueName.trim() || !newVenueRows.trim()}
                    loading={isSavingVenue}
                  >
                    Add & Select Venue
                  </Button>
                </div>
              </div>
            )}

            {formData.type === 'Performance' && isAuditionTarget && (
              <div className="flex flex-col gap-1 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4">
                <div className="flex flex-col gap-0.5">
                  <div className="flex flex-row items-center gap-2">
                    <span className="text-sm font-bold text-primary-deep">Public Auditions Open</span>
                    <span className="inline-flex size-2 rounded-full bg-primary" />
                  </div>
                  <span className="text-xs font-medium text-text-muted">This performance is accepting public audition requests. Full controls are in Auditions Settings.</span>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  className="mt-1 self-start"
                  onClick={() => navigate('/admin/auditions')}
                >
                  Auditions Settings →
                </Button>
              </div>
            )}

            {formData.type === 'Performance' && !initialData && (
              <div className="flex flex-col gap-4 rounded-lg border border-dashed border-border bg-gray-50/50 p-5 shadow-xs">
                <label className="flex cursor-pointer flex-row items-center gap-3">
                  <input 
                    type="checkbox" 
                    checked={shouldBulkAdd} 
                    onChange={(e) => setShouldBulkAdd(e.target.checked)}
                    className="size-4 rounded-sm border-border text-primary focus:ring-primary focus:ring-offset-0"
                  />
                  <span className="text-sm font-bold text-text">Auto-generate weekly rehearsals?</span>
                </label>

                {shouldBulkAdd && (
                  <div className="flex flex-col gap-4 pt-2">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                      <div className="flex flex-col gap-1.5 md:col-span-1">
                        <label className="text-label">Count</label>
                        <input 
                          type="number" min="1" max="20"
                          value={bulkCount} onChange={(e) => setBulkCount(parseInt(e.target.value))}
                          className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm shadow-sm transition-colors focus:border-primary focus:ring-1 focus:ring-primary focus:outline-hidden"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5 md:col-span-2">
                        <label className="text-label">Day</label>
                        <Select 
                          value={bulkDay} onChange={(e) => setBulkDay(parseInt(e.target.value))}
                          size="small" className="animate-none"
                        >
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                            <option key={d} value={i}>{d}</option>
                          ))}
                        </Select>
                      </div>
                      <div className="flex flex-col gap-1.5 md:col-span-2">
                        <label className="text-label">Time</label>
                        <input 
                          type="time" value={bulkTime} onChange={(e) => setBulkTime(e.target.value)}
                          className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm shadow-sm transition-colors focus:border-primary focus:ring-1 focus:ring-primary focus:outline-hidden"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-label">Rehearsal Venue</label>
                      <Select 
                        value={bulkVenue} onChange={(e) => setBulkVenue(e.target.value)}
                        required
                        size="small"
                      >
                        <option value="">-- Select Rehearsal Venue --</option>
                        {venues.map(v => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </Select>
                    </div>
                    {startDate && (
                      <div className="mt-2 inline-flex items-center justify-center rounded-lg border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary-deep shadow-xs">
                        📅 First rehearsal: <strong className="ml-1.5">{startDate.toLocaleDateString()}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {formData.type === 'Rehearsal' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-label">Linked Performance (Parent)</label>
                <Select 
                  value={formData.parentPerformanceId} 
                  onChange={(e) => setFormData({ ...formData, parentPerformanceId: e.target.value })}
                  size="small"
                >
                  <option value="">None</option>
                  {performances.filter(p => p.id !== initialData?.id).map(p => (
                    <option key={p.id} value={p.id}>{p.title || new Date(p.date).toLocaleDateString()} - {p.expand?.venue?.name || ''}</option>
                  ))}
                </Select>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-label">Details / Notes</label>
              <textarea 
                value={formData.details} 
                onChange={(e) => setFormData({ ...formData, details: e.target.value })} 
                className="min-h-[100px] w-full resize-y rounded-md border border-border bg-surface p-3 text-sm shadow-sm transition-colors focus:border-primary focus:ring-1 focus:ring-primary focus:outline-hidden"
              />
            </div>
          </>
        )}

        {formData.type === 'Performance' && activeTab === 'tickets' && (
          <>
            <div className="text-sm font-extrabold tracking-tight text-primary-deep">🎟️ Ticketing Configuration</div>
            
            <label className="flex cursor-pointer flex-row items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isTicketingEnabled || false}
                onChange={(e) => setFormData({ ...formData, isTicketingEnabled: e.target.checked })}
                className="size-4 rounded-sm border-border text-primary focus:ring-primary focus:ring-offset-0"
              />
              <span className="text-sm font-bold text-text">Enable Online Ticket Sales</span>
            </label>

            {formData.isTicketingEnabled && (
              <div className="mt-2 rounded-lg border-l-4 border-primary bg-primary/10 p-4 shadow-sm">
                <div className="flex flex-col gap-2 text-sm text-text-muted">
                  <div>
                    <strong className="text-text">⚙️ Admin:</strong>{' '}
                    <a href="/admin/tickets" target="_blank" rel="noopener noreferrer" className="font-bold text-primary underline transition-colors hover:text-primary-deep">
                      Go to Ticketing Dashboard
                    </a>
                  </div>
                  {initialData?.id && (
                    <div>
                      <strong className="text-text">🔗 Storefront Link:</strong>{' '}
                      <a href={`/tickets/${initialData.id}`} target="_blank" rel="noopener noreferrer" className="font-bold text-primary underline transition-colors hover:text-primary-deep">
                        View Concert Ticket Page
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {hasPurchases && !formData.isTicketingEnabled && (
              <div className="border-warning-border bg-warning-bg mt-2 rounded-lg border p-4 shadow-sm">
                <strong className="text-warning-text text-sm font-bold">⚠️ Existing Ticket Sales</strong>
                <p className="text-warning-text/90 m-0 mt-2 text-sm leading-relaxed font-medium">
                  This event already has active ticket sales. Disabling ticket sales hides it from the storefront, but you can still view its Will Call checklist and process refunds in the <a href="/admin/tickets" target="_blank" rel="noopener noreferrer" className="hover:text-warning-text/70 font-bold underline transition-colors">Ticketing Dashboard</a> by checking <em>"Include past & inactive performances"</em>.
                </p>
              </div>
            )}

            {formData.isTicketingEnabled && (
              <div className="flex flex-col gap-6 pt-2">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
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
                      className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm shadow-sm transition-colors focus:border-primary focus:ring-1 focus:ring-primary focus:outline-hidden"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
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
                      className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm shadow-sm transition-colors focus:border-primary focus:ring-1 focus:ring-primary focus:outline-hidden"
                    />
                    {dayOfLiveText && (
                      <div className="mt-1 text-[0.7rem] font-bold tracking-tight text-primary">
                        {dayOfLiveText}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-label">Ticket Capacity</label>
                    <input
                      type="number"
                      placeholder="e.g. 150"
                      value={formData.ticketCapacity === undefined ? '' : formData.ticketCapacity}
                      onChange={(e) => setFormData({ ...formData, ticketCapacity: e.target.value === '' ? undefined : Number(e.target.value) })}
                      className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm shadow-sm transition-colors focus:border-primary focus:ring-1 focus:ring-primary focus:outline-hidden"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-label">Doors Open Time</label>
                    <input
                      type="text"
                      placeholder="e.g. 6:30 PM"
                      value={formData.doorsOpenTime || ''}
                      onChange={(e) => setFormData({ ...formData, doorsOpenTime: e.target.value })}
                      className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm shadow-sm transition-colors focus:border-primary focus:ring-1 focus:ring-primary focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-label">Event Graphic / Flyer Image</label>
                  <div className="flex items-center gap-4">
                    <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
                      {graphicPreviewUrl ? (
                        <img src={graphicPreviewUrl} alt="Event flyer preview" className="size-full object-cover" />
                      ) : (
                        <svg className="size-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.9 2.9m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375 0 11-.75 0 .375 0 01.75 0z" />
                        </svg>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary-light px-4 font-sans text-xs font-semibold text-primary-deep transition-colors hover:bg-primary-deep/10 active:translate-y-px">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                          {graphicPreviewUrl ? 'Replace Image' : 'Upload Image'}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              if (file) {
                                setEventGraphicFile(file);
                                setIsGraphicRemoved(false);
                              }
                            }}
                            className="hidden"
                          />
                        </label>

                        {(eventGraphicFile || (initialData?.eventGraphic && !isGraphicRemoved)) && (
                          <Button
                            variant="danger"
                            size="small"
                            onClick={() => {
                              setEventGraphicFile(null);
                              setIsGraphicRemoved(true);
                            }}
                          >
                            Remove Image
                          </Button>
                        )}
                      </div>
                      <span className="text-[10px] text-text-muted">
                        JPG, PNG, or WebP. Max 5MB.
                      </span>
                      {initialData?.eventGraphic && !isGraphicRemoved && !eventGraphicFile && (
                        <span className="text-xs text-text-muted">
                          Current file: {initialData.eventGraphic}
                        </span>
                      )}
                      {eventGraphicFile && (
                        <span className="text-xs text-primary font-medium">
                          New file: {eventGraphicFile.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-label">Public Details (HTML / Text)</label>
                  <textarea
                    placeholder="Describe the concert program, parking info, dress code, etc."
                    value={formData.publicDetails || ''}
                    onChange={(e) => setFormData({ ...formData, publicDetails: e.target.value })}
                    className="min-h-[120px] w-full resize-y rounded-md border border-border bg-surface p-3 text-sm shadow-sm transition-colors focus:border-primary focus:ring-1 focus:ring-primary focus:outline-hidden"
                  />
                </div>
              </div>
            )}
          </>
        )}
      </form>
      </div>
    </Modal>
  );
};
