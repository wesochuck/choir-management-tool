import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEvents } from '../../hooks/useEvents';
import { useVenues } from '../../hooks/useVenues';
import { EventList } from '../../components/admin/EventList';
import { EventModal } from '../../components/admin/EventModal';
import { BulkEventModal } from '../../components/admin/BulkEventModal';
import type { Event, BulkRehearsalConfig } from '../../services/eventService';
import { rosterService, type EventRoster } from '../../services/rosterService';
import { BaseModal } from '../../components/common/BaseModal';
import { useDialog } from '../../contexts/DialogContext';
import {
  DEFAULT_COMMUNICATION_SETTINGS,
  renderCommunicationTemplate,
  settingsService,
  type AuditionSettings,
  type CommunicationSettings,
} from '../../services/settingsService';
import {
  communicationService,
  type CommunicationRecipient,
} from '../../services/communicationService';

export default function EventsView() {
  const dialog = useDialog();
  const navigate = useNavigate();
  const { events, performances, isLoading, error, addEvent, editEvent, removeEvent, bulkAddRehearsals } = useEvents();
  const { venues, addVenue } = useVenues();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [reminderConfig, setReminderConfig] = useState<{ event: Event; type: 'Email' | 'SMS' } | null>(null);
  const [reminderRoster, setReminderRoster] = useState<EventRoster[]>([]);
  const [isReminderLoading, setIsReminderLoading] = useState(false);
  const [reminderTarget, setReminderTarget] = useState<'Yes' | 'YesPending' | 'All'>('YesPending');
  const [isSendingReminder, setIsSendingReminder] = useState(false);
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
    if (!reminderConfig) {
      setReminderRoster([]);
      return;
    }
    
    let isCurrent = true;
    setIsReminderLoading(true);
    rosterService.getEventRoster(reminderConfig.event.id)
      .then((rosters) => {
        if (isCurrent) {
          setReminderRoster(rosters);
        }
      })
      .catch((err) => {
        console.error('Failed to load reminder roster', err);
      })
      .finally(() => {
        if (isCurrent) setIsReminderLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [reminderConfig]);

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

  const getTemplateValues = (event: Event) => ({
    eventTitle: event.title || event.type,
    eventDate: new Date(event.date).toLocaleString(),
    eventLocation: event.expand?.venue?.name || '',
    eventDetails: event.details || '',
  });

  const getFilteredRecipients = () => {
    if (!reminderConfig) return [];
    
    return reminderRoster
      .filter((item) => {
        const profile = item.expand?.profile;
        if (!profile || profile.globalStatus === 'Inactive') return false;
        
        if (reminderTarget === 'Yes') {
          return item.rsvp === 'Yes';
        }
        if (reminderTarget === 'YesPending') {
          return item.rsvp !== 'No';
        }
        return true;
      })
      .map((item) => item.expand?.profile)
      .filter((profile): profile is NonNullable<typeof profile> => Boolean(profile));
  };

  const getFilteredRecipientsForSms = () => {
    return getFilteredRecipients().filter(p => p.phone);
  };

  const handleSendReminderEmail = async (event: Event) => {
    setIsSendingReminder(true);
    try {
      const activeProfiles = getFilteredRecipients();
      const recipients = activeProfiles
        .map((profile): CommunicationRecipient => ({
          id: profile.id,
          name: profile.name,
          email: profile.expand?.user?.email || '',
          phone: profile.phone || '',
          voicePart: profile.voicePart || '',
          globalStatus: profile.globalStatus || '',
        }))
        .filter((r) => Boolean(r.id && r.email));

      if (recipients.length === 0) {
        await dialog.showMessage({
          title: 'No Email Addresses',
          message: 'No active event RSVP emails were found matching this filter.',
        });
        return;
      }

      const values = getTemplateValues(event);
      const subject = renderCommunicationTemplate(communicationSettings.emailSubject, values);
      const body = renderCommunicationTemplate(communicationSettings.emailBody, values);

      await communicationService.sendBulkMessage({
        subject,
        content: body,
        type: 'Email',
        recipients,
        filters: {
          eventId: event.id,
          rsvp: reminderTarget === 'Yes' ? 'Yes' : reminderTarget === 'YesPending' ? 'Pending' : 'All',
          voicePart: '',
          globalStatus: 'Active (Current)',
        },
      });

      await dialog.showMessage({
        title: 'Reminder Queueing',
        message: `Event email reminders have been queued and sent to ${recipients.length} recipients via the communications backend service.`,
        variant: 'info',
      });
      setReminderConfig(null);
    } catch {
      await dialog.showMessage({
        title: 'Could Not Send Reminder',
        message: 'The email reminder could not be dispatched via the communications backend service.',
        variant: 'danger',
      });
    } finally {
      setIsSendingReminder(false);
    }
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
        onEmailReminder={(event) => setReminderConfig({ event, type: 'Email' })}
        onTextReminder={(event) => setReminderConfig({ event, type: 'SMS' })}
        onViewRoster={(event) => navigate(`/admin/events/${event.id}/roster`)}
        openAuditionEventId={auditionSettings?.enabled ? auditionSettings.defaultPerformanceId : undefined}
      />

      {reminderConfig && (
        <BaseModal
          isOpen={Boolean(reminderConfig)}
          onClose={() => setReminderConfig(null)}
          title={`Send ${reminderConfig.type} Reminder`}
          maxWidth="550px"
          footer={
            <>
              <button 
                className="btn btn-ghost" 
                onClick={() => setReminderConfig(null)} 
                disabled={isSendingReminder}
              >
                Cancel
              </button>
              {reminderConfig.type === 'Email' ? (
                <button 
                  className="btn btn-primary" 
                  onClick={() => handleSendReminderEmail(reminderConfig.event)}
                  disabled={isSendingReminder || isReminderLoading || getFilteredRecipients().length === 0}
                >
                  {isSendingReminder ? 'Sending...' : `Send Email (${getFilteredRecipients().length})`}
                </button>
              ) : (
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setReminderConfig(null)}
                >
                  Close
                </button>
              )}
            </>
          }
        >
          <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <label className="text-label" style={{ fontWeight: 'bold' }}>1. Select Recipient Filter</label>
              <div className="flex-row" style={{ gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setReminderTarget('Yes')}
                  style={{
                    height: '38px',
                    backgroundColor: reminderTarget === 'Yes' ? 'rgba(74, 117, 89, 0.15)' : 'transparent',
                    color: reminderTarget === 'Yes' ? 'var(--primary-deep)' : 'var(--text-muted)',
                    border: `1px solid ${reminderTarget === 'Yes' ? 'rgba(74, 117, 89, 0.3)' : 'var(--border)'}`,
                    fontWeight: 700,
                  }}
                >
                  🟢 Attending Only ({reminderRoster.filter(r => r.expand?.profile?.globalStatus !== 'Inactive' && r.rsvp === 'Yes').length})
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setReminderTarget('YesPending')}
                  style={{
                    height: '38px',
                    backgroundColor: reminderTarget === 'YesPending' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                    color: reminderTarget === 'YesPending' ? '#1d4ed8' : 'var(--text-muted)',
                    border: `1px solid ${reminderTarget === 'YesPending' ? 'rgba(59, 130, 246, 0.3)' : 'var(--border)'}`,
                    fontWeight: 700,
                  }}
                >
                  👥 Attending + Pending ({reminderRoster.filter(r => r.expand?.profile?.globalStatus !== 'Inactive' && r.rsvp !== 'No').length})
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setReminderTarget('All')}
                  style={{
                    height: '38px',
                    backgroundColor: reminderTarget === 'All' ? 'rgba(107, 114, 128, 0.08)' : 'transparent',
                    color: reminderTarget === 'All' ? '#4b5563' : 'var(--text-muted)',
                    border: `1px solid ${reminderTarget === 'All' ? 'rgba(107, 114, 128, 0.2)' : 'var(--border)'}`,
                    fontWeight: 700,
                  }}
                >
                  📢 Everyone Active ({reminderRoster.filter(r => r.expand?.profile?.globalStatus !== 'Inactive').length})
                </button>
              </div>
            </div>

            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <label className="text-label" style={{ fontWeight: 'bold' }}>2. Message Template Preview</label>
              <div className="card" style={{ backgroundColor: 'var(--bg)', boxShadow: 'none', padding: 'var(--space-md)', border: '1px solid var(--border)' }}>
                {reminderConfig.type === 'Email' ? (
                  <>
                    <div style={{ fontWeight: 'bold', borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '8px' }}>
                      Subject: {renderCommunicationTemplate(communicationSettings.emailSubject, getTemplateValues(reminderConfig.event))}
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                      {renderCommunicationTemplate(communicationSettings.emailBody, getTemplateValues(reminderConfig.event))}
                    </div>
                  </>
                ) : (
                  <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                    {renderCommunicationTemplate(communicationSettings.smsBody, getTemplateValues(reminderConfig.event))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <label className="text-label" style={{ fontWeight: 'bold' }}>
                3. Recipients ({reminderConfig.type === 'Email' ? getFilteredRecipients().length : getFilteredRecipientsForSms().length})
              </label>
              <div className="card flex-col" style={{ gap: 'var(--space-sm)', maxHeight: '180px', overflowY: 'auto', boxShadow: 'none', backgroundColor: 'var(--bg)', padding: 'var(--space-sm)', border: '1px solid var(--border)' }}>
                {isReminderLoading ? (
                  <p className="text-muted text-xs">Loading recipients...</p>
                ) : reminderConfig.type === 'Email' ? (
                  getFilteredRecipients().map((profile) => (
                    <div key={profile.id} className="flex-row" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '4px', fontSize: '0.85rem' }}>
                      <span><strong>{profile.name}</strong> <span style={{ color: 'var(--text-muted)' }}>({profile.voicePart || 'No Part'})</span></span>
                      <span className="text-muted">{profile.expand?.user?.email || 'No email'}</span>
                    </div>
                  ))
                ) : (
                  getFilteredRecipientsForSms().map((profile) => {
                    const smsMessage = renderCommunicationTemplate(communicationSettings.smsBody, getTemplateValues(reminderConfig.event));
                    return (
                      <div key={profile.id} className="flex-row" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '4px', fontSize: '0.85rem' }}>
                        <span><strong>{profile.name}</strong> <span style={{ color: 'var(--text-muted)' }}>({profile.phone})</span></span>
                        <a 
                          className="btn btn-secondary btn-sm" 
                          style={{ height: '28px', padding: '0 10px', fontSize: '0.7rem' }}
                          href={`sms:${encodeURIComponent(profile.phone)}?&body=${encodeURIComponent(smsMessage)}`}
                        >
                          Send Text
                        </a>
                      </div>
                    );
                  })
                )}
                {!isReminderLoading && reminderConfig.type === 'Email' && getFilteredRecipients().length === 0 && (
                  <p className="text-muted text-xs">No active singers match this filter.</p>
                )}
                {!isReminderLoading && reminderConfig.type === 'SMS' && getFilteredRecipientsForSms().length === 0 && (
                  <p className="text-muted text-xs">No active singers with phone numbers match this filter.</p>
                )}
              </div>
            </div>
          </div>
        </BaseModal>
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
