import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEvents } from '../../hooks/useEvents';
import { useVenues } from '../../hooks/useVenues';
import { EventList } from '../../components/admin/EventList';
import { EventModal } from '../../components/admin/EventModal';
import { BulkEventModal } from '../../components/admin/BulkEventModal';
import type { Event, BulkRehearsalConfig } from '../../services/eventService';
import { useDialog } from '../../contexts/DialogContext';
import {
  DEFAULT_COMMUNICATION_SETTINGS,
  renderCommunicationTemplate,
  settingsService,
  type AuditionSettings,
  type CommunicationSettings,
} from '../../services/settingsService';
import { playerService } from '../../services/playerService';
import { useChoirSettings } from '../../hooks/useDocumentTitle';
import { formatInTimezone } from '../../lib/timezone';

export default function EventsView() {
  const dialog = useDialog();
  const navigate = useNavigate();
  const { timezone } = useChoirSettings();
  const { events, performances, isLoading, error, addEvent, editEvent, removeEvent, bulkAddRehearsals } = useEvents();
  const { venues, addVenue } = useVenues();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [communicationSettings, setCommunicationSettings] = useState<CommunicationSettings>(DEFAULT_COMMUNICATION_SETTINGS);
  const [auditionSettings, setAuditionSettings] = useState<AuditionSettings | null>(null);

  useEffect(() => {
    Promise.all([
      settingsService.getCommunicationSettings(),
      settingsService.getAuditionSettings()
    ])
      .then(([comm, aud]) => {
        setCommunicationSettings(comm);
        setAuditionSettings(aud);
      })
      .catch(() => undefined);
  }, []);

  const handleOpenPlayer = async (event: Event) => {
    try {
      const token = await playerService.generateToken(event.id);
      const url = `${window.location.origin}/player?token=${encodeURIComponent(token)}`;
      
      await dialog.showMessage({
        title: 'Player Link Generated',
        message: (
          <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
            <p>A standalone practice link has been generated for "{event.title || event.type}".</p>
            <div className="card" style={{ padding: 'var(--space-sm)', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', wordBreak: 'break-all', fontSize: '0.85rem' }}>
              {url}
            </div>
            <div className="flex-row" style={{ gap: 'var(--space-sm)' }}>
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => {
                  navigator.clipboard.writeText(url);
                }}
              >
                Copy Link
              </button>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => window.open(url, '_blank')}
              >
                Open Player
              </button>
            </div>
          </div>
        )
      });
    } catch (e) {
      console.error(e);
      await dialog.showMessage({
        title: 'Error',
        message: 'Could not generate player link.',
        variant: 'danger'
      });
    }
  };

  const handleSendMessage = (event: Event) => {
    const venueName = event.venue 
      ? (venues.find(v => v.id === event.venue)?.name || 'TBD')
      : 'TBD';

    const values = {
      eventTitle: event.title || event.type,
      eventType: event.type,
      eventDate: formatInTimezone(event.date, timezone, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
      eventLocation: venueName,
      eventDetails: event.details || '',
      singerName: '{singerName}',
      rsvpLinks: '{{RSVP_LINKS}}',
    };

    const initialSubject = renderCommunicationTemplate(communicationSettings.reminderSubjectTemplate, values);
    const initialContent = renderCommunicationTemplate(communicationSettings.reminderBodyTemplate, values);

    navigate('/admin/communications', {
      state: {
        initialEventId: event.id,
        initialSubject,
        initialContent,
      }
    });
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const handleBulkAdd = () => {
    setEditingEvent(null);
    setIsBulkModalOpen(true);
  };

  const handleSave = async (data: Partial<Event>, bulkConfig?: BulkRehearsalConfig, openAuditions?: boolean) => {
    let resultEvent: Event | undefined;
    try {
      if (editingEvent) {
        resultEvent = await editEvent(editingEvent.id, data);
      } else {
        resultEvent = await addEvent(data, bulkConfig);
      }

      // Close modal immediately after successful save to ensure data integrity
      // and update the list view state.
      setIsModalOpen(false);

      if (!resultEvent) return;
      const savedEvent = resultEvent;

      if (openAuditions && savedEvent.type === 'Performance') {
        const currentSettings = await settingsService.getAuditionSettings();
        const updatedSettings = {
          ...currentSettings,
          enabled: true,
          defaultPerformanceId: savedEvent.id
        };
        await settingsService.saveAuditionSettings(updatedSettings);
        setAuditionSettings(updatedSettings);
        dialog.showToast(`Public auditions are now active for "${savedEvent.title || 'this performance'}".`);
      } else if (!openAuditions && savedEvent.type === 'Performance') {
          const currentSettings = await settingsService.getAuditionSettings();
          if (currentSettings.defaultPerformanceId === savedEvent.id && currentSettings.enabled) {
              const updatedSettings = {
                  ...currentSettings,
                  enabled: false
              };
              await settingsService.saveAuditionSettings(updatedSettings);
              setAuditionSettings(updatedSettings);
          }
      }

      // Check if RSVP was newly opened (true now, but not before, or new event with RSVP open)
      const isNewRsvpOpen = savedEvent.isOpenForRSVP && (!editingEvent || !editingEvent.isOpenForRSVP);
      if (isNewRsvpOpen) {
        const confirmed = await dialog.confirm({
          title: 'RSVP Opened',
          message: `RSVP is now open for "${savedEvent.title || savedEvent.type}"! Would you like to draft and compose the RSVP invitation email to active choir members now?`,
          confirmLabel: 'Draft Invitation',
          cancelLabel: 'Later',
          variant: 'info'
        });

        if (confirmed) {
          const venueName = savedEvent.venue 
            ? (venues.find(v => v.id === savedEvent.venue)?.name || 'TBD')
            : 'TBD';

          const values = {
            eventTitle: savedEvent.title || savedEvent.type,
            eventType: savedEvent.type,
            eventDate: formatInTimezone(savedEvent.date, timezone, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
            eventLocation: venueName,
            eventDetails: savedEvent.details || '',
            singerName: '{singerName}',
            rsvpLinks: '{{RSVP_LINKS}}',
          };

          const initialSubject = renderCommunicationTemplate(communicationSettings.reminderSubjectTemplate, values);
          const initialContent = renderCommunicationTemplate(communicationSettings.reminderBodyTemplate, values);

          navigate('/admin/communications', {
            state: {
              initialEventId: savedEvent.id,
              initialSubject,
              initialContent,
            }
          });
        }
      }
    } catch (err: unknown) {
      console.error('Save failed', err);
      // Re-throw to be caught by the modal's error handler
      throw err;
    }
  };

  if (isLoading && events.length === 0) {
    return (
      <div className="flex-col" style={{ padding: 'var(--space-xl)', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: 'var(--space-md)' }}>
        <div className="spinner-small" style={{ width: '40px', height: '40px', borderWidth: '3px' }} />
        <div className="text-muted text-label" style={{ opacity: 0.8 }}>Loading scheduled events...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card flex-col" style={{ padding: 'var(--space-xl)', borderColor: 'var(--color-danger-text)', backgroundColor: 'var(--color-danger-bg)', alignItems: 'center', textAlign: 'center', maxWidth: '500px', margin: 'var(--space-xl) auto' }}>
        <span style={{ fontSize: '2rem' }}>⚠️</span>
        <div className="text-headline" style={{ color: 'var(--color-danger-text)' }}>Failed to load events</div>
        <p className="text-muted" style={{ color: 'var(--color-danger-text)', opacity: 0.8 }}>{error}</p>
        <button onClick={() => window.location.reload()} className="btn btn-danger btn-sm">Reload Page</button>
      </div>
    );
  }

  return (
    <div className="flex-col" style={{ gap: 'var(--space-xl)', padding: '0 0 var(--space-xl) 0' }}>
      <div className="flex-responsive" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="text-display" style={{ margin: 0 }}>Event Management</h1>
        <div className="flex-responsive" style={{ gap: 'var(--space-md)' }}>
          <button onClick={handleBulkAdd} className="btn btn-secondary">
            ⚡ Bulk Add Rehearsals
          </button>
          <button onClick={handleAdd} className="btn btn-primary">
            + Single Event
          </button>
        </div>
      </div>

      <EventList
        events={events}
        onEdit={handleEdit}
        onSendMessage={handleSendMessage}
        onViewRoster={(event) => navigate(`/admin/events/${event.id}/roster`)}
        onCheckAttendance={(event) => navigate(`/admin/attendance?eventId=${event.id}`)}
        onViewSeating={(event) => navigate(`/admin/seating?eventId=${event.id}`)}
        onOpenPlayer={handleOpenPlayer}
        openAuditionEventId={auditionSettings?.enabled ? auditionSettings.defaultPerformanceId : undefined}
      />

      <EventModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSave} 
        onDelete={removeEvent}
        initialData={editingEvent} 
        performances={performances}
        venues={venues}
        onAddVenue={addVenue}
      />

      <BulkEventModal 
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSave={bulkAddRehearsals}
        performances={performances}
        venues={venues}
      />
    </div>
  );
}
