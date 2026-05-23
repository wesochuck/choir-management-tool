import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AppCard } from '../../components/common/AppCard';
import { BaseModal } from '../../components/common/BaseModal';
import { useDialog } from '../../contexts/DialogContext';
import { useEvents } from '../../hooks/useEvents';
import { useVoiceParts } from '../../hooks/useVoiceParts';
import { useAuth } from '../../contexts/AuthContext';
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
import { pb } from '../../lib/pocketbase';
import { getRenderedPreview, resolvePreviewContent } from '../../lib/communicationUtils';
import { PlaceholderPanel } from '../../components/admin/PlaceholderPanel';
import './CommunicationView.css';

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

  const { user } = useAuth();

  // Global UI state
  const [tab, setTab] = useState<Tab>('compose');
  const [wizardStep, setWizardStep] = useState<WizardStep>('TARGETS');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
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
  const [testEmailAddress, setTestEmailAddress] = useState(user?.email || '');
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);

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

  const handleSendTest = async () => {
    if (!user?.email) {
      await dialog.showMessage({ title: 'No Email', message: 'Your administrator account has no email address configured.', variant: 'danger' });
      return;
    }

    if (messageType === 'SMS') {
      const switchToEmail = await dialog.confirm({
        title: 'Email Test Only',
        message: 'Test send delivers email only. Switch channel to Email and continue?',
        confirmLabel: 'Switch to Email',
      });
      if (!switchToEmail) return;
      setMessageType('Email');
    }

    setIsSendingTest(true);
    try {
      const adminName = (user as unknown as { name?: string })?.name || user.email || 'Admin';
      const testRecipient: CommunicationRecipient = {
        id: user.id,
        name: adminName,
        email: user.email,
        phone: '',
        voicePart: 'Admin',
        globalStatus: 'Admin',
      };

      const input = {
        subject: `[TEST] ${subject}`,
        content,
        type: 'Email' as const,
        recipients: [testRecipient],
        filters: { ...filters, isTest: true } as unknown as Record<string, unknown>,
        status: 'Sent' as const,
      };

      await communicationService.sendBulkMessage(input);
      await dialog.showMessage({ title: 'Test Sent', message: `A test email has been sent to ${user.email}.`, variant: 'info' });
    } catch (err: unknown) {
      console.error(err);
      await dialog.showMessage({ title: 'Error', message: 'Failed to send test message.', variant: 'danger' });
    } finally {
      setIsSendingTest(false);
    }
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

  const handleSendConnectionTest = async () => {
    if (!testEmailAddress) {
      await dialog.showMessage({ title: 'Error', message: 'Please enter a destination email address.', variant: 'danger' });
      return;
    }

    setIsTestingSmtp(true);
    try {
      // Call the test SMTP endpoint
      const response = await pb.send('/api/test-smtp', {
        method: 'POST',
        body: { email: testEmailAddress }
      });
      
      if (response && response.success) {
        await dialog.showMessage({ title: 'Success', message: `Test email successfully sent to ${testEmailAddress}!`, variant: 'info' });
      } else {
        throw new Error(response?.error || 'Unknown error occurred.');
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await dialog.showMessage({
        title: 'SMTP Connection Failed',
        message: `Could not send test email: ${errMsg}`,
        variant: 'danger'
      });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  if (isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Communications...</div>;

  return (
    <div className="communication-container">
      <div className="communication-header">
        <h1 className="text-display" style={{ margin: 0 }}>Communications</h1>
        <div className="communication-tabs">
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
          <div className="wizard-progress-bar">
            {[
              { id: 'TARGETS', label: '1. Targets & Template' },
              { id: 'COMPOSE', label: '2. Compose & Preview' },
              { id: 'REVIEW', label: '3. Review & Send' }
            ].map((step, idx) => (
              <div key={step.id} className="wizard-step-item">
                <span className={`wizard-step-label ${wizardStep === step.id ? 'active' : 'inactive'}`}>
                  {step.label}
                </span>
                {idx < 2 && <span className="text-muted">→</span>}
              </div>
            ))}
          </div>

          {wizardStep === 'TARGETS' && (
            <div className="targets-grid">
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

                  <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                    <label className="text-label">Global Status</label>
                    <select className="card" value={filters.globalStatus} onChange={(event) => updateFilter('globalStatus', event.target.value)} style={{ height: '44px', padding: '0 12px' }}>
                      <option value="Active (Current)">Active (Current)</option>
                      <option value="Active (Future)">Active (Future)</option>
                      <option value="Inactive">Inactive</option>
                      <option value="">All Statuses</option>
                    </select>
                  </div>

                  <div className="flex-col" style={{ gap: 'var(--space-xs)', position: 'relative' }} ref={dropdownRef}>
                    <label className="text-label">Voice Part / Section</label>
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="card voice-part-dropdown-trigger flex-row"
                    >
                      <span className={`dropdown-item-text ${(filters.voiceParts || []).length > 0 ? 'selected' : ''}`}>
                        {filters.voiceParts.length === 0 ? 'All Voice Parts' : `${filters.voiceParts.length} selected`}
                      </span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-muted)' }}>
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </button>
                    {isDropdownOpen && (
                      <div className="card voice-part-dropdown-panel shadow-lg">
                        <div className="dropdown-section-header">Sections</div>
                        {configSections.map(sec => (
                          <label key={sec.code} className="dropdown-item-label">
                            <input type="checkbox" checked={filters.voiceParts.includes(sec.code)} onChange={() => handleVoicePartToggle(sec.code)} style={{ accentColor: 'var(--primary)', width: '15px', height: '15px' }} />
                            <span className={filters.voiceParts.includes(sec.code) ? 'selected' : ''}>{sec.name}</span>
                          </label>
                        ))}
                        <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '4px 0' }}></div>
                        <div className="dropdown-section-header">Individual Parts</div>
                        {voicePartLabels.map(part => (
                          <label key={part} className="dropdown-item-label">
                            <input type="checkbox" checked={filters.voiceParts.includes(part)} onChange={() => handleVoicePartToggle(part)} style={{ accentColor: 'var(--primary)', width: '15px', height: '15px' }} />
                            <span className={filters.voiceParts.includes(part) ? 'selected' : ''}>{part}</span>
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
                    <div className="template-gallery">
                      <button 
                        className="btn btn-ghost template-card-btn" 
                        onClick={() => {
                          setSubject('');
                          setContent('');
                          setWizardStep('COMPOSE');
                        }}
                      >
                        <div className="template-card-icon">📄</div>
                        <div style={{ fontWeight: 600 }}>Blank Message</div>
                      </button>
                      {templates.map(tpl => (
                        <button 
                          key={tpl.id}
                          className="btn btn-ghost template-card-btn" 
                          onClick={() => {
                            setSubject(tpl.subject);
                            setContent(tpl.content);
                            setMessageType(tpl.type);
                            setWizardStep('COMPOSE');
                          }}
                        >
                          <div className="template-card-icon">{tpl.type === 'SMS' ? '📱' : '✉️'}</div>
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
            <div className="compose-grid">
              <div className="flex-col" style={{ gap: 'var(--space-lg)' }}>
                <AppCard title="Composer">
                  <div className="composer-form">
                    <div className="composer-header-row">
                      <div className="composer-subject-field flex-col" style={{ gap: 'var(--space-xs)' }}>
                        <label className="text-label">Subject</label>
                        <input className="card" value={subject} onChange={(e) => setSubject(e.target.value)} style={{ height: '44px', padding: '0 12px' }} disabled={messageType === 'SMS'} />
                      </div>
                      <div className="composer-channel-field flex-col" style={{ gap: 'var(--space-xs)' }}>
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
                        className="card composer-textarea" 
                        value={content} 
                        onChange={(e) => setContent(e.target.value)} 
                      />
                    </div>
                  </div>
                </AppCard>
                
                <AppCard title="Live Preview">
                  <div className="live-preview-container card">
                    {(messageType === 'Email' || messageType === 'Both') && (
                      <h3 className="live-preview-subject">
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
            <div className="review-container">
              <AppCard title="Pre-Flight Review">
                <div className="flex-col" style={{ gap: 'var(--space-xl)' }}>
                  <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
                    <h4 style={{ margin: 0, color: 'var(--primary-deep)' }}>Recipient Summary</h4>
                    <div className="review-summary-row">
                      <div className="review-summary-stat">
                        <span className="review-stat-value">{selectedRecipients.length}</span>
                        <span className="text-muted text-sm">Total Targeted</span>
                      </div>
                      <div className="review-summary-stat divider">
                        <span className="review-stat-value">{selectedRecipients.filter(r => r.email).length}</span>
                        <span className="text-muted text-sm">Via Email</span>
                      </div>
                      <div className="review-summary-stat divider">
                        <span className="review-stat-value">{selectedRecipients.filter(r => r.phone).length}</span>
                        <span className="text-muted text-sm">Via SMS</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
                    <h4 style={{ margin: 0, color: 'var(--primary-deep)' }}>Checklist</h4>
                    <div className="review-checklist-card card">
                      {subject === '' && (messageType === 'Email' || messageType === 'Both') && (
                        <div className="checklist-item warning">
                          <span>⚠️</span> <strong>Subject is empty.</strong> It's better to add a subject for higher open rates.
                        </div>
                      )}
                      {content.length < 10 && (
                        <div className="checklist-item warning">
                          <span>⚠️</span> <strong>Message is very short.</strong>
                        </div>
                      )}
                      {selectedRecipients.length === 0 && (
                        <div className="checklist-item warning">
                          <span>❌</span> <strong>No recipients selected.</strong> You cannot send this message.
                        </div>
                      )}
                      {selectedRecipients.some(r => !r.email) && (messageType === 'Email' || messageType === 'Both') && (
                        <div className="checklist-item info">
                          <span>ℹ️</span> {selectedRecipients.filter(r => !r.email).length} singers have no email address and will skip Email.
                        </div>
                      )}
                      {selectedRecipients.some(r => !r.phone) && (messageType === 'SMS' || messageType === 'Both') && (
                        <div className="checklist-item info">
                          <span>ℹ️</span> {selectedRecipients.filter(r => !r.phone).length} singers have no phone number and will skip SMS.
                        </div>
                      )}
                      <div className="checklist-item success">
                        <span>✅</span> Compliance footer will be automatically attached.
                      </div>
                    </div>
                  </div>

                  <div className="flex-row" style={{ justifyContent: 'space-between', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--border)' }}>
                    <button className="btn btn-ghost" onClick={() => setWizardStep('COMPOSE')}>← Back to Compose</button>
                    <div className="flex-row" style={{ gap: 'var(--space-sm)' }}>
                      <button 
                        className="btn btn-secondary" 
                        onClick={handleSendTest} 
                        disabled={isSendingTest || isSending}
                        title={`Send email test to ${user?.email || 'your email'}`}
                      >
                        {isSendingTest ? 'Sending Test...' : '🧪 Send Email Test to Me'}
                      </button>
                      <button className="btn btn-primary" onClick={sendMessage} disabled={isSending || selectedRecipients.length === 0}>
                        {isSending ? 'Dispatching...' : '🚀 Final Send'}
                      </button>
                    </div>
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
            <div className="automated-grid">
              {upcomingTasks.length === 0 && <div className="card" style={{ padding: 'var(--space-xl)', textAlign: 'center', gridColumn: '1 / -1', border: '1px dashed var(--border)' }}><p className="text-muted">No upcoming automated tasks found.</p></div>}
              {upcomingTasks.map(task => (
                <div key={task.id} className="card automated-task-card">
                  <div className="automated-task-header">
                    <span className={`badge ${task.type === 'Report' ? 'badge-concert' : task.type === 'RSVP Request' ? 'badge-concert' : 'badge-rehearsal'}`} style={{ backgroundColor: task.type === 'RSVP Request' ? '#3b82f6' : undefined, color: task.type === 'RSVP Request' ? 'white' : undefined }}>{task.type}</span>
                    <span className="text-muted text-xs">{task.type === 'RSVP Request' ? 'Pending since:' : task.type === 'Report' ? 'Scheduled for:' : 'Next run:'} {task.scheduledTime.toLocaleString()}</span>
                  </div>
                  <div className="flex-col" style={{ gap: '2px' }}>
                    <strong style={{ fontSize: '1rem' }}>{task.event.title || task.event.type}</strong>
                    <span className="text-muted text-xs">{new Date(task.event.date).toLocaleString()}</span>
                  </div>
                  <div className="automated-task-footer">
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
            <div className="automated-grid">
              {pastTasks.length === 0 && <p className="text-muted text-sm" style={{ gridColumn: '1 / -1' }}>No past automated tasks found in the logs.</p>}
              {pastTasks.map(task => (
                <div key={task.id} className="card automated-task-card" style={{ opacity: 0.8 }}>
                  <div className="automated-task-header">
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
            <div key={draft.id} className="message-list-item flex-responsive">
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
              <div key={message.id} className="message-list-item flex-responsive">
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

          <AppCard title="Test Server SMTP Connection">
            <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
              <p className="text-muted text-sm" style={{ margin: 0 }}>
                Send a quick test email using the server's configured SMTP settings to verify that outgoing mail delivery is working.
              </p>
              <div className="flex-row" style={{ gap: 'var(--space-sm)', alignItems: 'center', marginTop: 'var(--space-sm)' }}>
                <input 
                  className="card" 
                  type="email" 
                  value={testEmailAddress} 
                  onChange={(e) => setTestEmailAddress(e.target.value)} 
                  placeholder="e.g. test@example.com" 
                  style={{ height: '44px', padding: '0 12px', flex: 1, maxWidth: '300px' }} 
                />
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleSendConnectionTest} 
                  disabled={isTestingSmtp || !testEmailAddress}
                >
                  {isTestingSmtp ? 'Sending Test...' : '🧪 Send Test Email'}
                </button>
              </div>
            </div>
          </AppCard>

          <div className="flex-row" style={{ justifyContent: 'flex-end' }}>
            <button 
              className="btn btn-primary" 
              onClick={async () => {
                setIsSavingConfig(true);
                try { 
                  await settingsService.saveCommunicationSettings(commSettings);
                  await dialog.showMessage({ title: 'Saved', message: 'Settings updated successfully.', variant: 'info' }); 
                } catch (err: unknown) {
                  const message = err instanceof Error ? err.message : String(err);
                  await dialog.showMessage({ title: 'Error', message: 'Failed to save settings: ' + message, variant: 'danger' });
                } finally { 
                  setIsSavingConfig(false); 
                }
              }} 
              disabled={isSavingConfig}
            >
              {isSavingConfig ? 'Saving...' : 'Save Settings'}
            </button>
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

function Field({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (val: string) => void; type?: string; placeholder?: string }) {
  return (
    <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
      <label className="text-label">{label}</label>
      <input className="card" type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ height: '44px', padding: '0 12px' }} />
    </div>
  );
}
