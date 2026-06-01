import React, { useState, useRef, useEffect } from 'react';
import { AppCard } from '../../../components/common/AppCard';
import { WizardStepper } from '../../../components/WizardStepper';
import { TemplateGrid } from '../../../components/TemplateGrid';
import { ComposeStep } from '../../../components/ComposeStep';
import { LivePreview } from '../../../components/LivePreview';
import { PlaceholderPanel } from '../../../components/admin/PlaceholderPanel';
import type {
  CommunicationFilters,
  CommunicationRecipient,
  MessageType,
  TemplateRecord,
} from '../../../services/communicationService';
import type { Event } from '../../../services/eventService';
import type { SectionDef, CommunicationSettings } from '../../../services/settingsService';
import type { WizardStep } from './types';
import { mapToMessageTemplate } from './templateMapping';
import { resolvePreviewContent } from '../../../lib/communicationUtils';
import type { ValidationWarning } from '../../../components/ComposeStep';

interface ComposePanelProps {
  wizardStep: WizardStep;
  setWizardStep: (step: WizardStep) => void;

  filters: CommunicationFilters;
  updateFilter: <K extends keyof CommunicationFilters>(
    key: K,
    value: CommunicationFilters[K]
  ) => void;

  recipients: CommunicationRecipient[];
  selectedRecipients: CommunicationRecipient[];
  recipientCounts: { total: number; hasEmail: number; hasPhone: number };

  subject: string;
  setSubject: (value: string) => void;
  content: string;
  setContent: (value: string) => void;
  messageType: MessageType;
  setMessageType: (value: MessageType) => void;

  warnings: ValidationWarning[];

  previewHtml: string;
  renderedSubject: string;
  renderedSmsBody: string;
  previewRecipient: CommunicationRecipient | null;

  events: Event[];
  voicePartLabels: string[];
  configSections: SectionDef[];
  commSettings: CommunicationSettings;
  templates: TemplateRecord[];
  setTab: (tab: import('../../../types/Communication').CommunicationTab) => void;
  setEditingTemplate: React.Dispatch<React.SetStateAction<Partial<TemplateRecord> | null>>;

  isSending: boolean;
  isSendingTest: boolean;
  isSavingDraft: boolean;

  handleSaveDraft: () => Promise<void>;
  handleSendTest: () => Promise<void>;
  sendMessage: () => Promise<void>;
  onInsertPlaceholder: (tag: string) => void;

  textAreaRef: React.RefObject<HTMLTextAreaElement | null>;
  onViewRecipients: (recipients: CommunicationRecipient[], title: string) => void;
  user: import('../../../types/auth').ChoirUser | null;
}

export function ComposePanel({
  wizardStep,
  setWizardStep,
  filters,
  updateFilter,
  recipients,
  selectedRecipients,
  recipientCounts,
  subject,
  setSubject,
  content,
  setContent,
  messageType,
  setMessageType,
  warnings,
  previewHtml,
  renderedSubject,
  renderedSmsBody,
  previewRecipient,
  events,
  voicePartLabels,
  configSections,
  commSettings,
  templates,
  setTab,
  setEditingTemplate,
  isSending,
  isSendingTest,
  isSavingDraft,
  handleSaveDraft,
  handleSendTest,
  sendMessage,
  onInsertPlaceholder,
  textAreaRef,
  onViewRecipients,
  user,
}: ComposePanelProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleVoicePartToggle = (token: string) => {
    const active = filters.voiceParts || [];
    const next = active.includes(token) ? active.filter((p) => p !== token) : [...active, token];
    updateFilter('voiceParts', next);
  };

  const handleEventContextChange = (eventId: string) => {
    updateFilter('eventId', eventId);
    if (!eventId && filters.rsvp !== 'All') {
      updateFilter('rsvp', 'All');
    }
  };

  const selectedEvent = events.find((e) => e.id === filters.eventId) || null;

  return (
    <div className="flex-col" style={{ gap: 'var(--space-lg)' }}>
      <WizardStepper
        steps={[
          { number: 1, id: 'TARGETS', label: 'Recipients', isValid: true },
          { number: 2, id: 'COMPOSE', label: 'Compose & Preview', isValid: true },
          {
            number: 3,
            id: 'REVIEW',
            label: 'Review & Send',
            isValid: selectedRecipients.length > 0,
          },
        ]}
        currentStep={wizardStep === 'TARGETS' ? 1 : wizardStep === 'COMPOSE' ? 2 : 3}
        onStepClick={(num) => {
          if (num === 1) setWizardStep('TARGETS');
          if (num === 2) setWizardStep('COMPOSE');
          if (num === 3) setWizardStep('REVIEW');
        }}
      />

      {wizardStep === 'TARGETS' && (
        <div className="targets-grid">
          <AppCard
            title="Recipients"
            actions={
              <span
                className="badge"
                style={{
                  backgroundColor: 'var(--primary-light)',
                  color: 'var(--primary-deep)',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  padding: '4px 8px',
                  borderRadius: '12px',
                }}
              >
                {recipientCounts.total} Matched
              </span>
            }
          >
            <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
              <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                <label className="text-label">Event Context</label>
                <select
                  className="card"
                  value={filters.eventId}
                  onChange={(event) => handleEventContextChange(event.target.value)}
                  style={{ height: '44px', padding: '0 12px' }}
                >
                  <option value="">No Specific Event</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title || event.expand?.venue?.name || ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                <label className="text-label">RSVP Status</label>
                <select
                  className="card"
                  value={filters.rsvp}
                  onChange={(event) =>
                    updateFilter('rsvp', event.target.value as CommunicationFilters['rsvp'])
                  }
                  style={{ height: '44px', padding: '0 12px' }}
                  disabled={!filters.eventId}
                >
                  <option value="All">All Members</option>
                  <option value="Yes">Attending Only</option>
                  <option value="No">Declined Only</option>
                  <option value="Pending">No Response (Pending)</option>
                </select>
                {!filters.eventId && (
                  <span className="text-muted text-xs">
                    Select an event first to filter by RSVP status.
                  </span>
                )}
              </div>

              <div className="flex-col" style={{ gap: 'var(--space-xs)' }}>
                <label className="text-label">Global Status</label>
                <select
                  className="card"
                  value={filters.globalStatus}
                  onChange={(event) => updateFilter('globalStatus', event.target.value)}
                  style={{ height: '44px', padding: '0 12px' }}
                >
                  <option value="Active">Active</option>
                  <option value="Idle">Idle</option>
                  <option value="Inactive">Inactive</option>
                  <option value="">All Statuses</option>
                </select>
              </div>

              <div
                className="flex-col"
                style={{ gap: 'var(--space-xs)', position: 'relative' }}
                ref={dropdownRef}
              >
                <label className="text-label">Voice Part / Section</label>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="card voice-part-dropdown-trigger flex-row"
                >
                  <span
                    className={`dropdown-item-text ${
                      (filters.voiceParts || []).length > 0 ? 'selected' : ''
                    }`}
                  >
                    {filters.voiceParts.length === 0
                      ? 'All Voice Parts'
                      : `${filters.voiceParts.length} selected`}
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
                      color: 'var(--text-muted)',
                    }}
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                {isDropdownOpen && (
                  <div className="card voice-part-dropdown-panel shadow-lg">
                    <div className="dropdown-section-header">Sections</div>
                    {configSections.map((sec) => (
                      <label key={sec.code} className="dropdown-item-label">
                        <input
                          type="checkbox"
                          checked={filters.voiceParts.includes(sec.code)}
                          onChange={() => handleVoicePartToggle(sec.code)}
                          style={{
                            accentColor: 'var(--primary)',
                            width: '15px',
                            height: '15px',
                          }}
                        />
                        <span className={filters.voiceParts.includes(sec.code) ? 'selected' : ''}>
                          {sec.name}
                        </span>
                      </label>
                    ))}
                    <div
                      style={{
                        height: '1px',
                        backgroundColor: 'var(--border)',
                        margin: '4px 0',
                      }}
                    ></div>
                    <div className="dropdown-section-header">Individual Parts</div>
                    {voicePartLabels.map((part) => (
                      <label key={part} className="dropdown-item-label">
                        <input
                          type="checkbox"
                          checked={filters.voiceParts.includes(part)}
                          onChange={() => handleVoicePartToggle(part)}
                          style={{
                            accentColor: 'var(--primary)',
                            width: '15px',
                            height: '15px',
                          }}
                        />
                        <span className={filters.voiceParts.includes(part) ? 'selected' : ''}>
                          {part}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div
                style={{
                  marginTop: 'var(--space-xs)',
                  padding: '12px',
                  backgroundColor: 'var(--bg)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  fontSize: '0.85rem',
                  color: 'var(--text-muted)',
                }}
                className="flex-col"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span>Matched Singers:</span>
                  <strong style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>
                    {recipientCounts.total}
                  </strong>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem',
                    borderTop: '1px dashed var(--border)',
                    paddingTop: '6px',
                  }}
                >
                  <span>
                    Email Reach: <strong>{recipientCounts.hasEmail}</strong>
                  </span>
                  <span>
                    SMS Reach: <strong>{recipientCounts.hasPhone}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ alignSelf: 'flex-end', marginTop: '8px' }}
                  disabled={recipients.length === 0}
                  onClick={() => onViewRecipients(recipients, 'Matched Singers')}
                >
                  View Matched Singers
                </button>
              </div>
            </div>
          </AppCard>

          <div className="flex-col" style={{ gap: 'var(--space-lg)' }}>
            <AppCard title="Templates & Quick Starts">
              <div className="flex-col" style={{ gap: 'var(--space-md)' }}>
                <p className="text-muted text-sm">
                  Select a template to pre-fill your message, or start with a blank canvas.
                </p>
                <TemplateGrid
                  templates={templates.map(mapToMessageTemplate)}
                  onSelect={(tpl) => {
                    setSubject(tpl.subjectLine || '');
                    setContent(tpl.content || '');
                    setMessageType(
                      tpl.channel === 'sms' ? 'SMS' : tpl.channel === 'both' ? 'Both' : 'Email'
                    );
                    setWizardStep('COMPOSE');
                  }}
                />
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
              <ComposeStep
                subject={subject}
                onSubjectChange={setSubject}
                messageType={messageType}
                onMessageTypeChange={setMessageType}
                content={content}
                onContentChange={setContent}
                textAreaRef={textAreaRef}
                warnings={warnings}
              />
            </AppCard>

            <AppCard noPadding>
              <div style={{ padding: '24px' }}>
                <LivePreview
                  channel={messageType}
                  subject={resolvePreviewContent(subject, selectedEvent, previewRecipient)}
                  bodyHtml={previewHtml}
                  smsBody={resolvePreviewContent(content, selectedEvent, previewRecipient)}
                  recipientName={previewRecipient?.name}
                  recipientEmail={previewRecipient?.email}
                />
              </div>
            </AppCard>

            <div
              className="wizard-action-footer flex-responsive"
              style={{ justifyContent: 'space-between', width: '100%' }}
            >
              <button className="btn btn-ghost" onClick={() => setWizardStep('TARGETS')}>
                ← Back to Recipients
              </button>
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
            onInsert={onInsertPlaceholder}
            hasEvent={!!filters.eventId}
            hasApprovedSetList={(() => {
              return selectedEvent ? selectedEvent.setListApproved !== false : false;
            })()}
          />
        </div>
      )}

      {wizardStep === 'REVIEW' && (
        <div className="review-send-grid">
          {/* Left Column: Unified Live Preview */}
          <div className="review-preview-section">
            <AppCard noPadding>
              <div style={{ padding: '24px' }}>
                <LivePreview
                  channel={messageType}
                  subject={renderedSubject}
                  bodyHtml={previewHtml}
                  smsBody={renderedSmsBody}
                  recipientName={previewRecipient?.name}
                  recipientEmail={previewRecipient?.email}
                />
              </div>
            </AppCard>
          </div>

          {/* Right Column: Sidebar Stack */}
          <aside className="review-side-stack">
            {/* Card 1: Recipient summary */}
            <AppCard
              title="Recipient Summary"
              actions={
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{
                    padding: '4px 10px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  disabled={selectedRecipients.length === 0}
                  onClick={() => onViewRecipients(selectedRecipients, 'Recipients Selected for Send')}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    style={{ width: '14px', height: '14px' }}
                  >
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                  View List
                </button>
              }
            >
              <div className="review-metric-grid">
                <button
                  type="button"
                  className="review-metric-tile total"
                  disabled={selectedRecipients.length === 0}
                  onClick={() => onViewRecipients(selectedRecipients, 'Recipient List (Total Audience)')}
                >
                  <div className="metric-tile-header">
                    <svg
                      className="metric-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span className="metric-tile-label">Total Audience</span>
                  </div>
                  <strong className="metric-tile-val">{recipientCounts.total}</strong>
                  <span className="metric-tile-desc">matched singers</span>
                </button>

                <button
                  type="button"
                  className="review-metric-tile email"
                  disabled={selectedRecipients.filter((r) => r.email?.trim()).length === 0}
                  onClick={() =>
                    onViewRecipients(
                      selectedRecipients.filter((r) => r.email?.trim()),
                      'Recipient List (Via Email)'
                    )
                  }
                >
                  <div className="metric-tile-header">
                    <svg
                      className="metric-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <span className="metric-tile-label">Via Email</span>
                  </div>
                  <strong className="metric-tile-val">{recipientCounts.hasEmail}</strong>
                  <span className="metric-tile-desc">receive email</span>
                </button>

                <button
                  type="button"
                  className="review-metric-tile sms"
                  disabled={selectedRecipients.filter((r) => r.phone?.trim()).length === 0}
                  onClick={() =>
                    onViewRecipients(
                      selectedRecipients.filter((r) => r.phone?.trim()),
                      'Recipient List (Via SMS)'
                    )
                  }
                >
                  <div className="metric-tile-header">
                    <svg
                      className="metric-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                      <line x1="12" y1="18" x2="12.01" y2="18" />
                    </svg>
                    <span className="metric-tile-label">Via SMS</span>
                  </div>
                  <strong className="metric-tile-val">{recipientCounts.hasPhone}</strong>
                  <span className="metric-tile-desc">receive SMS text</span>
                </button>
              </div>
            </AppCard>

            {/* Card 2: Pre-flight checklist */}
            <AppCard title="Pre-Flight Checklist">
              <div className="review-checklist-list">
                {subject === '' && (messageType === 'Email' || messageType === 'Both') && (
                  <div className="review-checklist-item warning">
                    <svg
                      className="checklist-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span>
                      <strong>Subject is empty.</strong> Add a subject line for better open rates.
                    </span>
                  </div>
                )}
                {content.length < 10 && (
                  <div className="review-checklist-item warning">
                    <svg
                      className="checklist-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span>
                      <strong>Very short message body.</strong>
                    </span>
                  </div>
                )}
                {selectedRecipients.length === 0 && (
                  <div className="review-checklist-item warning">
                    <svg
                      className="checklist-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span>
                      <strong>No recipients selected.</strong>
                    </span>
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
                    '{{RSVP_LINKS}}',
                  ];

                  const combinedText = (subject + ' ' + content).toLowerCase();
                  const foundPlaceholders = eventPlaceholders.filter((p) =>
                    combinedText.includes(p.toLowerCase())
                  );

                  if (foundPlaceholders.length > 0) {
                    return (
                      <div className="review-checklist-item warning">
                        <svg
                          className="checklist-icon"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <span>
                          <strong>No event selected</strong> but active event placeholders exist:{' '}
                          <code>{foundPlaceholders.join(', ')}</code>.
                        </span>
                      </div>
                    );
                  }

                  return null;
                })()}

                {filters.eventId && (() => {
                  const hasApprovedSetList = selectedEvent
                    ? selectedEvent.setListApproved !== false
                    : false;
                  const hasPlayerPlaceholder = content.toLowerCase().includes('{{player_link}}');

                  if (!hasApprovedSetList && hasPlayerPlaceholder) {
                    return (
                      <div className="review-checklist-item warning">
                        <svg
                          className="checklist-icon"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <span>
                          <strong>Practice player not approved.</strong> Set list is unapproved;{' '}
                          <code>{'{{PLAYER_LINK}}'}</code> button will not render.
                        </span>
                      </div>
                    );
                  }

                  return null;
                })()}

                {selectedRecipients.some((r) => !r.email) && (messageType === 'Email' || messageType === 'Both') && (
                  <div className="review-checklist-item info">
                    <svg
                      className="checklist-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <span>
                      <strong>{selectedRecipients.filter((r) => !r.email).length} singers</strong> have
                      no email configured and will skip this channel.
                    </span>
                  </div>
                )}

                {selectedRecipients.some((r) => !r.phone) && (messageType === 'SMS' || messageType === 'Both') && (
                  <div className="review-checklist-item info">
                    <svg
                      className="checklist-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <span>
                      <strong>{selectedRecipients.filter((r) => !r.phone).length} singers</strong> have
                      no phone configured and will skip this channel.
                    </span>
                  </div>
                )}

                {commSettings.mailingAddress.includes('123 Choir St') && (messageType === 'Email' || messageType === 'Both') && (
                  <div className="review-checklist-item warning">
                    <svg
                      className="checklist-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span>
                      <strong>Default physical address active.</strong> Please{' '}
                      <button
                        type="button"
                        className="review-inline-link"
                        onClick={() => {
                          setTab('settings');
                          setEditingTemplate(null);
                        }}
                      >
                        update this in settings
                      </button>{' '}
                      for CAN-SPAM legal compliance.
                    </span>
                  </div>
                )}

                <div className="review-checklist-item success">
                  <svg
                    className="checklist-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <span>Compliance footer will be attached.</span>
                </div>
              </div>
            </AppCard>

            {/* Card 3: Sending Actions */}
            <AppCard title="Sending Actions">
              <div className="review-action-row">
                <button
                  type="button"
                  className="review-btn-action back"
                  onClick={() => setWizardStep('COMPOSE')}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  Back
                </button>

                <button
                  type="button"
                  className="review-btn-action test"
                  onClick={handleSendTest}
                  disabled={isSendingTest || isSending}
                  title={`Send email test to ${user?.email || 'your email'}`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                  {isSendingTest ? 'Sending test...' : 'Send Test to Me'}
                </button>

                <button
                  type="button"
                  className="review-btn-action primary"
                  onClick={sendMessage}
                  disabled={isSending || selectedRecipients.length === 0}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  {isSending ? 'Sending...' : `Send to ${selectedRecipients.length} Singers`}
                </button>
              </div>
            </AppCard>
          </aside>
        </div>
      )}
    </div>
  );
}
