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
import { MessageHistory } from '../../components/admin/MessageHistory';
import './CommunicationView.css';

type Tab = 'compose' | 'automated' | 'drafts' | 'history' | 'settings';

type WizardStep = 'TARGETS' | 'COMPOSE' | 'REVIEW';

const DEFAULT_FILTERS: CommunicationFilters = {
  eventId: '',
  rsvp: 'All',
  voiceParts: [],
  globalStatus: 'Active',
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
  const [editingTemplate, setEditingTemplate] = useState<Partial<TemplateRecord> | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sentTaskStatus, setSentTaskStatus] = useState<Record<string, boolean>>({});

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
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

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
    const previewContent = editingTemplate ? editingTemplate.content : content;
    const previewType = editingTemplate ? editingTemplate.type : messageType;
    
    if (!previewContent) return '';
    const sampleRecipient = selectedRecipients[0] || null;
    const selectedEvent = events.find(e => e.id === filters.eventId) || null;
    
    return getRenderedPreview(
      previewContent,
      previewType as MessageType,
      selectedEvent,
      sampleRecipient,
      commSettings.mailingAddress
    );
  }, [content, editingTemplate, events, filters.eventId, selectedRecipients, messageType, commSettings.mailingAddress]);

  const { upcomingTasks, pastTasks } = useMemo(() => {
    const upcoming: AutomatedTask[] = [];
    const past: AutomatedTask[] = [];
    const now = new Date();

    events.forEach(event => {
      const eventDate = new Date(event.date);
      
      // RSVP Requests (Initial Invitation)
      if (event.isOpenForRSVP && eventDate > now) {
        const alreadySent = sentTaskStatus[`rsvp-${event.id}`] || false;

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
        const alreadySent = sentTaskStatus[`reminder-${event.id}`] || false;

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
        const alreadySent = sentTaskStatus[`report-${event.id}`] || false;
        
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
  }, [events, commSettings, sentTaskStatus]);

  const refreshHistory = async (pageToFetch = historyPage) => {
    try {
      const result = await communicationService.getMessagesPaginated(pageToFetch, 5);
      setHistory(result.items);
      setTotalPages(result.totalPages);
    } catch (err) {
      console.error('Failed to refresh message history', err);
    }
  };

  useEffect(() => {
    void refreshHistory(historyPage);
  }, [historyPage]);

  useEffect(() => {
    let isCurrent = true;
    if (events.length === 0) return;

    const checkSentStatuses = async () => {
      const cache: Record<string, boolean> = {};
      const promises = events.flatMap(event => [
        (async () => {
          const sent = await communicationService.wasMessageSent({ eventId: event.id, type: 'RSVP Request' });
          cache[`rsvp-${event.id}`] = sent;
        })(),
        (async () => {
          const sent = await communicationService.wasMessageSent({ eventId: event.id, type: 'Reminder' });
          cache[`reminder-${event.id}`] = sent;
        })(),
        (async () => {
          const sent = await communicationService.wasMessageSent({ eventId: event.id, type: 'Report' });
          cache[`report-${event.id}`] = sent;
        })()
      ]);

      await Promise.all(promises);

      if (isCurrent) {
        setSentTaskStatus(cache);
      }
    };

    void checkSentStatuses();
    return () => {
      isCurrent = false;
    };
  }, [events]);

  useEffect(() => {
    const load = async () => {
      try {
        const [historyPageResult, loadedDrafts, loadedTemplates, loadedSettings] = await Promise.all([
          communicationService.getMessagesPaginated(1, 5),
          communicationService.getDrafts(),
          communicationService.getTemplates(),
          settingsService.getCommunicationSettings(),
        ]);
        setHistory(historyPageResult.items);
        setTotalPages(historyPageResult.totalPages);
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
    
    if (editingTemplate) {
      const currentContent = editingTemplate.content || '';
      const newContent = currentContent.substring(0, selectionStart) + tag + currentContent.substring(selectionEnd);
      setEditingTemplate({ ...editingTemplate, content: newContent });
    } else {
      const newContent = content.substring(0, selectionStart) + tag + content.substring(selectionEnd);
      setContent(newContent);
    }

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
      dialog.showToast('Your message has been saved as a draft.');
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
      globalStatus: (mFilters?.globalStatus as string) || 'Active',
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
      dialog.showToast(`A test email has been sent to ${user.email}.`);
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
      
      if (filters.eventId) {
        const key = filters.rsvp === 'Pending' ? `rsvp-${filters.eventId}` : `reminder-${filters.eventId}`;
        setSentTaskStatus(prev => ({ ...prev, [key]: true }));
      }

      if (historyPage === 1) {
        void refreshHistory(1);
      } else {
        setHistoryPage(1);
      }
      setDrafts(await communicationService.getDrafts());
      setActiveDraftId(null);
      
      dialog.showToast('Message sent successfully!');
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
        dialog.showToast(`Test email successfully sent to ${testEmailAddress}!`);
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
              { id: 'TARGETS', number: '1', label: 'Targets & Template' },
              { id: 'COMPOSE', number: '2', label: 'Compose & Preview' },
              { id: 'REVIEW', number: '3', label: 'Review & Send' }
            ].map((step, idx) => (
              <div key={step.id} className="wizard-step-item">
                <span className={`wizard-step-label ${wizardStep === step.id ? 'active' : 'inactive'}`}>
                  <span className="step-number">{step.number}</span>
                  <span className="step-text">. {step.label}</span>
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
                      <option value="Active">Active</option>
                      <option value="Idle">Idle</option>
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

                <div className="wizard-action-footer">
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
                
                <AppCard 
                  title="Live Preview"
                  actions={
                    <div className="flex-row" style={{ gap: '4px', backgroundColor: 'var(--bg)', padding: '2px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                      <button
                        type="button"
                        className={`btn btn-sm ${previewDevice === 'desktop' ? 'btn-secondary' : 'btn-ghost'}`}
                        style={{ padding: '4px 10px', height: '30px' }}
                        onClick={() => setPreviewDevice('desktop')}
                      >
                        🖥️ Desktop
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${previewDevice === 'mobile' ? 'btn-secondary' : 'btn-ghost'}`}
                        style={{ padding: '4px 10px', height: '30px' }}
                        onClick={() => setPreviewDevice('mobile')}
                      >
                        📱 Mobile
                      </button>
                    </div>
                  }
                >
                  <div 
                    className="email-client-mockup"
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md, 8px)',
                      overflow: 'hidden',
                      backgroundColor: '#f1f5f9',
                      padding: previewDevice === 'mobile' ? '30px 15px' : '0',
                      display: 'flex',
                      justifyContent: 'center',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    <div
                      className={`email-client-frame ${previewDevice === 'mobile' ? 'mobile-frame' : 'desktop-frame'}`}
                      style={{
                        width: '100%',
                        maxWidth: previewDevice === 'mobile' ? '375px' : '100%',
                        backgroundColor: '#ffffff',
                        boxShadow: 'var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1))',
                        borderRadius: previewDevice === 'mobile' ? '20px' : '0',
                        border: previewDevice === 'mobile' ? '8px solid #1e293b' : 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        minHeight: '400px',
                      }}
                    >
                      {/* Email Header */}
                      <div 
                        style={{ 
                          padding: '16px', 
                          borderBottom: '1px solid #e2e8f0', 
                          backgroundColor: '#f8fafc',
                          fontSize: '13px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', color: '#64748b' }}>
                          <span style={{ width: '60px', fontWeight: 600 }}>From:</span>
                          <span style={{ color: '#1e293b' }}>Choir Management &lt;no-reply@choir.management&gt;</span>
                        </div>
                        <div style={{ display: 'flex', color: '#64748b' }}>
                          <span style={{ width: '60px', fontWeight: 600 }}>To:</span>
                          <span style={{ color: '#1e293b' }}>
                            {selectedRecipients[0]?.name 
                              ? `${selectedRecipients[0].name} <${selectedRecipients[0].email}>` 
                              : 'Active Choir Members <singers@yourchoir.org>'}
                          </span>
                        </div>
                        {(messageType === 'Email' || messageType === 'Both') && (
                          <div style={{ display: 'flex', color: '#64748b', marginTop: '4px', borderTop: '1px dashed #e2e8f0', paddingTop: '6px' }}>
                            <span style={{ width: '60px', fontWeight: 600 }}>Subject:</span>
                            <strong style={{ color: '#0f172a' }}>
                              {resolvePreviewContent(subject, events.find(e => e.id === filters.eventId) || null, selectedRecipients[0] || null)}
                            </strong>
                          </div>
                        )}
                      </div>

                      {/* Email Body */}
                      <div 
                        className="email-client-body"
                        style={{ 
                          padding: previewDevice === 'mobile' ? '16px' : '24px', 
                          overflowY: 'auto',
                          flex: 1,
                          fontSize: '15px',
                          lineHeight: '1.6',
                          color: '#334155',
                          wordBreak: 'break-word',
                        }}
                      >
                        <div 
                          className="text-body message-preview-content" 
                          dangerouslySetInnerHTML={{ __html: previewHtml || '<p class="text-muted" style="text-align: center; padding: 40px 0;">No message content drafted yet.</p>' }} 
                        />
                      </div>
                    </div>
                  </div>
                </AppCard>

                <div className="wizard-action-footer flex-responsive" style={{ justifyContent: 'space-between', width: '100%' }}>
                  <button className="btn btn-ghost" onClick={() => setWizardStep('TARGETS')}>← Back to Targets</button>
                  <div className="flex-row wizard-action-subgroup" style={{ gap: 'var(--space-sm)' }}>
                    <button className="btn btn-secondary" onClick={handleSaveDraft} disabled={isSavingDraft}>
                      {isSavingDraft ? 'Saving...' : 'Save Draft'}
                    </button>
                    <button className="btn btn-primary" onClick={() => setWizardStep('REVIEW')}>
                      Next: Review & Send →
                    </button>
                  </div>
                </div>
              </div>
              <PlaceholderPanel 
                onInsert={insertPlaceholder} 
                hasEvent={!!filters.eventId}
                hasApprovedSetList={(() => {
                  const selectedEvent = events.find(e => e.id === filters.eventId);
                  return selectedEvent ? selectedEvent.setListApproved !== false : false;
                })()}
              />
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

                      {!filters.eventId && (() => {
                        const eventPlaceholders = [
                          '{eventTitle}',
                          '{eventType}',
                          '{eventDate}',
                          '{eventLocation}',
                          '{eventDetails}',
                          '{{PLAYER_LINK}}',
                          '{{RSVP_LINKS}}'
                        ];
                        const combinedText = (subject + ' ' + content).toLowerCase();
                        const foundPlaceholders = eventPlaceholders.filter(p => combinedText.includes(p.toLowerCase()));
                        if (foundPlaceholders.length > 0) {
                          return (
                            <div className="checklist-item warning">
                              <span>⚠️</span> <strong>Missing Event Context.</strong> Your message body or subject contains event-specific placeholders: <code>{foundPlaceholders.join(', ')}</code>, but no event context is selected. These placeholders will resolve to blank or default values.
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {filters.eventId && (() => {
                        const selectedEvent = events.find(e => e.id === filters.eventId);
                        const hasApprovedSetList = selectedEvent ? selectedEvent.setListApproved !== false : false;
                        const hasPlayerPlaceholder = content.toLowerCase().includes('{{player_link}}');
                        
                        if (!hasApprovedSetList && hasPlayerPlaceholder) {
                          return (
                            <div className="checklist-item warning">
                              <span>⚠️</span> <strong>Practice Player Not Approved.</strong> Your message body contains the <code>{"{{PLAYER_LINK}}"}</code> placeholder, but the set list for the selected event is not approved for singers. The practice player button will not render.
                            </div>
                          );
                        }
                        return null;
                      })()}

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
                      {commSettings.mailingAddress.includes('123 Choir St') && (messageType === 'Email' || messageType === 'Both') && (
                        <div className="checklist-item warning">
                          <span>⚠️</span> <strong>Default Mailing Address Active:</strong> You are currently using the default mock physical mailing address ("{commSettings.mailingAddress}"). Please update this in Communication Settings for CAN-SPAM legal compliance before sending.
                        </div>
                      )}
                      <div className="checklist-item success">
                        <span>✅</span> Compliance footer will be automatically attached.
                      </div>
                    </div>
                  </div>

                  <div className="wizard-action-footer flex-responsive" style={{ justifyContent: 'space-between', width: '100%', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--border)' }}>
                    <button className="btn btn-ghost" onClick={() => setWizardStep('COMPOSE')}>← Back to Compose</button>
                    <div className="flex-row wizard-action-subgroup" style={{ gap: 'var(--space-sm)' }}>
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
                      const r = await communicationService.resolveRecipients({ eventId: task.event.id, rsvp: task.type === 'RSVP Request' ? 'Pending' : 'All', voiceParts: [], globalStatus: 'Active' });
                      setRecipientPreviewList({ isOpen: true, recipients: r, title: `Expected Recipients for ${task.event.title || task.event.type}` });
                    }}>View Recipients</button>
                    <button className="btn btn-primary btn-sm" disabled={isSending} onClick={async () => {
                      if (task.type === 'Report') {
                        const confirmed = await dialog.confirm({ title: 'Send Report Now?', message: `Generate and send the attendance report for "${task.event.title || task.event.type}" immediately?`, confirmLabel: 'Send Now' });
                        if (confirmed) { 
                          setIsSending(true); 
                          try { 
                            await communicationService.triggerAttendanceReport(task.event.id); 
                            setSentTaskStatus(prev => ({ ...prev, [`report-${task.event.id}`]: true }));
                            if (historyPage === 1) {
                              void refreshHistory(1);
                            } else {
                              setHistoryPage(1);
                            } 
                          } catch (err: unknown) { 
                            const msg = err instanceof Error ? err.message : String(err);
                            await dialog.showMessage({ title: 'Error', message: msg, variant: 'danger' }); 
                          } finally { 
                            setIsSending(false); 
                          } 
                        }
                      } else {
                        const values = { eventTitle: task.event.title || task.event.type, eventType: task.event.type, eventDate: new Date(task.event.date).toLocaleString(), eventLocation: task.event.expand?.venue?.name || 'TBD', eventDetails: task.event.details || '', singerName: '{singerName}', rsvpLinks: '{{RSVP_LINKS}}', playerLink: '{{PLAYER_LINK}}' };
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
        <MessageHistory
          history={history}
          currentPage={historyPage}
          totalPages={totalPages}
          onPageChange={setHistoryPage}
          onViewDetails={setSelectedMessage}
          onCopyDraft={handleResumeDraft}
          events={events}
          commSettings={commSettings}
        />
      )}

      {tab === 'settings' && (
        <div className="flex-col" style={{ gap: 'var(--space-lg)' }}>
          {editingTemplate ? (
            /* Full-Page Template Editor */
            <div className="compose-grid">
              <div className="flex-col" style={{ gap: 'var(--space-lg)' }}>
                <AppCard title={editingTemplate.id ? 'Edit Template' : 'New Template'}>
                  <div className="composer-form">
                    <div className="composer-header-row">
                      <div className="flex-col" style={{ gap: 'var(--space-xs)', flex: 1 }}>
                        <label className="text-label">Template Title</label>
                        <input 
                          className="card" 
                          value={editingTemplate.title || ''} 
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })} 
                          placeholder="e.g. Performance Call Time"
                          style={{ height: '44px', padding: '0 12px' }}
                          required
                        />
                      </div>
                      <div className="composer-channel-field flex-col" style={{ gap: 'var(--space-xs)' }}>
                        <label className="text-label">Channel</label>
                        <select 
                          className="card" 
                          value={editingTemplate.type || 'Email'} 
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, type: e.target.value as MessageType, subject: e.target.value === 'SMS' ? '' : editingTemplate.subject })} 
                          style={{ height: '44px', padding: '0 12px' }}
                        >
                          <option value="Email">Email</option>
                          <option value="SMS">SMS</option>
                          <option value="Both">Both</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                      <label className="text-label">Subject</label>
                      <input 
                        className="card" 
                        value={editingTemplate.subject || ''} 
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })} 
                        placeholder="e.g. Schedule for {eventTitle}"
                        style={{ height: '44px', padding: '0 12px' }}
                        disabled={editingTemplate.type === 'SMS'}
                        required={editingTemplate.type !== 'SMS'}
                      />
                    </div>

                    <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                      <label className="text-label">Template Body (Markdown Supported)</label>
                      <textarea 
                        ref={textAreaRef}
                        className="card composer-textarea" 
                        value={editingTemplate.content || ''} 
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })} 
                        placeholder="Hello {singerName},&#10;&#10;Details: {eventDetails}"
                      />
                    </div>
                  </div>
                </AppCard>

                <AppCard 
                  title="Template Preview"
                  actions={
                    <div className="flex-row" style={{ gap: '4px', backgroundColor: 'var(--bg)', padding: '2px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                      <button type="button" className={`btn btn-sm ${previewDevice === 'desktop' ? 'btn-secondary' : 'btn-ghost'}`} style={{ padding: '4px 10px', height: '30px' }} onClick={() => setPreviewDevice('desktop')}>🖥️ Desktop</button>
                      <button type="button" className={`btn btn-sm ${previewDevice === 'mobile' ? 'btn-secondary' : 'btn-ghost'}`} style={{ padding: '4px 10px', height: '30px' }} onClick={() => setPreviewDevice('mobile')}>📱 Mobile</button>
                    </div>
                  }
                >
                  <div className="email-client-mockup" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md, 8px)', overflow: 'hidden', backgroundColor: '#f1f5f9', padding: previewDevice === 'mobile' ? '30px 15px' : '0', display: 'flex', justifyContent: 'center', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                    <div className={`email-client-frame ${previewDevice === 'mobile' ? 'mobile-frame' : 'desktop-frame'}`} style={{ width: '100%', maxWidth: previewDevice === 'mobile' ? '375px' : '100%', backgroundColor: '#ffffff', boxShadow: 'var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1))', borderRadius: previewDevice === 'mobile' ? '20px' : '0', border: previewDevice === 'mobile' ? '8px solid #1e293b' : 'none', display: 'flex', flexDirection: 'column', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', minHeight: '400px' }}>
                      <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', color: '#64748b' }}><span style={{ width: '60px', fontWeight: 600 }}>From:</span><span style={{ color: '#1e293b' }}>Choir Management &lt;no-reply@choir.management&gt;</span></div>
                        <div style={{ display: 'flex', color: '#64748b' }}><span style={{ width: '60px', fontWeight: 600 }}>Subject:</span><strong style={{ color: '#0f172a' }}>{resolvePreviewContent(editingTemplate.subject || '', null, null)}</strong></div>
                      </div>
                      <div className="email-client-body" style={{ padding: previewDevice === 'mobile' ? '16px' : '24px', overflowY: 'auto', flex: 1, fontSize: '15px', lineHeight: '1.6', color: '#334155', wordBreak: 'break-word' }}>
                        <div className="text-body message-preview-content" dangerouslySetInnerHTML={{ __html: previewHtml || '<p class="text-muted" style="text-align: center; padding: 40px 0;">No template content yet.</p>' }} />
                      </div>
                    </div>
                  </div>
                </AppCard>

                <div className="flex-row" style={{ justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setEditingTemplate(null)}>Cancel</button>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={async () => {
                      if (!editingTemplate.title || !editingTemplate.content) {
                        dialog.showToast('Title and content are required.');
                        return;
                      }
                      try {
                        await communicationService.saveTemplate(editingTemplate);
                        setTemplates(await communicationService.getTemplates());
                        setEditingTemplate(null);
                        dialog.showToast('Template saved successfully.');
                      } catch (err: unknown) {
                        const msg = err instanceof Error ? err.message : String(err);
                        await dialog.showMessage({ title: 'Error', message: 'Failed to save template: ' + msg, variant: 'danger' });
                      }
                    }}
                  >
                    Save Template
                  </button>
                </div>
              </div>
              <PlaceholderPanel onInsert={insertPlaceholder} />
            </div>
          ) : (
            <>
              <AppCard title="Application & Footer Compliance">
                <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
                  <SettingsGrid>
                    <Field label="Physical Mailing Address" value={commSettings.mailingAddress} onChange={(v) => setCommSettings({ ...commSettings, mailingAddress: v })} />
                    <Field label="Application Base URL" value={commSettings.frontendUrl} onChange={(v) => setCommSettings({ ...commSettings, frontendUrl: v })} />
                  </SettingsGrid>
                  <div className="text-muted text-xs">Note: These values are used for legal compliance (footer) and link generation.</div>
                </div>
              </AppCard>

              <AppCard 
                title="Message Templates"
                actions={
                  <button 
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ height: '32px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => setEditingTemplate({ title: '', subject: '', content: '', type: 'Email', isSystemTemplate: false })}
                  >
                    ➕ Add Custom Template
                  </button>
                }
              >
                <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
                  <p className="text-muted text-sm" style={{ margin: 0 }}>
                    Manage message templates. Custom templates can be added, edited, or deleted. System-defined templates cannot be deleted.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {templates.map(tpl => (
                      <div 
                        key={tpl.id} 
                        className="card flex-responsive" 
                        style={{ 
                          padding: 'var(--space-sm) var(--space-md)', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          boxShadow: 'none', 
                          border: '1px solid var(--border)', 
                          margin: 0 
                        }}
                      >
                        <div className="flex-col" style={{ gap: '2px' }}>
                          <div className="flex-row" style={{ gap: '6px', alignItems: 'center' }}>
                            <strong style={{ fontSize: '0.95rem' }}>{tpl.title}</strong>
                            <span className="badge badge-rehearsal" style={{ fontSize: '10px', padding: '2px 6px' }}>{tpl.type}</span>
                            {tpl.isSystemTemplate && <span className="badge badge-concert" style={{ fontSize: '10px', padding: '2px 6px', opacity: 0.8 }}>System</span>}
                          </div>
                          <span className="text-muted text-xs" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '350px' }}>
                            {tpl.subject ? `Subject: ${tpl.subject}` : 'No Subject'} • {tpl.content.substring(0, 60)}...
                          </span>
                        </div>
                        <div className="flex-row" style={{ gap: '6px' }}>
                          <button 
                            type="button" 
                            className="btn btn-ghost btn-sm" 
                            onClick={() => setEditingTemplate(tpl)}
                          >
                            Edit
                          </button>
                          {!tpl.isSystemTemplate && (
                            <button 
                              type="button" 
                              className="btn btn-ghost btn-sm" 
                              style={{ color: '#ef4444' }}
                              onClick={async () => {
                                if (await dialog.confirm({ title: 'Delete Template', message: `Are you sure you want to delete the template "${tpl.title}"?`, variant: 'danger' })) {
                                  try {
                                    await communicationService.deleteTemplate(tpl.id!);
                                    setTemplates(await communicationService.getTemplates());
                                  } catch (e: unknown) {
                                    const msg = e instanceof Error ? e.message : String(e);
                                    await dialog.showMessage({ title: 'Error', message: 'Failed to delete template: ' + msg, variant: 'danger' });
                                  }
                                }
                              }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {templates.length === 0 && <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No templates found.</div>}
                  </div>
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
                      dialog.showToast('Settings updated successfully.'); 
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
            </>
          )}
        </div>
      )}

      <BaseModal isOpen={!!selectedMessage} onClose={() => setSelectedMessage(null)} title="Message Details" maxWidth="600px">
        {selectedMessage && (
          <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
            <div className="flex-col" style={{ gap: '2px' }}>
              <label className="text-label text-muted">Subject</label>
              <strong>
                {(() => {
                  const mFilters = selectedMessage.filters as Record<string, unknown>;
                  const eventId = mFilters?.eventId as string | undefined;
                  const linkedEvent = events.find(e => e.id === eventId) || null;
                  return resolvePreviewContent(
                    selectedMessage.subject || '(SMS)',
                    linkedEvent,
                    null,
                    commSettings.mailingAddress
                  );
                })()}
              </strong>
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
