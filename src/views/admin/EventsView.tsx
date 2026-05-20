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
  const [textEvent, setTextEvent] = useState<Event | null>(null);
  const [communicationSettings, setCommunicationSettings] = useState<CommunicationSettings>(DEFAULT_COMMUNICATION_SETTINGS);
  const [auditionSettings, setAuditionSettings] = useState<AuditionSettings | null>(null);
  const [activeProfiles, setActiveProfiles] = useState<Profile[]>([]);
  const [voiceParts, setVoiceParts] = useState<VoicePartDef[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [voicePartFilter, setVoicePartFilter] = useState('');
  const [rsvpFilter, setRsvpFilter] = useState<'All' | 'Yes' | 'No' | 'Pending'>('All');
  const [isUpdating, setIsUpdating] = useState(false);
  const [sendingEmailEventId, setSendingEmailEventId] = useState<string | null>(null);

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
    if (sendingEmailEventId) return;
    setSendingEmailEventId(event.id);

    try {
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
    } finally {
      setSendingEmailEventId(null);
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
        sendingEmailEventId={sendingEmailEventId}
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
          actions={
            <button 
              className="btn btn-ghost btn-sm" 
              onClick={() => { 
                setRosterEvent(null); 
                setSearchQuery(''); 
                setVoicePartFilter(''); 
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

            const voicePartCounts = voiceParts.map(vp => {
              const partSingers = mappedSingers.filter(s => s.profile.voicePart === vp.label);
              const yes = partSingers.filter(s => s.rsvp === 'Yes').length;
              const no = partSingers.filter(s => s.rsvp === 'No').length;
              const pending = partSingers.filter(s => s.rsvp === 'Pending').length;
              return {
                ...vp,
                yes,
                no,
                pending,
              };
            });

            const filteredSingers = mappedSingers.filter(singer => {
              if (rsvpFilter !== 'All' && singer.rsvp !== rsvpFilter) return false;
              if (voicePartFilter && singer.profile.voicePart !== voicePartFilter) return false;
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
                {/* Filters Row */}
                <div 
                  className="flex-responsive" 
                  style={{ 
                    gap: 'var(--space-md)', 
                    alignItems: 'center', 
                    flexWrap: 'wrap',
                    borderBottom: '1px solid var(--border)',
                    paddingBottom: 'var(--space-md)'
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

                  {/* Voice Part Filter */}
                  <select 
                    value={voicePartFilter} 
                    onChange={(e) => setVoicePartFilter(e.target.value)}
                    className="card"
                    style={{ padding: '0 12px', height: '44px', width: '200px' }}
                  >
                    <option value="">All Voice Parts</option>
                    {voiceParts.map(vp => (
                      <option key={vp.label} value={vp.label}>{vp.label} - {vp.fullName}</option>
                    ))}
                  </select>

                  {/* RSVP Status Filter */}
                  <select 
                    value={rsvpFilter} 
                    onChange={(e) => setRsvpFilter(e.target.value as any)}
                    className="card"
                    style={{ padding: '0 12px', height: '44px', width: '200px' }}
                  >
                    <option value="All">All RSVPs</option>
                    <option value="Yes">🟢 Attending</option>
                    <option value="No">🔴 Declined</option>
                    <option value="Pending">⏳ No Response</option>
                  </select>

                  {/* Reset Filters */}
                  {(searchQuery || voicePartFilter || rsvpFilter !== 'All') && (
                    <button 
                      onClick={() => {
                        setSearchQuery('');
                        setVoicePartFilter('');
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

                {/* Voice Part RSVP Balance Grid */}
                {voiceParts.length > 0 && (
                  <div className="flex-col" style={{ gap: 'var(--space-xs)', width: '100%' }}>
                    <h3 className="text-label" style={{ fontWeight: 700, margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      Voice Part RSVP Balance
                    </h3>
                    <div 
                      style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', 
                        gap: 'var(--space-md)', 
                        width: '100%',
                        paddingBottom: 'var(--space-sm)'
                      }}
                    >
                      {voicePartCounts.map((vp) => {
                        const isWarning = vp.yes === 0;
                        return (
                          <div 
                            key={vp.label}
                            className="card"
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 'var(--space-xs)',
                              padding: 'var(--space-md)',
                              backgroundColor: isWarning ? 'rgba(245, 158, 11, 0.04)' : 'var(--bg)',
                              border: `1.5px solid ${isWarning ? 'rgba(245, 158, 11, 0.4)' : 'var(--border)'}`,
                              borderRadius: 'var(--radius-lg)',
                              transition: 'all 0.2s ease-in-out',
                              boxShadow: 'none',
                              position: 'relative',
                              overflow: 'hidden'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.borderColor = isWarning ? 'rgba(245, 158, 11, 0.6)' : 'var(--primary)';
                              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'none';
                              e.currentTarget.style.borderColor = isWarning ? 'rgba(245, 158, 11, 0.4)' : 'var(--border)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span 
                                className="text-label" 
                                style={{ 
                                  fontWeight: 800, 
                                  fontSize: '0.9rem',
                                  color: isWarning ? 'rgba(245, 158, 11, 1)' : 'var(--primary-deep)',
                                  backgroundColor: isWarning ? 'rgba(245, 158, 11, 0.1)' : 'var(--primary-light)',
                                  padding: '2px 8px',
                                  borderRadius: '4px'
                                }}
                              >
                                {vp.label}
                              </span>
                              {isWarning && (
                                <span 
                                  className="text-label"
                                  style={{ 
                                    fontSize: '0.7rem', 
                                    fontWeight: 700, 
                                    color: '#d97706',
                                    backgroundColor: '#fef3c7',
                                    padding: '1px 6px',
                                    borderRadius: '10px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '2px'
                                  }}
                                >
                                  ⚠️ Empty
                                </span>
                              )}
                            </div>
                            
                            <div 
                              className="text-muted" 
                              style={{ 
                                fontSize: '0.75rem', 
                                fontWeight: 500,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                              title={vp.fullName}
                            >
                              {vp.fullName}
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
                                <span style={{ color: 'var(--text-muted)' }}>🟢 Attending:</span>
                                <span style={{ color: vp.yes > 0 ? 'var(--primary-deep)' : 'var(--text-muted)' }}>{vp.yes}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
                                <span style={{ color: 'var(--text-muted)' }}>🔴 Declined:</span>
                                <span style={{ color: vp.no > 0 ? '#b91c1c' : 'var(--text-muted)' }}>{vp.no}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
                                <span style={{ color: 'var(--text-muted)' }}>⏳ Pending:</span>
                                <span style={{ color: 'var(--text-muted)' }}>{vp.pending}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quick Info / Count Banner */}
                <div 
                  className="flex-row" 
                  style={{ 
                    gap: 'var(--space-sm)', 
                    flexWrap: 'wrap', 
                    paddingBottom: 'var(--space-xs)' 
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
