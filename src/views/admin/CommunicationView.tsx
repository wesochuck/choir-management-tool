import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AppCard } from '../../components/common/AppCard';
import { BaseModal } from '../../components/common/BaseModal';
import { useDialog } from '../../contexts/DialogContext';
import { useEvents } from '../../hooks/useEvents';
import { useVoiceParts } from '../../hooks/useVoiceParts';
import {
  communicationService,
  type CommunicationFilters,
  type CommunicationRecipient,
  type MessageRecord,
  type MessageType,
  type TemplateRecord,
} from '../../services/communicationService';
import type { Event } from '../../services/eventService';
import {
  DEFAULT_COMMUNICATION_SETTINGS,
  settingsService,
  renderCommunicationTemplate,
  type CommunicationSettings,
} from '../../services/settingsService';
import { getRenderedPreview, resolvePreviewContent } from '../../lib/communicationUtils';
import { PlaceholderPanel } from '../../components/admin/PlaceholderPanel';

type Tab = 'compose' | 'automated' | 'drafts' | 'history' | 'settings';
type WizardStep = 'TARGETS' | 'COMPOSE' | 'REVIEW';

const DEFAULT_FILTERS: CommunicationFilters = {
  eventId: '',
  rsvp: 'All',
  voiceParts: [],
  globalStatus: 'Active (Current)',
};

interface AutomatedTask {
  id: string;
  type: 'Reminder' | 'Report' | 'RSVP Request';
  event: Event;
  scheduledTime: Date;
  status: 'Scheduled' | 'Sent';
  recipientCount?: number;
}

export default function CommunicationView() {
  const dialog = useDialog();
  const location = useLocation();
  const { labels: voicePartLabels, sections: configSections } = useVoiceParts();
  const { events } = useEvents();

  const routeState = location.state as {
    initialRecipients?: CommunicationRecipient[];
    initialSubject?: string;
    initialContent?: string;
    initialEventId?: string;
  } | null;

  // Global UI state
  const [tab, setTab] = useState<Tab>(routeState?.initialEventId ? 'compose' : 'compose');
  const [wizardStep, setWizardStep] = useState<WizardStep>('TARGETS');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Core drafting state
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [filters, setFilters] = useState<CommunicationFilters>({
    ...DEFAULT_FILTERS,
    eventId: routeState?.initialEventId || '',
  });
  const [recipients, setRecipients] = useState<CommunicationRecipient[]>(routeState?.initialRecipients || []);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(routeState?.initialRecipients?.map(r => r.id) || []));
  const [subject, setSubject] = useState(routeState?.initialSubject || '');
  const [content, setContent] = useState(routeState?.initialContent || '');
  const [messageType, setMessageType] = useState<MessageType>('Email');

  // Library state
  const [history, setHistory] = useState<MessageRecord[]>([]);
  const [drafts, setDrafts] = useState<MessageRecord[]>([]);
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [commSettings, setCommSettings] = useState<CommunicationSettings>(DEFAULT_COMMUNICATION_SETTINGS);

  // Secondary UI state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedMessage, setSelectedMessage] = useState<MessageRecord | null>(null);
  const [recipientPreviewList, setRecipientPreviewList] = useState<{ isOpen: boolean; recipients: CommunicationRecipient[]; title: string }>({
    isOpen: false,
    recipients: [],
    title: '',
  });

  const selectedRecipients = useMemo(
    () => recipients.filter((recipient) => selectedIds.has(recipient.id)),
    [recipients, selectedIds],
  );

  const previewHtml = useMemo(() => {
    if (!content) return '';
    const sampleRecipient = selectedRecipients[0] || null;
    const selectedEvent = events.find(e => e.id === filters.eventId) || null;
    
    return getRenderedPreview(
      content,
      messageType,
      selectedEvent,
      sampleRecipient,
      commSettings.mailingAddress
    );
  }, [content, events, filters.eventId, selectedRecipients, messageType, commSettings.mailingAddress]);

  const { upcomingTasks, pastTasks } = useMemo(() => {
    const upcoming: AutomatedTask[] = [];
    const past: AutomatedTask[] = [];
    const now = new Date();

    events.forEach(event => {
      const eventDate = new Date(event.date);
      
      // RSVP Requests (Initial Invitation)
      if (event.isOpenForRSVP && eventDate > now) {
        const alreadySent = history.some(m => {
          const mFilters = m.filters as Record<string, unknown>;
          return (mFilters?.type === 'RSVP Invitation' || mFilters?.rsvp === 'Pending') && mFilters?.eventId === event.id;
        });

        if (!alreadySent) {
          upcoming.push({
            id: `rsvp-${event.id}`,
            type: 'RSVP Request',
            event,
            scheduledTime: new Date(event.created),
            status: 'Scheduled'
          });
        }
      }

      // Reminders
      if (commSettings.reminderEnabled) {
        const scheduledTime = new Date(eventDate.getTime() - commSettings.reminderHoursBefore * 60 * 60 * 1000);
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

        if (alreadySent || scheduledTime < now) past.push(task);
        else upcoming.push(task);
      }

      // Reports
      if (commSettings.reportEnabled) {
        const scheduledTime = new Date(eventDate.getTime() + commSettings.reportHoursAfter * 60 * 60 * 1000);
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

        if (alreadySent || scheduledTime < now) past.push(task);
        else upcoming.push(task);
      }
    });

    return {
      upcomingTasks: upcoming.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime()),
      pastTasks: past.sort((a, b) => b.scheduledTime.getTime() - a.scheduledTime.getTime())
    };
  }, [events, commSettings, history]);

  useEffect(() => {
    const load = async () => {
      try {
        const [loadedHistory, loadedDrafts, loadedTemplates, loadedSettings] = await Promise.all([
          communicationService.getMessages(),
          communicationService.getDrafts(),
          communicationService.getTemplates(),
          settingsService.getCommunicationSettings(),
        ]);
        setHistory(loadedHistory);
        setDrafts(loadedDrafts);
        setTemplates(loadedTemplates);
        setCommSettings(loadedSettings);
        setIsLoading(false);
      } catch (err) {
        setIsLoading(false);
        console.error('Failed to load initial communication data', err);
      }
    };
    void load();
  }, []);

  // Dropdown outside click handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  // Recipient resolution logic
  useEffect(() => {
    if (tab !== 'compose') return;
    let isCurrent = true;
    communicationService.resolveRecipients(filters)
      .then((resolved) => {
        if (!isCurrent) return;
        setRecipients(resolved);
        setSelectedIds(new Set(resolved.map((r) => r.id)));
      })
      .catch(() => {
        if (!isCurrent) return;
        setRecipients([]);
        setSelectedIds(new Set());
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => { isCurrent = false; };
  }, [filters, tab]);

  const updateFilter = <K extends keyof CommunicationFilters>(key: K, value: CommunicationFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleVoicePartToggle = (token: string) => {
    const active = filters.voiceParts || [];
    const next = active.includes(token) ? active.filter((p) => p !== token) : [...active, token];
    updateFilter('voiceParts', next);
  };

  const insertPlaceholder = (tag: string) => {
    if (!textAreaRef.current) return;
    const { selectionStart, selectionEnd } = textAreaRef.current;
    const newContent = content.substring(0, selectionStart) + tag + content.substring(selectionEnd);
    setContent(newContent);
    // Move focus back and place cursor after inserted tag
    setTimeout(() => {
      if (textAreaRef.current) {
        textAreaRef.current.focus();
        textAreaRef.current.selectionStart = textAreaRef.current.selectionEnd = selectionStart + tag.length;
      }
    }, 0);
  };

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      const input = {
        subject,
        content,
        type: messageType,
        recipients: selectedRecipients,
        filters: filters as unknown as Record<string, unknown>,
      };
      const record = await communicationService.saveDraft(input, activeDraftId || undefined);
      setActiveDraftId(record.id);
      setDrafts(await communicationService.getDrafts());
      await dialog.showMessage({ title: 'Draft Saved', message: 'Your message has been saved as a draft.', variant: 'info' });
    } catch (err: unknown) {
      console.error(err);
      await dialog.showMessage({ title: 'Error', message: 'Failed to save draft.', variant: 'danger' });
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleResumeDraft = (draft: MessageRecord) => {
    setActiveDraftId(draft.id);
    setSubject(draft.subject);
    setContent(draft.content);
    setMessageType(draft.type);
    
    // Process filters
    const mFilters = draft.filters as Record<string, unknown>;
    const vpArray: string[] = Array.isArray(mFilters?.voiceParts) ? (mFilters.voiceParts as string[]) : (mFilters?.voicePart ? [mFilters.voicePart as string] : []);
    setFilters({
      eventId: (mFilters?.eventId as string) || '',
      rsvp: (mFilters?.rsvp as CommunicationFilters['rsvp']) || 'All',
      voiceParts: vpArray,
      globalStatus: (mFilters?.globalStatus as string) || 'Active (Current)',
    });
    
    setWizardStep('COMPOSE');
    setTab('compose');
  };

  const sendMessage = async () => {
    if (selectedRecipients.length === 0) {
      await dialog.showMessage({ title: 'No Recipients', message: 'Select at least one recipient before sending.' });
      return;
    }
    
    const confirmSend = await dialog.confirm({
      title: 'Confirm Send',
      message: `Send this message to ${selectedRecipients.length} recipients?`,
      confirmLabel: 'Send Now',
    });
    if (!confirmSend) return;

    setIsSending(true);
    try {
      const input = {
        subject,
        content,
        type: messageType,
        recipients: selectedRecipients,
        filters: filters as unknown as Record<string, unknown>,
      };
      await communicationService.sendBulkMessage(input, activeDraftId || undefined);
      setHistory(await communicationService.getMessages());
      setDrafts(await communicationService.getDrafts());
      setActiveDraftId(null);
      
      await dialog.showMessage({ title: 'Success', message: 'Message sent successfully!', variant: 'info' });
      setWizardStep('TARGETS');
    } catch (err: unknown) {
      console.error(err);
      await dialog.showMessage({ title: 'Error', message: 'Failed to send message.', variant: 'danger' });
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Communications...</div>;

  return (
    <div className="flex-col" style={{ gap: 'var(--space-lg)' }}>
      <div className="flex-responsive" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <h1 className="text-display" style={{ margin: 0 }}>Communications</h1>
        <div className="flex-row" style={{ gap: 'var(--space-sm)' }}>
          {(['compose', 'automated', 'drafts', 'history', 'settings'] as Tab[]).map((item) => (
            <button
              key={item}
              type="button"
              className={`btn ${tab === item ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => {
                setTab(item);
                if (item === 'compose' && wizardStep === 'REVIEW') setWizardStep('TARGETS');
              }}
            >
              {item === 'compose' ? 'Send Wizard' : item[0].toUpperCase() + item.slice(1)}
              {item === 'drafts' && drafts.length > 0 && <span className="badge" style={{ marginLeft: '8px', backgroundColor: 'var(--primary-light)', color: 'var(--primary-deep)' }}>{drafts.length}</span>}
            </button>
          ))}
        </div>
      </div>

      {tab === 'compose' && (
        <div className="flex-col" style={{ gap: 'var(--space-lg)' }}>
          {/* Wizard Progress Bar */}
          <div className="flex-row" style={{ gap: 'var(--space-sm)', justifyContent: 'center', marginBottom: 'var(--space-md)' }}>
            {[
              { id: 'TARGETS', label: '1. Targets & Template' },
              { id: 'COMPOSE', label: '2. Compose & Preview' },
              { id: 'REVIEW', label: '3. Review & Send' }
            ].map((step, idx) => (
              <div key={step.id} className="flex-row" style={{ alignItems: 'center', gap: 'var(--space-sm)' }}>
                <span 
                  style={{ 
                    fontWeight: 700, 
                    fontSize: '0.85rem',
                    color: wizardStep === step.id ? 'var(--primary)' : 'var(--text-muted)',
                    borderBottom: wizardStep === step.id ? '2px solid var(--primary)' : 'none',
                    padding: '4px 8px'
                  }}
                >
                  {step.label}
                </span>
                {idx < 2 && <span className="text-muted">→</span>}
              </div>
            ))}
          </div>

          {wizardStep === 'TARGETS' && (
            <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 'var(--space-lg)', alignItems: 'start' }}>
              <AppCard title="Target Audience">
                <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
                  <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                    <label className="text-label">Event Context</label>
                    <select className="card" value={filters.eventId} onChange={(event) => updateFilter('eventId', event.target.value)} style={{ height: '44px', padding: '0 12px' }}>
                      <option value="">No Specific Event</option>
                      {events.map((event) => (
                        <option key={event.id} value={event.id}>{event.title || event.expand?.venue?.name || ''}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                    <label className="text-label">RSVP Status</label>
                    <select className="card" value={filters.rsvp} onChange={(event) => updateFilter('rsvp', event.target.value as CommunicationFilters['rsvp'])} style={{ height: '44px', padding: '0 12px' }}>
                      <option value="All">All Members</option>
                      <option value="Yes">Attending Only</option>
                      <option value="No">Declined Only</option>
                      <option value="Pending">No Response (Pending)</option>
                    </select>
                  </div>

                  <div className="flex-col" style={{ gap: 'var(--space-xs)', position: 'relative' }} ref={dropdownRef}>
                    <label className="text-label">Voice Part / Section</label>
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="card flex-row"
                      style={{ height: '44px', padding: '0 12px', width: '100%', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left', backgroundColor: 'var(--bg)' }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.9rem', fontWeight: (filters.voiceParts || []).length > 0 ? 600 : 400 }}>
                        {filters.voiceParts.length === 0 ? 'All Voice Parts' : `${filters.voiceParts.length} selected`}
                      </span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-muted)' }}>
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </button>
                    {isDropdownOpen && (
                      <div className="card shadow-lg" style={{ position: 'absolute', top: '68px', left: 0, right: 0, zIndex: 100, maxHeight: '300px', overflowY: 'auto', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '8px 0' }}>
                        <div style={{ padding: '4px 12px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sections</div>
                        {configSections.map(sec => (
                          <label key={sec.code} className="flex-row" style={{ padding: '8px 12px', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer', fontSize: '13px' }}>
                            <input type="checkbox" checked={filters.voiceParts.includes(sec.code)} onChange={() => handleVoicePartToggle(sec.code)} style={{ accentColor: 'var(--primary)' }} />
                            {sec.name}
                          </label>
                        ))}
                        <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '4px 0' }}></div>
                        <div style={{ padding: '4px 12px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Individual Parts</div>
                        {voicePartLabels.map(part => (
                          <label key={part} className="flex-row" style={{ padding: '8px 12px', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer', fontSize: '13px' }}>
                            <input type="checkbox" checked={filters.voiceParts.includes(part)} onChange={() => handleVoicePartToggle(part)} style={{ accentColor: 'var(--primary)' }} />
                            {part}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </AppCard>

              <div className="flex-col" style={{ gap: 'var(--space-lg)' }}>
                <AppCard title="Templates & Quick Starts">
                  <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
                    <p className="text-muted text-sm">Select a template to pre-fill your message, or start with a blank canvas.</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-sm)' }}>
                      <button 
                        className="btn btn-ghost" 
                        style={{ height: 'auto', padding: '16px', textAlign: 'center', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}
                        onClick={() => {
                          setSubject('');
                          setContent('');
                          setWizardStep('COMPOSE');
                        }}
                      >
                        <div style={{ fontSize: '1.5rem' }}>📄</div>
                        <div style={{ fontWeight: 600 }}>Blank Message</div>
                      </button>
                      {templates.map(tpl => (
                        <button 
                          key={tpl.id}
                          className="btn btn-ghost" 
                          style={{ height: 'auto', padding: '16px', textAlign: 'center', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}
                          onClick={() => {
                            setSubject(tpl.subject);
                            setContent(tpl.content);
                            setMessageType(tpl.type);
                            setWizardStep('COMPOSE');
                          }}
                        >
                          <div style={{ fontSize: '1.5rem' }}>{tpl.type === 'SMS' ? '📱' : '✉️'}</div>
                          <div style={{ fontWeight: 600 }}>{tpl.title}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </AppCard>

                <div className="flex-row" style={{ justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={() => setWizardStep('COMPOSE')}>
                    Next: Compose Message →
                  </button>
                </div>
              </div>
            </div>
          )}

          {wizardStep === 'COMPOSE' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--space-lg)', alignItems: 'start' }}>
              <div className="flex-col" style={{ gap: 'var(--space-lg)' }}>
                <AppCard title="Composer">
                  <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
                    <div className="flex-responsive" style={{ gap: 'var(--space-md)' }}>
                      <div className="flex-col" style={{ flex: 1, gap: 'var(--space-xs)' }}>
                        <label className="text-label">Subject</label>
                        <input className="card" value={subject} onChange={(e) => setSubject(e.target.value)} style={{ height: '44px', padding: '0 12px' }} disabled={messageType === 'SMS'} />
                      </div>
                      <div className="flex-col" style={{ width: '180px', gap: 'var(--space-xs)' }}>
                        <label className="text-label">Channel</label>
                        <select className="card" value={messageType} onChange={(e) => setMessageType(e.target.value as MessageType)} style={{ height: '44px', padding: '0 12px' }}>
                          <option value="Email">Email</option>
                          <option value="SMS">SMS</option>
                          <option value="Both">Both</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                      <label className="text-label">Message Body (Markdown Supported)</label>
                      <textarea 
                        ref={textAreaRef}
                        className="card" 
                        value={content} 
                        onChange={(e) => setContent(e.target.value)} 
                        style={{ minHeight: '350px', padding: '12px', resize: 'vertical', fontFamily: 'var(--font-sans)', fontSize: '1rem' }} 
                      />
                    </div>
                  </div>
                </AppCard>
                
                <AppCard title="Live Preview">
                  <div className="card" style={{ boxShadow: 'none', backgroundColor: 'var(--bg)', padding: 'var(--space-md)', minHeight: '100px' }}>
                    {(messageType === 'Email' || messageType === 'Both') && (
                      <h3 style={{ marginTop: 0, borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
                        {resolvePreviewContent(subject, events.find(e => e.id === filters.eventId) || null, selectedRecipients[0] || null)}
                      </h3>
                    )}
                    <div className="text-body message-preview-content" dangerouslySetInnerHTML={{ __html: previewHtml || '<p class="text-muted">No message content.</p>' }} />
                  </div>
                </AppCard>

                <div className="flex-row" style={{ justifyContent: 'space-between' }}>
                  <button className="btn btn-ghost" onClick={() => setWizardStep('TARGETS')}>← Back to Targets</button>
                  <div className="flex-row" style={{ gap: 'var(--space-sm)' }}>
                    <button className="btn btn-secondary" onClick={handleSaveDraft} disabled={isSavingDraft}>
                      {isSavingDraft ? 'Saving...' : 'Save Draft'}
                    </button>
                    <button className="btn btn-primary" onClick={() => setWizardStep('REVIEW')}>
                      Next: Review & Send →
                    </button>
                  </div>
                </div>
              </div>
              <PlaceholderPanel onInsert={insertPlaceholder} />
            </div>
          )}

          {wizardStep === 'REVIEW' && (
            <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
              <AppCard title="Pre-Flight Review">
                <div className="flex-col" style={{ gap: 'var(--space-xl)' }}>
                  <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
                    <h4 style={{ margin: 0, color: 'var(--primary-deep)' }}>Recipient Summary</h4>
                    <div className="flex-row" style={{ gap: 'var(--space-lg)' }}>
                      <div className="flex-col">
                        <span style={{ fontSize: '2rem', fontWeight: 800 }}>{selectedRecipients.length}</span>
                        <span className="text-muted text-sm">Total Targeted</span>
                      </div>
                      <div className="flex-col" style={{ borderLeft: '1px solid var(--border)', paddingLeft: 'var(--space-lg)' }}>
                        <span style={{ fontSize: '2rem', fontWeight: 800 }}>{selectedRecipients.filter(r => r.email).length}</span>
                        <span className="text-muted text-sm">Via Email</span>
                      </div>
                      <div className="flex-col" style={{ borderLeft: '1px solid var(--border)', paddingLeft: 'var(--space-lg)' }}>
                        <span style={{ fontSize: '2rem', fontWeight: 800 }}>{selectedRecipients.filter(r => r.phone).length}</span>
                        <span className="text-muted text-sm">Via SMS</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
                    <h4 style={{ margin: 0, color: 'var(--primary-deep)' }}>Checklist</h4>
                    <div className="flex-col card" style={{ gap: 'var(--space-sm)', padding: 'var(--space-md)', backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>
                      {subject === '' && (messageType === 'Email' || messageType === 'Both') && (
                        <div className="flex-row" style={{ color: '#991b1b', alignItems: 'center', gap: '8px' }}>
                          <span>⚠️</span> <strong>Subject is empty.</strong> It's better to add a subject for higher open rates.
                        </div>
                      )}
                      {content.length < 10 && (
                        <div className="flex-row" style={{ color: '#991b1b', alignItems: 'center', gap: '8px' }}>
                          <span>⚠️</span> <strong>Message is very short.</strong>
                        </div>
                      )}
                      {selectedRecipients.length === 0 && (
                        <div className="flex-row" style={{ color: '#991b1b', alignItems: 'center', gap: '8px' }}>
                          <span>❌</span> <strong>No recipients selected.</strong> You cannot send this message.
                        </div>
                      )}
                      {selectedRecipients.some(r => !r.email) && (messageType === 'Email' || messageType === 'Both') && (
                        <div className="flex-row" style={{ color: '#92400e', alignItems: 'center', gap: '8px' }}>
                          <span>ℹ️</span> {selectedRecipients.filter(r => !r.email).length} singers have no email address and will skip Email.
                        </div>
                      )}
                      {selectedRecipients.some(r => !r.phone) && (messageType === 'SMS' || messageType === 'Both') && (
                        <div className="flex-row" style={{ color: '#92400e', alignItems: 'center', gap: '8px' }}>
                          <span>ℹ️</span> {selectedRecipients.filter(r => !r.phone).length} singers have no phone number and will skip SMS.
                        </div>
                      )}
                      <div className="flex-row" style={{ color: '#166534', alignItems: 'center', gap: '8px' }}>
                        <span>✅</span> Compliance footer will be automatically attached.
                      </div>
                    </div>
                  </div>

                  <div className="flex-row" style={{ justifyContent: 'space-between', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--border)' }}>
                    <button className="btn btn-ghost" onClick={() => setWizardStep('COMPOSE')}>← Back to Compose</button>
                    <button className="btn btn-primary" onClick={sendMessage} disabled={isSending || selectedRecipients.length === 0}>
                      {isSending ? 'Dispatching...' : '🚀 Final Send'}
                    </button>
                  </div>
                </div>
              </AppCard>
            </div>
          )}
        </div>
      )}

      {tab === 'automated' && (
        <div className="flex-col" style={{ gap: 'var(--space-xl)' }}>
          <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
            <h3 className="text-headline" style={{ fontSize: '1.1rem', color: 'var(--primary-deep)' }}>Upcoming Automated Tasks</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-md)' }}>
              {upcomingTasks.length === 0 && <div className="card" style={{ padding: 'var(--space-xl)', textAlign: 'center', gridColumn: '1 / -1', border: '1px dashed var(--border)' }}><p className="text-muted">No upcoming automated tasks found.</p></div>}
              {upcomingTasks.map(task => (
                <div key={task.id} className="card" style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span className={`badge ${task.type === 'Report' ? 'badge-concert' : task.type === 'RSVP Request' ? 'badge-concert' : 'badge-rehearsal'}`} style={{ backgroundColor: task.type === 'RSVP Request' ? '#3b82f6' : undefined, color: task.type === 'RSVP Request' ? 'white' : undefined }}>{task.type}</span>
                    <span className="text-muted text-xs">{task.type === 'RSVP Request' ? 'Pending since:' : task.type === 'Report' ? 'Scheduled for:' : 'Next run:'} {task.scheduledTime.toLocaleString()}</span>
                  </div>
                  <div className="flex-col" style={{ gap: '2px' }}>
                    <strong style={{ fontSize: '1rem' }}>{task.event.title || task.event.type}</strong>
                    <span className="text-muted text-xs">{new Date(task.event.date).toLocaleString()}</span>
                  </div>
                  <div className="flex-row" style={{ justifyContent: 'space-between', marginTop: 'auto', paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--border)' }}>
                    <button className="btn btn-ghost btn-sm" onClick={async () => {
                      const r = await communicationService.resolveRecipients({ eventId: task.event.id, rsvp: task.type === 'RSVP Request' ? 'Pending' : 'All', voiceParts: [], globalStatus: 'Active (Current)' });
                      setRecipientPreviewList({ isOpen: true, recipients: r, title: `Expected Recipients for ${task.event.title || task.event.type}` });
                    }}>View Recipients</button>
                    <button className="btn btn-primary btn-sm" disabled={isSending} onClick={async () => {
                      if (task.type === 'Report') {
                        const confirmed = await dialog.confirm({ title: 'Send Report Now?', message: `Generate and send the attendance report for "${task.event.title || task.event.type}" immediately?`, confirmLabel: 'Send Now' });
                        if (confirmed) { 
                          setIsSending(true); 
                          try { 
                            await communicationService.triggerAttendanceReport(task.event.id); 
                            setHistory(await communicationService.getMessages()); 
                          } catch (err: unknown) { 
                            const msg = err instanceof Error ? err.message : String(err);
                            await dialog.showMessage({ title: 'Error', message: msg, variant: 'danger' }); 
                          } finally { 
                            setIsSending(false); 
                          } 
                        }
                      } else {
                        const values = { eventTitle: task.event.title || task.event.type, eventType: task.event.type, eventDate: new Date(task.event.date).toLocaleString(), eventLocation: task.event.expand?.venue?.name || 'TBD', eventDetails: task.event.details || '', singerName: '{singerName}', rsvpLinks: '{{RSVP_LINKS}}' };
                        setFilters({ ...DEFAULT_FILTERS, eventId: task.event.id, rsvp: task.type === 'RSVP Request' ? 'Pending' : 'All' });
                        setSubject(renderCommunicationTemplate(commSettings.reminderSubjectTemplate, values));
                        setContent(renderCommunicationTemplate(commSettings.reminderBodyTemplate, values));
                        setMessageType('Email');
                        setWizardStep('COMPOSE');
                        setTab('compose');
                      }
                    }}>{task.type === 'Report' ? 'Send Now' : 'Open Compose'}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
            <h3 className="text-headline" style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>Sent / Past Automated Tasks</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-md)' }}>
              {pastTasks.length === 0 && <p className="text-muted text-sm" style={{ gridColumn: '1 / -1' }}>No past automated tasks found in the logs.</p>}
              {pastTasks.map(task => (
                <div key={task.id} className="card" style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', opacity: 0.8 }}>
                  <div className="flex-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span className={`badge ${task.status === 'Sent' ? 'badge-concert' : 'badge-rehearsal'}`} style={{ backgroundColor: task.status === 'Sent' ? undefined : 'var(--border)' }}>{task.type} {task.status === 'Sent' ? '(Sent)' : '(Passed)'}</span>
                    <span className="text-muted text-xs">{task.status === 'Sent' ? 'Processed at:' : 'Scheduled for:'} {task.scheduledTime.toLocaleString()}</span>
                  </div>
                  <div className="flex-col" style={{ gap: '2px' }}>
                    <strong style={{ fontSize: '1rem' }}>{task.event.title || task.event.type}</strong>
                    <span className="text-muted text-xs">{new Date(task.event.date).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'drafts' && (
        <AppCard noPadding>
          {drafts.map((draft) => (
            <div key={draft.id} className="flex-responsive" style={{ padding: 'var(--space-lg)', borderBottom: '1px solid var(--border)', justifyContent: 'space-between' }}>
              <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                <div className="flex-row" style={{ gap: 'var(--space-sm)' }}>
                  <span className="badge badge-rehearsal">{draft.type}</span>
                  <span className="text-muted text-xs">Last updated: {new Date(draft.updated).toLocaleString()}</span>
                </div>
                <h3 style={{ margin: 0 }}>{draft.subject || '(No Subject)'}</h3>
                <p className="text-muted text-sm">{draft.content.substring(0, 100)}...</p>
              </div>
              <div className="flex-row">
                <button className="btn btn-ghost btn-sm" onClick={async () => {
                  if (await dialog.confirm({ title: 'Delete Draft', message: 'Are you sure you want to delete this draft?', variant: 'danger' })) {
                    await communicationService.deleteDraft(draft.id);
                    setDrafts(await communicationService.getDrafts());
                  }
                }}>Delete</button>
                <button className="btn btn-primary btn-sm" onClick={() => handleResumeDraft(draft)}>Resume Draft</button>
              </div>
            </div>
          ))}
          {drafts.length === 0 && <div style={{ padding: '40px', textAlign: 'center' }}><p className="text-muted">No saved drafts.</p></div>}
        </AppCard>
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
                  <button className="btn btn-secondary btn-sm" onClick={() => handleResumeDraft(message)}>Copy to Draft</button>
                </div>
              </div>
            );
          })}
          {history.length === 0 && <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}><p className="text-muted">No messages logged yet.</p></div>}
        </AppCard>
      )}

      {tab === 'settings' && (
        <div className="flex-col" style={{ gap: 'var(--space-lg)' }}>
          <AppCard title="Application & Footer Compliance">
            <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
              <SettingsGrid>
                <Field label="Physical Mailing Address" value={commSettings.mailingAddress} onChange={(v) => setCommSettings({ ...commSettings, mailingAddress: v })} />
                <Field label="Application Base URL" value={commSettings.frontendUrl} onChange={(v) => setCommSettings({ ...commSettings, frontendUrl: v })} />
              </SettingsGrid>
              <div className="text-muted text-xs">Note: These values are used for legal compliance (footer) and link generation.</div>
            </div>
          </AppCard>

          <AppCard title="Delivery Credentials">
            <SettingsGrid>
              <div className="flex-col" style={{ gap: '4px' }}>
                <label className="text-label">SMTP Config</label>
                <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setTab('settings')}>Configure Securely in PB Admin</button>
              </div>
            </SettingsGrid>
          </AppCard>

          <div className="flex-row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={async () => {
              setIsSavingConfig(true);
              try { await settingsService.saveCommunicationSettings(commSettings); await dialog.showMessage({ title: 'Saved', message: 'Settings updated successfully.', variant: 'info' }); }
              finally { setIsSavingConfig(false); }
            }} disabled={isSavingConfig}>{isSavingConfig ? 'Saving...' : 'Save Settings'}</button>
          </div>
        </div>
      )}

      <BaseModal isOpen={!!selectedMessage} onClose={() => setSelectedMessage(null)} title="Message Details" maxWidth="600px">
        {selectedMessage && (
          <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
            <div className="flex-col" style={{ gap: '2px' }}>
              <label className="text-label text-muted">Subject</label>
              <strong>{selectedMessage.subject || '(SMS)'}</strong>
            </div>
            <div className="flex-col" style={{ gap: '2px' }}>
              <label className="text-label text-muted">Sent To</label>
              <span>{selectedMessage.recipients.length} recipients</span>
            </div>
            <div className="flex-col" style={{ gap: '2px' }}>
              <label className="text-label text-muted">Content</label>
              <div className="card" style={{ padding: '12px', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', whiteSpace: 'pre-wrap' }}>{selectedMessage.content}</div>
            </div>
          </div>
        )}
      </BaseModal>

      <BaseModal isOpen={recipientPreviewList.isOpen} onClose={() => setRecipientPreviewList({ ...recipientPreviewList, isOpen: false })} title={recipientPreviewList.title} maxWidth="500px">
        <div className="flex-col" style={{ gap: 'var(--space-sm)', maxHeight: '400px', overflowY: 'auto' }}>
          {recipientPreviewList.recipients.map(r => (
            <div key={r.id} className="flex-row card" style={{ padding: 'var(--space-sm)', justifyContent: 'space-between', boxShadow: 'none' }}>
              <strong>{r.name}</strong>
              <span className="text-muted text-xs">{r.voicePart}</span>
            </div>
          ))}
        </div>
      </BaseModal>
    </div>
  );
}

function SettingsGrid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-md)' }}>{children}</div>;
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (val: string) => void; type?: string }) {
  return (
    <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
      <label className="text-label">{label}</label>
      <input className="card" type={type} value={value} onChange={(e) => onChange(e.target.value)} style={{ height: '44px', padding: '0 12px' }} />
    </div>
  );
}
