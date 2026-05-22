import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AppCard } from '../../components/common/AppCard';
import { BaseModal } from '../../components/common/BaseModal';
import { useDialog } from '../../contexts/DialogContext';
import {
  communicationService,
  type CommunicationConfig,
  type CommunicationFilters,
  type CommunicationRecipient,
  type MessageRecord,
  type MessageType,
} from '../../services/communicationService';
import type { Event } from '../../services/eventService';
import {
  DEFAULT_COMMUNICATION_SETTINGS,
  settingsService,
  renderCommunicationTemplate,
  type CommunicationSettings,
} from '../../services/settingsService';
import { useVoiceParts } from '../../hooks/useVoiceParts';

type Tab = 'compose' | 'automated' | 'history' | 'settings';

const DEFAULT_FILTERS: CommunicationFilters = {
  eventId: '',
  rsvp: 'All',
  voiceParts: [],
  globalStatus: 'Active (Current)',
};

const DEFAULT_CONFIG = communicationService.defaultConfig;

interface AutomatedTask {
  id: string;
  type: 'Reminder' | 'Report';
  event: Event;
  scheduledTime: Date;
  status: 'Scheduled' | 'Sent';
  recipientCount?: number;
}

export default function CommunicationView() {
  const dialog = useDialog();
  const location = useLocation();
  const { labels: voicePartLabels, sections: configSections } = useVoiceParts();
  const routeState = location.state as {
    initialRecipients?: CommunicationRecipient[];
    initialSubject?: string;
    initialContent?: string;
    initialEventId?: string;
  } | null;

  const [tab, setTab] = useState<Tab>(routeState?.initialEventId ? 'compose' : 'compose');
  const [events, setEvents] = useState<Event[]>([]);
  const [filters, setFilters] = useState<CommunicationFilters>({
    ...DEFAULT_FILTERS,
    eventId: routeState?.initialEventId || '',
  });
  const [recipients, setRecipients] = useState<CommunicationRecipient[]>(
    routeState?.initialRecipients || []
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(routeState?.initialRecipients?.map((r) => r.id) || [])
  );
  const [subject, setSubject] = useState(routeState?.initialSubject || '');
  const [content, setContent] = useState(routeState?.initialContent || '');
  const [messageType, setMessageType] = useState<MessageType>('Email');
  const [history, setHistory] = useState<MessageRecord[]>([]);
  const [config, setConfig] = useState<CommunicationConfig>(DEFAULT_CONFIG);
  const [templates, setTemplates] = useState<CommunicationSettings>(DEFAULT_COMMUNICATION_SETTINGS);
  const [selectedMessage, setSelectedMessage] = useState<MessageRecord | null>(null);
  const [deliveryLinks, setDeliveryLinks] = useState<{ mailtoUrl: string; smsUrl: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResolving, setIsResolving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const skipNextRecipientResolveRef = useRef(Boolean(routeState?.initialRecipients));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);
  const [recipientPreviewList, setRecipientPreviewList] = useState<{ isOpen: boolean; recipients: CommunicationRecipient[]; title: string }>({
    isOpen: false,
    recipients: [],
    title: '',
  });

  const selectedRecipients = useMemo(
    () => recipients.filter((recipient) => selectedIds.has(recipient.id)),
    [recipients, selectedIds],
  );

  const { upcomingTasks, pastTasks } = useMemo(() => {
    const upcoming: AutomatedTask[] = [];
    const past: AutomatedTask[] = [];
    const now = new Date();

    events.forEach(event => {
      const eventDate = new Date(event.date);
      
      // Reminders
      if (templates.reminderEnabled) {
        const scheduledTime = new Date(eventDate.getTime() - templates.reminderHoursBefore * 60 * 60 * 1000);
        const alreadySent = history.some(m => {
          const mFilters = m.filters as Record<string, unknown>;
          return mFilters?.type === 'Automated Reminder' && mFilters?.eventId === event.id;
        });

        const task: AutomatedTask = {
          id: `reminder-${event.id}`,
          type: 'Reminder',
          event,
          scheduledTime,
          status: alreadySent ? 'Sent' : 'Scheduled'
        };

        if (alreadySent || scheduledTime < now) {
          past.push(task);
        } else {
          upcoming.push(task);
        }
      }

      // Reports
      if (templates.reportEnabled) {
        const scheduledTime = new Date(eventDate.getTime() + templates.reportHoursAfter * 60 * 60 * 1000);
        const alreadySent = history.some(m => {
          const mFilters = m.filters as Record<string, unknown>;
          return (mFilters?.type === 'Automated Report' || mFilters?.type === 'Attendance Report') && mFilters?.eventId === event.id;
        });
        
        const task: AutomatedTask = {
          id: `report-${event.id}`,
          type: 'Report',
          event,
          scheduledTime,
          status: alreadySent ? 'Sent' : 'Scheduled'
        };

        if (alreadySent || scheduledTime < now) {
          past.push(task);
        } else {
          upcoming.push(task);
        }
      }
    });

    return {
      upcomingTasks: upcoming.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime()),
      pastTasks: past.sort((a, b) => b.scheduledTime.getTime() - a.scheduledTime.getTime())
    };
  }, [events, templates, history]);

  useEffect(() => {
    const load = async () => {
      const [loadedEvents, loadedHistory, loadedConfig, loadedTemplates] = await Promise.all([
        communicationService.getEvents(),
        communicationService.getMessages(),
        communicationService.getConfig(),
        settingsService.getCommunicationSettings(),
      ]);
      setEvents(loadedEvents);
      setHistory(loadedHistory);
      setConfig(loadedConfig);
      setTemplates(loadedTemplates);
      setSubject((current) => {
        if (routeState?.initialSubject) return routeState.initialSubject;
        return current || loadedTemplates.emailSubject;
      });
      setContent((current) => {
        if (routeState?.initialContent) return routeState.initialContent;
        return current || loadedTemplates.emailBody;
      });
      setIsLoading(false);
    };

    load().catch(() => {
      setIsLoading(false);
      void dialog.showMessage({
        title: 'Could Not Load Communications',
        message: 'Communication data could not be loaded.',
        variant: 'danger',
      });
    });
  }, [dialog, routeState?.initialSubject, routeState?.initialContent]);

  useEffect(() => {
    if (skipNextRecipientResolveRef.current) {
      skipNextRecipientResolveRef.current = false;
      return;
    }
    let isCurrent = true;
    setIsResolving(true);
    communicationService.resolveRecipients(filters)
      .then((resolved) => {
        if (!isCurrent) return;
        setRecipients(resolved);
        setSelectedIds(new Set(resolved.map((recipient: CommunicationRecipient) => recipient.id)));
      })
      .catch(() => {
        if (!isCurrent) return;
        setRecipients([]);
        setSelectedIds(new Set());
      })
      .finally(() => {
        if (isCurrent) setIsResolving(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [filters]);

  const updateFilter = <K extends keyof CommunicationFilters>(key: K, value: CommunicationFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const toggleRecipient = (recipientId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(recipientId)) {
        next.delete(recipientId);
      } else {
        next.add(recipientId);
      }
      return next;
    });
  };

  const handleVoicePartToggle = (token: string) => {
    const active = filters.voiceParts || [];
    const next = active.includes(token)
      ? active.filter((p) => p !== token)
      : [...active, token];
    updateFilter('voiceParts', next);
  };

  const sendMessage = async () => {
    if (selectedRecipients.length === 0) {
      await dialog.showMessage({
        title: 'No Recipients',
        message: 'Select at least one recipient before sending.',
      });
      return;
    }

    if (!content.trim()) {
      await dialog.showMessage({
        title: 'No Message',
        message: 'Enter message content before sending.',
      });
      return;
    }

    setIsSending(true);
    try {
      const result = await communicationService.sendBulkMessage({
        subject,
        content,
        type: messageType,
        recipients: selectedRecipients,
        filters: filters as unknown as Record<string, unknown>,
      });
      setDeliveryLinks({ mailtoUrl: result.mailtoUrl, smsUrl: result.smsUrl });
      setHistory(await communicationService.getMessages());

      if (messageType === 'SMS' && result.smsUrl) {
        window.location.assign(result.smsUrl);
      }

      await dialog.showMessage({
        title: 'Message Dispatched',
        message: messageType === 'SMS'
          ? 'The message has been logged and the SMS draft opened locally.'
          : 'The message has been queued and is being sent to all recipients via the communications backend service.',
        variant: 'info',
      });

      // Clear/Reset Compose fields
      setSubject(templates.emailSubject);
      setContent(templates.emailBody);
      setDeliveryLinks(null);
    } catch {
      await dialog.showMessage({
        title: 'Could Not Send Message',
        message: 'The message could not be logged or prepared for delivery.',
        variant: 'danger',
      });
    } finally {
      setIsSending(false);
    }
  };

  const copyToDraft = (message: MessageRecord) => {
    setSubject(message.subject || '');
    setContent(message.content);
    setMessageType(message.type);
    const mFilters = message.filters as Record<string, unknown>;
    if (mFilters?.eventId) {
      // Handle legacy single voicePart string vs new voiceParts array
      let vpArray: string[] = [];
      if (Array.isArray(mFilters.voiceParts)) {
        vpArray = mFilters.voiceParts as string[];
      } else if (typeof mFilters.voicePart === 'string' && mFilters.voicePart) {
        vpArray = [mFilters.voicePart];
      }

      setFilters({
        eventId: (mFilters.eventId as string) || '',
        rsvp: (mFilters.rsvp as CommunicationFilters['rsvp']) || 'All',
        voiceParts: vpArray,
        globalStatus: (mFilters.globalStatus as string) || 'Active (Current)',
      });
    } else {
      setFilters(DEFAULT_FILTERS);
    }
    setTab('compose');
    setSelectedMessage(null);
  };

  const saveConfig = async () => {
    setIsSavingConfig(true);
    try {
      await Promise.all([
        communicationService.saveConfig(config),
        settingsService.saveCommunicationSettings(templates),
      ]);
      await dialog.showMessage({
        title: 'Settings Saved',
        message: 'Communication delivery settings were saved.',
      });
    } catch {
      await dialog.showMessage({
        title: 'Could Not Save Settings',
        message: 'Communication delivery settings could not be saved.',
        variant: 'danger',
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  if (isLoading) return <div style={{ padding: 'var(--space-xl)' }}>Loading communications...</div>;

  return (
    <div className="flex-col" style={{ gap: 'var(--space-xl)', padding: 'var(--space-xl) 0' }}>
      <div className="flex-responsive" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="text-display" style={{ margin: 0 }}>Communications</h1>
        <div className="flex-row" style={{ gap: 'var(--space-sm)' }}>
          {(['compose', 'automated', 'history', 'settings'] as Tab[]).map((item) => (
            <button
              key={item}
              type="button"
              className={`btn ${tab === item ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setTab(item)}
            >
              {item[0].toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {tab === 'automated' && (
        <div className="flex-col" style={{ gap: 'var(--space-xl)' }}>
          <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
            <h3 className="text-headline" style={{ fontSize: '1.1rem', color: 'var(--primary-deep)' }}>Upcoming Automated Tasks</h3>
            <p className="text-muted text-sm" style={{ marginTop: '-8px' }}>
              These messages are scheduled to be sent automatically. You can trigger them early below.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-md)' }}>
              {upcomingTasks.length === 0 && (
                <div className="card" style={{ padding: 'var(--space-xl)', textAlign: 'center', gridColumn: '1 / -1', border: '1px dashed var(--border)' }}>
                  <p className="text-muted">No upcoming automated tasks found.</p>
                </div>
              )}
              
              {upcomingTasks.map(task => {
                const isReport = task.type === 'Report';
                return (
                  <div key={task.id} className="card" style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                    <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span className={`badge ${isReport ? 'badge-concert' : 'badge-rehearsal'}`}>
                        {task.type}
                      </span>
                      <span className="text-muted text-xs">
                        {isReport ? 'Scheduled for:' : 'Next run:'} {task.scheduledTime.toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="flex-col" style={{ gap: '2px' }}>
                      <strong style={{ fontSize: '1rem' }}>{task.event.title || task.event.type}</strong>
                      <span className="text-muted text-xs">{new Date(task.event.date).toLocaleString()}</span>
                    </div>
                    
                    <div className="flex-row" style={{ justifyContent: 'space-between', marginTop: 'auto', paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--border)' }}>
                      {!isReport && (
                        <button 
                          className="btn btn-ghost btn-sm"
                          onClick={async () => {
                            const r = await communicationService.resolveRecipients({ 
                              eventId: task.event.id, 
                              rsvp: 'All', 
                              voiceParts: [], 
                              globalStatus: 'Active (Current)' 
                            });

                            setRecipientPreviewList({ 
                              isOpen: true, 
                              recipients: r, 
                              title: `Expected Recipients for ${task.event.title || task.event.type}` 
                            });
                          }}
                        >
                          View Recipients
                        </button>
                      )}
                      {isReport && (
                        <div className="text-muted text-xs" style={{ display: 'flex', alignItems: 'center' }}>
                          Target: All Admins
                        </div>
                      )}
                      
                      <button 
                        className="btn btn-primary btn-sm"
                        disabled={isSending}
                        onClick={async () => {
                          if (isReport) {
                            const confirmed = await dialog.confirm({
                              title: 'Send Report Now?',
                              message: `Generate and send the attendance report for "${task.event.title || task.event.type}" to all admins immediately?`,
                              confirmLabel: 'Send Now',
                            });
                            if (confirmed) {
                              setIsSending(true);
                              try {
                                await communicationService.triggerAttendanceReport(task.event.id);
                                await dialog.showMessage({ title: 'Report Sent', message: 'The report has been generated and emailed to admins.', variant: 'info' });
                                setHistory(await communicationService.getMessages());
                              } catch (err: unknown) {
                                const msg = err instanceof Error ? err.message : String(err);
                                await dialog.showMessage({ title: 'Error', message: msg || 'Failed to send report.', variant: 'danger' });
                              } finally {
                                setIsSending(false);
                              }
                            }
                          } else {
                            // Open Compose pre-filled
                            const values = {
                              eventTitle: task.event.title || task.event.type,
                              eventType: task.event.type,
                              eventDate: new Date(task.event.date).toLocaleString(),
                              eventLocation: task.event.expand?.venue?.name || 'TBD',
                              eventDetails: task.event.details || '',
                              singerName: '{singerName}',
                              rsvpLinks: '{{RSVP_LINKS}}',
                            };
                            
                            setFilters({ ...DEFAULT_FILTERS, eventId: task.event.id });
                            setSubject(renderCommunicationTemplate(templates.reminderSubjectTemplate, values));
                            setContent(renderCommunicationTemplate(templates.reminderBodyTemplate, values));
                            setMessageType('Email');
                            setTab('compose');
                          }
                        }}
                      >
                        {isReport ? 'Send Now' : 'Open Compose'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
            <h3 className="text-headline" style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>Sent / Past Automated Tasks</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-md)' }}>
              {pastTasks.length === 0 && (
                <p className="text-muted text-sm" style={{ gridColumn: '1 / -1' }}>No past automated tasks found in the logs.</p>
              )}
              
              {pastTasks.map(task => {
                const isSent = task.status === 'Sent';
                return (
                  <div key={task.id} className="card" style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', opacity: 0.8 }}>
                    <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span className={`badge ${isSent ? 'badge-concert' : 'badge-rehearsal'}`} style={{ backgroundColor: isSent ? undefined : 'var(--border)' }}>
                        {task.type} {isSent ? '(Sent)' : '(Passed)'}
                      </span>
                      <span className="text-muted text-xs">
                        {isSent ? 'Processed at:' : 'Scheduled for:'} {task.scheduledTime.toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="flex-col" style={{ gap: '2px' }}>
                      <strong style={{ fontSize: '1rem' }}>{task.event.title || task.event.type}</strong>
                      <span className="text-muted text-xs">{new Date(task.event.date).toLocaleString()}</span>
                    </div>

                    <div className="flex-row" style={{ justifyContent: 'flex-end', marginTop: 'auto', paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--border)' }}>
                      {isSent ? (
                        <span className="text-xs" style={{ color: 'var(--primary-deep)', fontWeight: 600 }}>✓ Logged in History</span>
                      ) : (
                        <span className="text-xs text-muted">No log entry found</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'compose' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) 1fr', gap: 'var(--space-lg)', alignItems: 'start' }}>
          <AppCard title="Recipients">
            <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
              <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                <label className="text-label">Event</label>
                <select className="card" value={filters.eventId} onChange={(event) => updateFilter('eventId', event.target.value)} style={{ height: '44px', padding: '0 12px' }}>
                  <option value="">All Events</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>{event.title || event.expand?.venue?.name || ''}</option>
                  ))}
                </select>
              </div>

              <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                <label className="text-label">RSVP</label>
                <select className="card" value={filters.rsvp} onChange={(event) => updateFilter('rsvp', event.target.value as CommunicationFilters['rsvp'])} disabled={!filters.eventId} style={{ height: '44px', padding: '0 12px' }}>
                  {['All', 'Yes', 'No', 'Pending'].map((rsvp) => <option key={rsvp} value={rsvp}>{rsvp}</option>)}
                </select>
              </div>

              <div className="flex-col" style={{ gap: 'var(--space-xs)', position: 'relative' }} ref={dropdownRef}>
                <label className="text-label">Voice Part / Section</label>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="card flex-row"
                  style={{
                    height: '44px',
                    padding: '0 12px',
                    width: '100%',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    textAlign: 'left',
                    backgroundColor: 'var(--bg)'
                  }}
                >
                  <span style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: '0.9rem',
                    fontWeight: (filters.voiceParts || []).length > 0 ? 600 : 400
                  }}>
                    {(() => {
                      const active = filters.voiceParts || [];
                      if (active.length === 0) return 'All Voice Parts';
                      if (active.length === 1) {
                        const token = active[0];
                        const sec = configSections.find(s => s.code === token);
                        return sec ? sec.name : token;
                      }
                      return `${active.length} selected`;
                    })()}
                  </span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    style={{
                      transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                      color: 'var(--text-muted)'
                    }}
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>

                {isDropdownOpen && (
                  <div
                    className="card"
                    style={{
                      position: 'absolute',
                      top: '68px',
                      left: 0,
                      right: 0,
                      zIndex: 100,
                      maxHeight: '300px',
                      overflowY: 'auto',
                      padding: 'var(--space-xs) 0',
                      boxShadow: 'var(--shadow-lg)',
                      backgroundColor: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}
                  >
                    <div style={{
                      padding: '6px 12px 2px 12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Sections
                    </div>
                    {configSections.map(sec => {
                      const isChecked = (filters.voiceParts || []).includes(sec.code);
                      return (
                        <label
                          key={sec.code}
                          className="flex-row"
                          style={{
                            padding: '8px 12px',
                            alignItems: 'center',
                            gap: 'var(--space-sm)',
                            cursor: 'pointer',
                            fontSize: '13px',
                            userSelect: 'none',
                            transition: 'background-color 0.15s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-light)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleVoicePartToggle(sec.code)}
                            style={{ cursor: 'pointer', accentColor: 'var(--primary)', width: '15px', height: '15px' }}
                          />
                          <span style={{ fontWeight: isChecked ? 600 : 400 }}>{sec.name}</span>
                        </label>
                      );
                    })}

                    <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '4px 0' }}></div>

                    <div style={{
                      padding: '6px 12px 2px 12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Individual Parts
                    </div>
                    {voicePartLabels.map(part => {
                      const isChecked = (filters.voiceParts || []).includes(part);
                      return (
                        <label
                          key={part}
                          className="flex-row"
                          style={{
                            padding: '8px 12px',
                            alignItems: 'center',
                            gap: 'var(--space-sm)',
                            cursor: 'pointer',
                            fontSize: '13px',
                            userSelect: 'none',
                            transition: 'background-color 0.15s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-light)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleVoicePartToggle(part)}
                            style={{ cursor: 'pointer', accentColor: 'var(--primary)', width: '15px', height: '15px' }}
                          />
                          <span style={{ fontWeight: isChecked ? 600 : 400 }}>{part}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                <label className="text-label">Global Status</label>
                <select className="card" value={filters.globalStatus} onChange={(event) => updateFilter('globalStatus', event.target.value)} style={{ height: '44px', padding: '0 12px' }}>
                  <option value="">All Statuses</option>
                  {communicationService.statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>

              <div className="flex-row" style={{ justifyContent: 'space-between' }}>
                <span className="text-label">{selectedRecipients.length} selected</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedIds(new Set(recipients.map((recipient) => recipient.id)))}>
                  Select All
                </button>
              </div>

              <div className="flex-col" style={{ gap: 'var(--space-sm)', maxHeight: '380px', overflowY: 'auto' }}>
                {isResolving ? (
                  <p className="text-muted">Loading recipients...</p>
                ) : recipients.map((recipient) => (
                  <label key={recipient.id} className="flex-row card" style={{ padding: 'var(--space-sm)', boxShadow: 'none', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(recipient.id)}
                      onChange={() => toggleRecipient(recipient.id)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                    />
                    <span className="flex-col" style={{ gap: 0 }}>
                      <strong>{recipient.name}</strong>
                      <span className="text-muted text-xs">{recipient.voicePart} · {recipient.email || recipient.phone || 'No contact'}</span>
                    </span>
                  </label>
                ))}
                {!isResolving && recipients.length === 0 && <p className="text-muted">No matching recipients.</p>}
              </div>
            </div>
          </AppCard>

          <div className="flex-col" style={{ gap: 'var(--space-lg)' }}>
            <AppCard title="Compose">
              <div className="flex-responsive" style={{ gap: 'var(--space-md)' }}>
                {(['Email', 'SMS', 'Both'] as MessageType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`btn ${messageType === type ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setMessageType(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {(messageType === 'Email' || messageType === 'Both') && (
                <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                  <label className="text-label">Subject</label>
                  <input className="card" value={subject} onChange={(event) => setSubject(event.target.value)} style={{ height: '44px', padding: '0 12px' }} />
                </div>
              )}

              <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                <label className="text-label">Message</label>
                <textarea className="card" value={content} onChange={(event) => setContent(event.target.value)} style={{ minHeight: '220px', padding: '12px', resize: 'vertical' }} />
                <p className="text-muted text-xs" style={{ margin: 0 }}>
                  Hint: Use <code>{'{{RSVP_LINKS}}'}</code> to insert personalized RSVP buttons (requires Event to be selected). Personalized links will be printed to the developer console when sending via Mailto.
                </p>
              </div>

              <div className="flex-row" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-primary" onClick={sendMessage} disabled={isSending}>
                  {isSending ? 'Preparing...' : 'Send Message'}
                </button>
              </div>
            </AppCard>

            <AppCard title="Preview">
              <div className="card" style={{ boxShadow: 'none', backgroundColor: 'var(--bg)' }}>
                {(messageType === 'Email' || messageType === 'Both') && (
                  <h3 style={{ marginTop: 0 }}>{subject || 'No subject'}</h3>
                )}
                <p className="text-body" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{content || 'No message content.'}</p>
              </div>

              {deliveryLinks && (
                <div className="flex-responsive" style={{ gap: 'var(--space-md)' }}>
                  {deliveryLinks.mailtoUrl && <a className="btn btn-secondary" href={deliveryLinks.mailtoUrl}>Open Email Draft</a>}
                  {deliveryLinks.smsUrl && <a className="btn btn-secondary" href={deliveryLinks.smsUrl}>Open Text Draft</a>}
                </div>
              )}
            </AppCard>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <AppCard noPadding>
          {history.map((message) => {
            const mFilters = message.filters as Record<string, unknown>;
            const mType = mFilters?.type as string | undefined;
            const isAutomated = mType?.startsWith('Automated') || mType === 'Attendance Report';
            return (
              <div key={message.id} className="flex-responsive" style={{ padding: 'var(--space-lg)', borderBottom: '1px solid var(--border)', justifyContent: 'space-between' }}>
                <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                  <div className="flex-row" style={{ gap: 'var(--space-sm)' }}>
                    <span className="badge badge-rehearsal">{message.type}</span>
                    {isAutomated && <span className="badge badge-concert" style={{ opacity: 0.8 }}>{mType}</span>}
                    <span className="text-muted text-xs">{new Date(message.created).toLocaleString()}</span>
                  </div>
                  <h3 style={{ margin: 0 }}>{message.subject || 'SMS message'}</h3>
                  <p className="text-muted" style={{ margin: 0 }}>{message.recipients.length} recipients</p>
                </div>
                <div className="flex-row">
                  <button className="btn btn-ghost btn-sm" onClick={() => setSelectedMessage(message)}>Details</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => copyToDraft(message)}>Copy to Draft</button>
                </div>
              </div>
            );
          })}
          {history.length === 0 && (
            <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
              <p className="text-muted">No messages logged yet.</p>
            </div>
          )}
        </AppCard>
      )}

      {/* Settings tab unchanged ... */}

      <BaseModal
        isOpen={recipientPreviewList.isOpen}
        onClose={() => setRecipientPreviewList({ ...recipientPreviewList, isOpen: false })}
        title={recipientPreviewList.title}
        maxWidth="500px"
      >
        <div className="flex-col" style={{ gap: 'var(--space-sm)', maxHeight: '400px', overflowY: 'auto' }}>
          {recipientPreviewList.recipients.map(r => (
            <div key={r.id} className="flex-row card" style={{ padding: 'var(--space-sm)', justifyContent: 'space-between', boxShadow: 'none' }}>
              <strong>{r.name}</strong>
              <span className="text-muted text-xs">{r.voicePart}</span>
            </div>
          ))}
          {recipientPreviewList.recipients.length === 0 && <p className="text-muted">No recipients found.</p>}
        </div>
      </BaseModal>

      {tab === 'settings' && (
        <div className="flex-col" style={{ gap: 'var(--space-lg)' }}>
          <AppCard title="Delivery Mechanisms">
            <div className="text-muted text-sm">
              Note: Automated SMS and email delivery are handled securely on the server side via PocketBase integrations. Email delivery is dispatched entirely on the backend, ensuring a secure, professional, and consistent experience without spawning local email clients. Twilio SMS credentials can be configured directly below.
            </div>
          </AppCard>

          <AppCard title="Templates (Manual)">
            <SettingsGrid>
              <Field label="Email Subject" value={templates.emailSubject} onChange={(value) => setTemplates({ ...templates, emailSubject: value })} />
              <Field label="SMS Body" value={templates.smsBody} onChange={(value) => setTemplates({ ...templates, smsBody: value })} />
            </SettingsGrid>
            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <label className="text-label">Email Body</label>
              <textarea
                className="card"
                value={templates.emailBody}
                onChange={(event) => setTemplates({ ...templates, emailBody: event.target.value })}
                style={{ minHeight: '140px', padding: '12px', resize: 'vertical' }}
              />
            </div>
          </AppCard>

          <AppCard title="Compliance & Footers">
            <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
              <p className="text-muted text-sm">
                For legal compliance (e.g. CAN-SPAM), all outgoing emails will automatically include a physical mailing address and an unsubscribe link in the footer.
              </p>
              <Field 
                label="Physical Mailing Address" 
                value={templates.mailingAddress} 
                onChange={(value) => setTemplates({ ...templates, mailingAddress: value })} 
              />
              <Field 
                label="Application Base URL" 
                value={templates.frontendUrl} 
                onChange={(value) => setTemplates({ ...templates, frontendUrl: value })} 
              />
            </div>
          </AppCard>

          <AppCard title="Singer Event Reminders (Automated)">
            <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
              <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg)', padding: 'var(--space-md)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div className="flex-col" style={{ gap: 'var(--space-xxs)' }}>
                  <span style={{ fontWeight: 600 }}>Enable Automated Reminders</span>
                  <span className="text-muted text-sm">Send automatic reminder emails to active singers before event starts.</span>
                </div>
                <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px' }}>
                  <input
                    type="checkbox"
                    checked={templates.reminderEnabled}
                    onChange={(e) => setTemplates({ ...templates, reminderEnabled: e.target.checked })}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span className="slider" style={{
                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: templates.reminderEnabled ? 'var(--primary)' : '#ccc',
                    transition: '.4s', borderRadius: '34px',
                    boxShadow: templates.reminderEnabled ? '0 0 8px var(--primary)' : 'none'
                  }}>
                    <span style={{
                      position: 'absolute', height: '18px', width: '18px', left: '4px', bottom: '4px',
                      backgroundColor: 'white', transition: '.4s', borderRadius: '50%',
                      transform: templates.reminderEnabled ? 'translateX(24px)' : 'none'
                    }} />
                  </span>
                </label>
              </div>

              {templates.reminderEnabled && (
                <>
                  <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                    <label className="text-label">Send Timing (Hours Before Event)</label>
                    <input
                      type="number"
                      className="card"
                      value={templates.reminderHoursBefore}
                      onChange={(e) => setTemplates({ ...templates, reminderHoursBefore: Number(e.target.value) })}
                      style={{ height: '44px', padding: '0 12px', width: '120px' }}
                      min="1"
                    />
                  </div>

                  <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                    <label className="text-label">Reminder Email Subject</label>
                    <input
                      type="text"
                      className="card"
                      value={templates.reminderSubjectTemplate}
                      onChange={(e) => setTemplates({ ...templates, reminderSubjectTemplate: e.target.value })}
                      style={{ height: '44px', padding: '0 12px' }}
                    />
                  </div>

                  <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                    <label className="text-label">Reminder Email Body Template</label>
                    <textarea
                      className="card"
                      value={templates.reminderBodyTemplate}
                      onChange={(e) => setTemplates({ ...templates, reminderBodyTemplate: e.target.value })}
                      style={{ minHeight: '160px', padding: '12px', resize: 'vertical' }}
                    />
                    <div className="text-muted text-xs" style={{ marginTop: 'var(--space-xxs)' }}>
                      Available placeholders: <code>{'{singerName}'}</code>, <code>{'{eventTitle}'}</code>, <code>{'{eventType}'}</code>, <code>{'{eventDate}'}</code>, <code>{'{eventLocation}'}</code>, <code>{'{eventDetails}'}</code>, <code>{'{rsvpLinks}'}</code>
                    </div>
                  </div>
                </>
              )}
            </div>
          </AppCard>

          <AppCard title="Admin Attendance Reports (Automated)">
            <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
              <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg)', padding: 'var(--space-md)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div className="flex-col" style={{ gap: 'var(--space-xxs)' }}>
                  <span style={{ fontWeight: 600 }}>Enable Automated Post-Event Reports</span>
                  <span className="text-muted text-sm">Send event attendance summary reports to admins after event concludes.</span>
                </div>
                <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px' }}>
                  <input
                    type="checkbox"
                    checked={templates.reportEnabled}
                    onChange={(e) => setTemplates({ ...templates, reportEnabled: e.target.checked })}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span className="slider" style={{
                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: templates.reportEnabled ? 'var(--primary)' : '#ccc',
                    transition: '.4s', borderRadius: '34px',
                    boxShadow: templates.reportEnabled ? '0 0 8px var(--primary)' : 'none'
                  }}>
                    <span style={{
                      position: 'absolute', height: '18px', width: '18px', left: '4px', bottom: '4px',
                      backgroundColor: 'white', transition: '.4s', borderRadius: '50%',
                      transform: templates.reportEnabled ? 'translateX(24px)' : 'none'
                    }} />
                  </span>
                </label>
              </div>

              {templates.reportEnabled && (
                <>
                  <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                    <label className="text-label">Send Timing (Hours After Event)</label>
                    <input
                      type="number"
                      className="card"
                      value={templates.reportHoursAfter}
                      onChange={(e) => setTemplates({ ...templates, reportHoursAfter: Number(e.target.value) })}
                      style={{ height: '44px', padding: '0 12px', width: '120px' }}
                      min="1"
                    />
                  </div>

                  <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                    <label className="text-label">Report Email Subject</label>
                    <input
                      type="text"
                      className="card"
                      value={templates.reportSubjectTemplate}
                      onChange={(e) => setTemplates({ ...templates, reportSubjectTemplate: e.target.value })}
                      style={{ height: '44px', padding: '0 12px' }}
                    />
                  </div>

                  <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                    <label className="text-label">Report Email Body Template</label>
                    <textarea
                      className="card"
                      value={templates.reportBodyTemplate}
                      onChange={(e) => setTemplates({ ...templates, reportBodyTemplate: e.target.value })}
                      style={{ minHeight: '160px', padding: '12px', resize: 'vertical' }}
                    />
                    <div className="text-muted text-xs" style={{ marginTop: 'var(--space-xxs)' }}>
                      Available placeholders: <code>{'{eventTitle}'}</code>, <code>{'{eventDate}'}</code>, <code>{'{attendanceRate}'}</code>, <code>{'{presentCount}'}</code>, <code>{'{totalCount}'}</code>, <code>{'{absenteesList}'}</code>, <code>{'{thresholdWarningsSection}'}</code>
                    </div>
                  </div>
                </>
              )}
            </div>
          </AppCard>

          <div className="flex-row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={saveConfig} disabled={isSavingConfig}>
              {isSavingConfig ? 'Saving...' : 'Save Communication Settings'}
            </button>
          </div>
        </div>
      )}

      <BaseModal
        isOpen={Boolean(selectedMessage)}
        onClose={() => setSelectedMessage(null)}
        title={selectedMessage?.subject || 'Message Details'}
        maxWidth="640px"
        footer={selectedMessage && (
          <>
            <button className="btn btn-ghost" onClick={() => setSelectedMessage(null)}>Close</button>
            <button className="btn btn-primary" onClick={() => copyToDraft(selectedMessage)}>Copy to Draft</button>
          </>
        )}
      >
        {selectedMessage && (
          <div className="flex-col">
            <p className="text-body" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{selectedMessage.content}</p>
            <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
              <span className="text-label">Recipients</span>
              <div className="card" style={{ boxShadow: 'none', maxHeight: '220px', overflowY: 'auto' }}>
                {selectedMessage.recipients.map((recipient) => (
                  <div key={recipient.id} className="flex-responsive" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--border)', padding: 'var(--space-xs) 0' }}>
                    <strong>{recipient.name}</strong>
                    <span className="text-muted text-xs">{recipient.email || recipient.phone}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </BaseModal>
    </div>
  );
}

function SettingsGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-md)' }}>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
      <label className="text-label">{label}</label>
      <input className="card" type={type} value={value} onChange={(event) => onChange(event.target.value)} style={{ height: '44px', padding: '0 12px' }} />
    </div>
  );
}
