import { useEffect, useState } from 'react';
import { useEvents } from '../../hooks/useEvents';
import { useVenues } from '../../hooks/useVenues';
import { EventList } from '../../components/admin/EventList';
import { EventModal } from '../../components/admin/EventModal';
import { BulkEventModal } from '../../components/admin/BulkEventModal';
import type { Event, BulkRehearsalConfig } from '../../services/eventService';
import { rosterService, type EventRoster } from '../../services/rosterService';
import { profileService, type Profile } from '../../services/profileService';
import { AppCard } from '../../components/common/AppCard';
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
  const [activeProfiles, setActiveProfiles] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'Yes' | 'No' | 'Pending'>('Yes');
  const [isUpdating, setIsUpdating] = useState(false);

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
    
    Promise.all([
      profileService.getActiveProfiles(),
      rosterService.getEventRoster(rosterEvent.id)
    ])
      .then(([profiles, rosters]) => {
        if (isCurrent) {
          setActiveProfiles(profiles);
          setEventRoster(rosters);
        }
      })
      .catch((err) => {
        console.error('Failed to load roster data', err);
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
    const recipients = roster
      .filter((item) => item.expand?.profile?.globalStatus !== 'Inactive' && item.rsvp !== 'No')
      .map((item) => {
        const profile = item.expand?.profile;
        return {
          id: profile?.id || '',
          name: profile?.name || '',
          email: profile?.expand?.user?.email || '',
          phone: profile?.phone || '',
          voicePart: profile?.voicePart || '',
          globalStatus: profile?.globalStatus || '',
        };
      })
      .filter((r): r is CommunicationRecipient => Boolean(r.id && r.email));

    if (recipients.length === 0) {
      await dialog.showMessage({
        title: 'No Email Addresses',
        message: 'No active event RSVP emails were found.',
      });
      return;
    }

    const values = getTemplateValues(event);
    const subject = renderCommunicationTemplate(communicationSettings.emailSubject, values);
    const body = renderCommunicationTemplate(communicationSettings.emailBody, values);

    setIsRosterLoading(true);
    try {
      await communicationService.sendBulkMessage({
        subject,
        content: body,
        type: 'Email',
        recipients,
        filters: {
          eventId: event.id,
          rsvp: 'All',
          voicePart: '',
          globalStatus: 'Active (Current)',
        },
      });

      await dialog.showMessage({
        title: 'Reminder Queueing',
        message: `Event email reminders have been queued and sent to ${recipients.length} recipients via the communications backend service.`,
        variant: 'info',
      });
    } catch {
      await dialog.showMessage({
        title: 'Could Not Send Reminder',
        message: 'The email reminder could not be dispatched via the communications backend service.',
        variant: 'danger',
      });
    } finally {
      setIsRosterLoading(false);
    }
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
          title={`RSVP Management: ${rosterEvent.title || rosterEvent.expand?.venue?.name || ''}`}
          actions={<button className="btn btn-ghost btn-sm" onClick={() => { setRosterEvent(null); setSearchQuery(''); }}>Close</button>}
        >
          {isRosterLoading ? (
            <p className="text-muted">Loading RSVP details...</p>
          ) : (() => {
            const profileRosterMap = new Map<string, EventRoster>();
            eventRoster.forEach(item => {
              if (item.profile) {
                profileRosterMap.set(item.profile, item);
              }
            });

            const mappedSingers = activeProfiles.map(profile => {
              const roster = profileRosterMap.get(profile.id);
              const rsvp = roster?.rsvp || 'Pending';
              return {
                profile,
                rsvp,
                roster,
              };
            });

            const yesCount = mappedSingers.filter(s => s.rsvp === 'Yes').length;
            const noCount = mappedSingers.filter(s => s.rsvp === 'No').length;
            const pendingCount = mappedSingers.filter(s => s.rsvp === 'Pending').length;

            const filteredSingers = mappedSingers.filter(singer => {
              if (singer.rsvp !== activeTab) return false;
              if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                return singer.profile.name.toLowerCase().includes(q);
              }
              return true;
            });

            const handleUpdateRSVP = async (profileId: string, nextRsvp: 'Yes' | 'No' | 'Pending') => {
              setIsUpdating(true);
              try {
                await rosterService.updateRSVP(rosterEvent.id, profileId, nextRsvp);
                const rosters = await rosterService.getEventRoster(rosterEvent.id);
                setEventRoster(rosters);
              } catch (err: unknown) {
                await dialog.showMessage({
                  title: 'Could Not Update RSVP',
                  message: err instanceof Error ? err.message : 'Failed to update RSVP status',
                  variant: 'danger',
                });
              } finally {
                setIsUpdating(false);
              }
            };

            return (
              <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
                {/* Search Bar */}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🔍 Search active singers by name..."
                  className="card"
                  style={{
                    width: '100%',
                    padding: '0 12px',
                    height: '40px',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--surface)',
                  }}
                />

                {/* Tab Selector */}
                <div className="flex-row" style={{ gap: 'var(--space-sm)', flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-sm)' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('Yes')}
                    className={`btn btn-sm`}
                    style={{
                      height: '38px',
                      padding: '0 16px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: activeTab === 'Yes' ? 'rgba(74, 117, 89, 0.15)' : 'transparent',
                      color: activeTab === 'Yes' ? 'var(--primary-deep)' : 'var(--text-muted)',
                      border: `1px solid ${activeTab === 'Yes' ? 'rgba(74, 117, 89, 0.3)' : 'var(--border)'}`,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    🟢 Attending ({yesCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('No')}
                    className={`btn btn-sm`}
                    style={{
                      height: '38px',
                      padding: '0 16px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: activeTab === 'No' ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                      color: activeTab === 'No' ? '#b91c1c' : 'var(--text-muted)',
                      border: `1px solid ${activeTab === 'No' ? 'rgba(239, 68, 68, 0.2)' : 'var(--border)'}`,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    🔴 Declined ({noCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('Pending')}
                    className={`btn btn-sm`}
                    style={{
                      height: '38px',
                      padding: '0 16px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: activeTab === 'Pending' ? 'rgba(107, 114, 128, 0.08)' : 'transparent',
                      color: activeTab === 'Pending' ? '#4b5563' : 'var(--text-muted)',
                      border: `1px solid ${activeTab === 'Pending' ? 'rgba(107, 114, 128, 0.2)' : 'var(--border)'}`,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ⏳ No Response ({pendingCount})
                  </button>
                </div>

                {/* Singers List */}
                <div className="flex-col" style={{ gap: 'var(--space-xs)', maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
                  {filteredSingers.map((singer) => (
                    <div
                      key={singer.profile.id}
                      className="flex-responsive"
                      style={{
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid var(--border)',
                        padding: 'var(--space-sm) 0',
                        gap: 'var(--space-md)',
                      }}
                    >
                      <div className="flex-col" style={{ gap: '2px' }}>
                        <div style={{ fontWeight: 700 }}>{singer.profile.name}</div>
                        <div className="text-muted text-xs">{singer.profile.voicePart || 'No voice part'}</div>
                      </div>

                      {/* Override Button Group */}
                      <div className="flex-row" style={{ gap: '6px', alignItems: 'center' }}>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdateRSVP(singer.profile.id, 'Yes')}
                          className="btn btn-sm"
                          style={{
                            height: '34px',
                            minWidth: '76px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            backgroundColor: singer.rsvp === 'Yes' ? 'var(--primary-deep)' : 'transparent',
                            color: singer.rsvp === 'Yes' ? '#ffffff' : 'var(--text-muted)',
                            border: `1px solid ${singer.rsvp === 'Yes' ? 'var(--primary-deep)' : 'var(--border)'}`,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          Attending
                        </button>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdateRSVP(singer.profile.id, 'No')}
                          className="btn btn-sm"
                          style={{
                            height: '34px',
                            minWidth: '76px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            backgroundColor: singer.rsvp === 'No' ? '#ef4444' : 'transparent',
                            color: singer.rsvp === 'No' ? '#ffffff' : 'var(--text-muted)',
                            border: `1px solid ${singer.rsvp === 'No' ? '#ef4444' : 'var(--border)'}`,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          Declined
                        </button>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdateRSVP(singer.profile.id, 'Pending')}
                          className="btn btn-sm"
                          style={{
                            height: '34px',
                            minWidth: '76px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            backgroundColor: singer.rsvp === 'Pending' ? '#6b7280' : 'transparent',
                            color: singer.rsvp === 'Pending' ? '#ffffff' : 'var(--text-muted)',
                            border: `1px solid ${singer.rsvp === 'Pending' ? '#6b7280' : 'var(--border)'}`,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  ))}

                  {filteredSingers.length === 0 && (
                    <p className="text-muted" style={{ padding: 'var(--space-md) 0', textAlign: 'center' }}>
                      {searchQuery ? `No active singers matching "${searchQuery}" found in this section.` : `No active singers found in this section.`}
                    </p>
                  )}
                </div>
              </div>
            );
          })()}
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
