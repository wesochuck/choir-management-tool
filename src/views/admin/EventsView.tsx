import { useEffect, useState } from 'react';
import { useEvents } from '../../hooks/useEvents';
import { useVenues } from '../../hooks/useVenues';
import { EventList } from '../../components/admin/EventList';
import { EventModal } from '../../components/admin/EventModal';
import { BulkEventModal } from '../../components/admin/BulkEventModal';
import { EventRosterTable } from '../../components/admin/EventRosterTable';
import type { Event, BulkRehearsalConfig } from '../../services/eventService';
import { rosterService, type EventRoster } from '../../services/rosterService';
import { profileService, type Profile } from '../../services/profileService';
import { AppCard } from '../../components/common/AppCard';
import { BaseModal } from '../../components/common/BaseModal';
import { useDialog } from '../../contexts/DialogContext';
import {
  DEFAULT_COMMUNICATION_SETTINGS,
  renderCommunicationTemplate,
  settingsService,
  getVoiceParts,
  type AuditionSettings,
  type CommunicationSettings,
  type VoicePartDef,
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
  const [reminderConfig, setReminderConfig] = useState<{ event: Event; type: 'Email' | 'SMS' } | null>(null);
  const [reminderRoster, setReminderRoster] = useState<EventRoster[]>([]);
  const [isReminderLoading, setIsReminderLoading] = useState(false);
  const [reminderTarget, setReminderTarget] = useState<'Yes' | 'YesPending' | 'All'>('YesPending');
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [communicationSettings, setCommunicationSettings] = useState<CommunicationSettings>(DEFAULT_COMMUNICATION_SETTINGS);
  const [auditionSettings, setAuditionSettings] = useState<AuditionSettings | null>(null);
  const [activeProfiles, setActiveProfiles] = useState<Profile[]>([]);
  const [voiceParts, setVoiceParts] = useState<VoicePartDef[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVoiceParts, setSelectedVoiceParts] = useState<string[]>([]);
  const [rsvpFilter, setRsvpFilter] = useState<'All' | 'Yes' | 'No' | 'Pending'>('All');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    Promise.all([
      settingsService.getCommunicationSettings(),
      settingsService.getAuditionSettings(),
      getVoiceParts()
    ])
      .then(([comm, aud, parts]) => {
        setCommunicationSettings(comm);
        setAuditionSettings(aud);
        setVoiceParts(parts);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!rosterEvent) return;

    let isCurrent = true;
    setIsRosterLoading(true);
    
    Promise.all([
      profileService.getActiveProfiles(),
      rosterService.getEventRoster(rosterEvent.id),
      getVoiceParts()
    ])
      .then(([profiles, rosters, parts]) => {
        if (isCurrent) {
          setActiveProfiles(profiles);
          setEventRoster(rosters);
          setVoiceParts(parts);
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
        onViewRoster={setRosterEvent}
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

      {rosterEvent && (
        <AppCard
          title={`RSVP Management: ${rosterEvent.title || rosterEvent.expand?.venue?.name || ''}`}
          actions={
            <button 
              className="btn btn-ghost btn-sm" 
              onClick={() => { 
                setRosterEvent(null); 
                setSearchQuery(''); 
                setSelectedVoiceParts([]); 
                setRsvpFilter('All'); 
              }}
            >
              Close
            </button>
          }
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

            // Filter mappedSingers by the selected rsvpFilter for the voice breakdown counts
            const activeCountSingers = mappedSingers.filter(s => {
              if (rsvpFilter === 'All') return true;
              return s.rsvp === rsvpFilter;
            });

            const sectionCounts = {
              S: activeCountSingers.filter(s => s.profile.voicePart?.startsWith('S')).length,
              A: activeCountSingers.filter(s => s.profile.voicePart?.startsWith('A')).length,
              T: activeCountSingers.filter(s => s.profile.voicePart?.startsWith('T')).length,
              B: activeCountSingers.filter(s => s.profile.voicePart?.startsWith('B')).length,
            };

            const partCounts = new Map<string, number>();
            voiceParts.forEach(vp => {
              const count = activeCountSingers.filter(s => s.profile.voicePart === vp.label).length;
              partCounts.set(vp.label, count);
            });

            const filteredSingers = mappedSingers.filter(singer => {
              if (rsvpFilter !== 'All' && singer.rsvp !== rsvpFilter) return false;
              
              if (selectedVoiceParts.length > 0) {
                const matchesVoice = selectedVoiceParts.some(vp => 
                  singer.profile.voicePart === vp || (vp.length === 1 && singer.profile.voicePart?.startsWith(vp))
                );
                if (!matchesVoice) return false;
              }

              if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                return singer.profile.name.toLowerCase().includes(q);
              }
              return true;
            });

            const handleVoicePartToggle = (part: string) => {
              setSelectedVoiceParts(prev => 
                prev.includes(part)
                  ? prev.filter(p => p !== part)
                  : [...prev, part]
              );
            };

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
                {/* Voice Part RSVP Balance Summary Card */}
                {voiceParts.length > 0 && (
                  <AppCard 
                    title="Voice Part RSVP Balance"
                    actions={
                      <span className="badge badge-rehearsal" style={{ fontSize: 'var(--font-size-label)', padding: '6px 16px', borderRadius: '20px' }}>
                        {rsvpFilter === 'All' && `Total: ${mappedSingers.length} Active`}
                        {rsvpFilter === 'Yes' && `Total: ${yesCount} Attending`}
                        {rsvpFilter === 'No' && `Total: ${noCount} Declined`}
                        {rsvpFilter === 'Pending' && `Total: ${pendingCount} No Response`}
                      </span>
                    }
                    style={{ gap: 'var(--space-md)' }}
                  >
                    <style>{`
                      .voice-section-card {
                        transition: all 0.2s ease-in-out;
                        cursor: pointer;
                        border: 2px solid transparent;
                      }
                      .voice-section-card:hover {
                        transform: translateY(-2px);
                        box-shadow: var(--shadow-sm);
                        opacity: 0.9;
                      }
                      .voice-section-card.selected {
                        border-color: var(--primary) !important;
                        box-shadow: 0 0 0 1px var(--primary);
                      }
                      .voice-part-card {
                        transition: all 0.2s ease-in-out;
                        cursor: pointer;
                        border: 1px solid var(--border);
                      }
                      .voice-part-card:hover {
                        border-color: var(--primary-deep);
                        background-color: var(--primary-light) !important;
                        transform: translateY(-1px);
                      }
                      .voice-part-card.selected {
                        border-color: var(--primary) !important;
                        background-color: var(--primary-light) !important;
                      }
                    `}</style>

                    {/* RSVP Status Filters acting on Voice Part Counts */}
                    <div 
                      className="flex-row" 
                      style={{ 
                        gap: 'var(--space-sm)', 
                        flexWrap: 'wrap', 
                        paddingBottom: 'var(--space-sm)',
                        borderBottom: '1px solid var(--border)'
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setRsvpFilter('All')}
                        className={`btn btn-sm`}
                        style={{
                          height: '38px',
                          padding: '0 16px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: rsvpFilter === 'All' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                          color: rsvpFilter === 'All' ? '#1d4ed8' : 'var(--text-muted)',
                          border: `1px solid ${rsvpFilter === 'All' ? 'rgba(59, 130, 246, 0.3)' : 'var(--border)'}`,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        👥 All Active ({mappedSingers.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setRsvpFilter('Yes')}
                        className={`btn btn-sm`}
                        style={{
                          height: '38px',
                          padding: '0 16px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: rsvpFilter === 'Yes' ? 'rgba(74, 117, 89, 0.15)' : 'transparent',
                          color: rsvpFilter === 'Yes' ? 'var(--primary-deep)' : 'var(--text-muted)',
                          border: `1px solid ${rsvpFilter === 'Yes' ? 'rgba(74, 117, 89, 0.3)' : 'var(--border)'}`,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        🟢 Attending ({yesCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setRsvpFilter('No')}
                        className={`btn btn-sm`}
                        style={{
                          height: '38px',
                          padding: '0 16px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: rsvpFilter === 'No' ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                          color: rsvpFilter === 'No' ? '#b91c1c' : 'var(--text-muted)',
                          border: `1px solid ${rsvpFilter === 'No' ? 'rgba(239, 68, 68, 0.2)' : 'var(--border)'}`,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        🔴 Declined ({noCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setRsvpFilter('Pending')}
                        className={`btn btn-sm`}
                        style={{
                          height: '38px',
                          padding: '0 16px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: rsvpFilter === 'Pending' ? 'rgba(107, 114, 128, 0.08)' : 'transparent',
                          color: rsvpFilter === 'Pending' ? '#4b5563' : 'var(--text-muted)',
                          border: `1px solid ${rsvpFilter === 'Pending' ? 'rgba(107, 114, 128, 0.2)' : 'var(--border)'}`,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        ⏳ No Response ({pendingCount})
                      </button>
                    </div>

                    {/* Section Subtotals */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(4, 1fr)', 
                      gap: 'var(--space-md)',
                      paddingBottom: 'var(--space-md)',
                      borderBottom: '1px solid var(--border)'
                    }}>
                      {(['S', 'A', 'T', 'B'] as const).map(sec => {
                        const isSelected = selectedVoiceParts.includes(sec);
                        return (
                          <div 
                            key={sec} 
                            className={`flex-col voice-section-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleVoicePartToggle(sec)}
                            style={{ 
                              textAlign: 'center', 
                              padding: 'calc(var(--space-md) - 2px)', 
                              borderRadius: 'var(--radius-md)', 
                              backgroundColor: 'var(--primary-light)',
                              gap: 'var(--space-xs)',
                              borderWidth: '2px',
                              borderStyle: 'solid',
                              borderColor: isSelected ? 'var(--primary)' : 'transparent'
                            }}
                          >
                            <div className="text-xs" style={{ color: 'var(--primary-deep)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {sec === 'S' ? 'Sopranos' : sec === 'A' ? 'Altos' : sec === 'T' ? 'Tenors' : 'Basses'}
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-deep)', lineHeight: 1 }}>{sectionCounts[sec]}</div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Individual Part Breakdowns */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', 
                      gap: 'var(--space-sm)',
                      marginTop: 0
                    }}>
                      {voiceParts.map(vp => {
                        const isSelected = selectedVoiceParts.includes(vp.label);
                        const count = partCounts.get(vp.label) || 0;
                        return (
                          <div 
                            key={vp.label} 
                            className={`flex-col voice-part-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleVoicePartToggle(vp.label)}
                            style={{ 
                              textAlign: 'center', 
                              borderRadius: 'var(--radius-sm)', 
                              backgroundColor: 'var(--bg)',
                              gap: '2px',
                              borderStyle: 'solid',
                              borderWidth: isSelected ? '2px' : '1px',
                              padding: isSelected ? 'calc(var(--space-sm) - 1px)' : 'var(--space-sm)'
                            }}
                          >
                            <div className="text-xs text-muted" style={{ fontWeight: 700 }}>{vp.label}</div>
                            <div className="text-label" style={{ fontWeight: 700 }}>{count}</div>
                          </div>
                        );
                      })}
                    </div>
                  </AppCard>
                )}

                {/* Filters & Search Row (Positioned closer to the list of names) */}
                <div 
                  className="flex-responsive" 
                  style={{ 
                    gap: 'var(--space-md)', 
                    alignItems: 'center', 
                    flexWrap: 'wrap',
                    borderBottom: '1px solid var(--border)',
                    paddingBottom: 'var(--space-md)',
                    marginTop: 'var(--space-sm)'
                  }}
                >
                  {/* Name Search */}
                  <div style={{ position: 'relative', flex: '1', minWidth: '240px', maxWidth: '400px' }}>
                    <input
                      type="text"
                      placeholder="Search active singers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="card"
                      style={{
                        padding: '0 40px 0 36px',
                        height: '44px',
                        width: '100%',
                        fontSize: '15px'
                      }}
                    />
                    <span style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      pointerEvents: 'none'
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                    </span>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '4px',
                          borderRadius: '50%',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        title="Clear search"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Reset Filters */}
                  {(searchQuery || selectedVoiceParts.length > 0 || rsvpFilter !== 'All') && (
                    <button 
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedVoiceParts([]);
                        setRsvpFilter('All');
                      }}
                      className="btn btn-secondary"
                      style={{ 
                        height: '44px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 'var(--space-xs)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                        <path d="M3 3v5h5"></path>
                      </svg>
                      Reset Filters
                    </button>
                  )}
                </div>

                {/* Unified Event Roster Table */}
                <EventRosterTable 
                  singers={filteredSingers}
                  isUpdating={isUpdating}
                  onUpdateRSVP={handleUpdateRSVP}
                  onPhotoChange={() => {
                    if (rosterEvent) {
                      rosterService.getEventRoster(rosterEvent.id).then(setEventRoster);
                    }
                  }}
                />
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
