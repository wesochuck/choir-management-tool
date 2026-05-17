import { useEffect, useMemo, useState } from 'react';
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
  type CommunicationSettings,
} from '../../services/settingsService';

type Tab = 'compose' | 'history' | 'settings';

const DEFAULT_FILTERS: CommunicationFilters = {
  eventId: '',
  rsvp: 'All',
  voicePart: '',
  globalStatus: 'Active (Current)',
};

const DEFAULT_CONFIG = communicationService.defaultConfig;

export default function CommunicationView() {
  const dialog = useDialog();
  const [tab, setTab] = useState<Tab>('compose');
  const [events, setEvents] = useState<Event[]>([]);
  const [filters, setFilters] = useState<CommunicationFilters>(DEFAULT_FILTERS);
  const [recipients, setRecipients] = useState<CommunicationRecipient[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
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

  const selectedRecipients = useMemo(
    () => recipients.filter((recipient) => selectedIds.has(recipient.id)),
    [recipients, selectedIds],
  );

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
      setSubject((current) => current || loadedTemplates.emailSubject);
      setContent((current) => current || loadedTemplates.emailBody);
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
  }, [dialog]);

  useEffect(() => {
    let isCurrent = true;
    setIsResolving(true);
    communicationService.resolveRecipients(filters)
      .then((resolved) => {
        if (!isCurrent) return;
        setRecipients(resolved);
        setSelectedIds(new Set(resolved.map((recipient) => recipient.id)));
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
        filters,
      });
      setDeliveryLinks({ mailtoUrl: result.mailtoUrl, smsUrl: result.smsUrl });
      setHistory(await communicationService.getMessages());

      if ((messageType === 'Email' || messageType === 'Both') && result.mailtoUrl) {
        window.location.assign(result.mailtoUrl);
      } else if (messageType === 'SMS' && result.smsUrl) {
        window.location.assign(result.smsUrl);
      }
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
    setFilters(message.filters || DEFAULT_FILTERS);
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
          {(['compose', 'history', 'settings'] as Tab[]).map((item) => (
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

              <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                <label className="text-label">Voice Part</label>
                <select className="card" value={filters.voicePart} onChange={(event) => updateFilter('voicePart', event.target.value)} style={{ height: '44px', padding: '0 12px' }}>
                  <option value="">All Voice Parts</option>
                  {communicationService.voiceParts.map((part) => <option key={part} value={part}>{part}</option>)}
                </select>
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
          {history.map((message) => (
            <div key={message.id} className="flex-responsive" style={{ padding: 'var(--space-lg)', borderBottom: '1px solid var(--border)', justifyContent: 'space-between' }}>
              <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                <div className="flex-row" style={{ gap: 'var(--space-sm)' }}>
                  <span className="badge badge-rehearsal">{message.type}</span>
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
          ))}
          {history.length === 0 && (
            <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
              <p className="text-muted">No messages logged yet.</p>
            </div>
          )}
        </AppCard>
      )}

      {tab === 'settings' && (
        <div className="flex-col" style={{ gap: 'var(--space-lg)' }}>
          <AppCard title="Delivery Mechanisms">
            <div className="text-muted text-sm">
              Note: Automated SMS and email delivery are handled securely on the server side via PocketBase integrations. Communication config credentials should be configured using PocketBase environments or secure hooks directly on the server. We intentionally use client-side mailto: and sms: links here so the browser doesn't have to hold delivery secrets.
            </div>
          </AppCard>

          <AppCard title="Templates">
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
