import { useEffect, useState } from 'react';
import { useEvents } from '../../hooks/useEvents';
import { useVenues } from '../../hooks/useVenues';
import { EventList } from '../../components/admin/EventList';
import { EventModal } from '../../components/admin/EventModal';
import { BulkEventModal } from '../../components/admin/BulkEventModal';
import type { Event } from '../../services/eventService';
import { rosterService, type EventRoster } from '../../services/rosterService';
import { AppCard } from '../../components/common/AppCard';
import { useDialog } from '../../contexts/DialogContext';
import {
  DEFAULT_COMMUNICATION_SETTINGS,
  renderCommunicationTemplate,
  settingsService,
  type AuditionSettings,
  type CommunicationSettings,
} from '../../services/settingsService';

export default function EventsView() {
  const dialog = useDialog();
  const { events, performances, isLoading, error, addEvent, editEvent, removeEvent, bulkAddRehearsals } = useEvents();
  const { venues, addVenue } = useVenues();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [rosterEvent, setRosterEvent] = useState<Event | null>(null);
  const [eventRoster, setEventRoster] = useState<EventRoster[]>([]);
  const [isRosterLoading, setIsRosterLoading] = useState(false);
  const [textEvent, setTextEvent] = useState<Event | null>(null);
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

  useEffect(() => {
    if (!rosterEvent) return;

    let isCurrent = true;
    setIsRosterLoading(true);
    rosterService.getEventRoster(rosterEvent.id)
      .then((records) => {
        if (isCurrent) setEventRoster(records);
      })
      .finally(() => {
        if (isCurrent) setIsRosterLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [rosterEvent]);

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

  const handleSave = async (data: Partial<Event>, bulkConfig?: any, openAuditions?: boolean) => {
    let savedEvent: Event | undefined;
    if (editingEvent) {
      savedEvent = await editEvent(editingEvent.id, data);
    } else {
      const newEvent = await addEvent(data);
      savedEvent = newEvent;
      if (bulkConfig && newEvent) {
        await bulkAddRehearsals(newEvent, bulkConfig);
      }
    }

    if (openAuditions && savedEvent && savedEvent.type === 'Performance') {
      const currentSettings = await settingsService.getAuditionSettings();
      const updatedSettings = {
        ...currentSettings,
        enabled: true,
        defaultPerformanceId: savedEvent.id
      };
      await settingsService.saveAuditionSettings(updatedSettings);
      setAuditionSettings(updatedSettings);
      await dialog.showMessage({
        title: 'Auditions Opened',
        message: `Public auditions are now active for "${savedEvent.title || 'this performance'}".`,
      });
    } else if (!openAuditions && savedEvent && savedEvent.type === 'Performance') {
        // If they explicitly unchecked it, and it WAS the default, we should probably disable it or unset it
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
  };

  const handleEmailReminder = async (event: Event) => {
    const roster = await rosterService.getEventRoster(event.id);
    const emails = roster
      .filter((item) => item.expand?.profile?.globalStatus !== 'Inactive' && item.rsvp !== 'No')
      .map((item) => item.expand?.profile?.expand?.user?.email)
      .filter((email): email is string => Boolean(email));

    if (emails.length === 0) {
      await dialog.showMessage({
        title: 'No Email Addresses',
        message: 'No active event RSVP emails were found.',
      });
      return;
    }

    const values = getTemplateValues(event);
    const subject = encodeURIComponent(renderCommunicationTemplate(communicationSettings.emailSubject, values));
    const body = encodeURIComponent(renderCommunicationTemplate(communicationSettings.emailBody, values));

    window.location.assign(`mailto:?bcc=${encodeURIComponent(emails.join(','))}&subject=${subject}&body=${body}`);
  };

  const getTemplateValues = (event: Event) => ({
    eventTitle: event.title || event.type,
    eventDate: new Date(event.date).toLocaleString(),
    eventLocation: event.expand?.venue?.name || '',
    eventDetails: event.details || '',
  });

  const activeProfilesForText = async (eventId: string) => {
    const roster = await rosterService.getEventRoster(eventId);
    return roster
      .map((item) => item.expand?.profile)
      .filter((profile): profile is NonNullable<typeof profile> => Boolean(profile && profile.globalStatus !== 'Inactive' && profile.phone));
  };

  if (isLoading && events.length === 0) return <div style={{ padding: '20px' }}>Loading events...</div>;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;

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
        onEmailReminder={handleEmailReminder}
        onTextReminder={setTextEvent}
        onViewRoster={setRosterEvent}
        openAuditionEventId={auditionSettings?.enabled ? auditionSettings.defaultPerformanceId : undefined}
      />

      {textEvent && (
        <AppCard
          title={`Text Reminder: ${textEvent.title || textEvent.expand?.venue?.name || ''}`}
          actions={<button className="btn btn-ghost btn-sm" onClick={() => setTextEvent(null)}>Close</button>}
        >
          <TextReminderPanel
            event={textEvent}
            message={renderCommunicationTemplate(communicationSettings.smsBody, getTemplateValues(textEvent))}
            loadProfiles={() => activeProfilesForText(textEvent.id)}
          />
        </AppCard>
      )}

      {rosterEvent && (
        <AppCard
          title={`RSVP List: ${rosterEvent.title || rosterEvent.expand?.venue?.name || ''}`}
          actions={<button className="btn btn-ghost btn-sm" onClick={() => setRosterEvent(null)}>Close</button>}
        >
          {isRosterLoading ? (
            <p className="text-muted">Loading RSVP list...</p>
          ) : (
            <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
              <div className="flex-row" style={{ gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                <span className="badge badge-success">Yes: {eventRoster.filter((item) => item.rsvp === 'Yes').length}</span>
                <span className="badge badge-danger">No: {eventRoster.filter((item) => item.rsvp === 'No').length}</span>
                <span className="badge badge-rehearsal">Pending: {eventRoster.filter((item) => item.rsvp === 'Pending').length}</span>
              </div>

              {eventRoster.filter((item) => item.rsvp === 'Yes').map((item) => (
                <div key={item.id} className="flex-responsive" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-md)' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{item.expand?.profile?.name || 'Unknown singer'}</div>
                    <div className="text-muted">{item.expand?.profile?.voicePart || 'No voice part'}</div>
                  </div>
                  <span className="badge badge-success">Attending</span>
                </div>
              ))}

              {eventRoster.filter((item) => item.rsvp === 'Yes').length === 0 && (
                <p className="text-muted">No singers have RSVP'd yes for this event yet.</p>
              )}
            </div>
          )}
        </AppCard>
      )}

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

function TextReminderPanel({
  event,
  message,
  loadProfiles,
}: {
  event: Event;
  message: string;
  loadProfiles: () => Promise<Array<{ id: string; name: string; phone: string }>>;
}) {
  const [profiles, setProfiles] = useState<Array<{ id: string; name: string; phone: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    loadProfiles()
      .then((loaded) => {
        if (isCurrent) setProfiles(loaded);
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [event.id, loadProfiles]);

  if (isLoading) return <p className="text-muted">Loading phone numbers...</p>;

  return (
    <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
      <div className="card" style={{ backgroundColor: 'var(--bg)', boxShadow: 'none' }}>
        <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{message}</p>
      </div>

      {profiles.map((profile) => (
        <div key={profile.id} className="flex-responsive" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-md)' }}>
          <div>
            <div style={{ fontWeight: 700 }}>{profile.name}</div>
            <div className="text-muted">{profile.phone}</div>
          </div>
          <a className="btn btn-secondary btn-sm" href={`sms:${encodeURIComponent(profile.phone)}?&body=${encodeURIComponent(message)}`}>
            Text
          </a>
        </div>
      ))}

      {profiles.length === 0 && <p className="text-muted">No active singers have phone numbers.</p>}
    </div>
  );
}
