import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import EasyMDE from 'easymde';
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
import type { ValidationWarning } from '../../../utils/communicationValidation';

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

  editorRef: React.MutableRefObject<EasyMDE | null>;
  onViewRecipients: (recipients: CommunicationRecipient[], title: string) => void;
  user: import('../../../types/auth').ChoirUser | null;
  choirName: string;
  senderEmail: string;
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
  editorRef,
  onViewRecipients,
  user,
  choirName,
  senderEmail,
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

  const renderSetlistWarning = () => {
    if (!filters.eventId) return null;
    const hasApprovedSetList = selectedEvent
      ? selectedEvent.setListApproved !== false
      : false;
    if (hasApprovedSetList) return null;
    if (!content.toLowerCase().includes('{setlist}')) return null;
    return (
      <div className="flex items-start gap-3 w-full rounded-lg p-3 text-xs leading-normal border border-amber-100 border-l-4 border-l-amber-600 transition-transform duration-200 hover:translate-x-0.5 bg-amber-50 text-amber-900">
        <svg
          className="flex-shrink-0 w-4 h-4 mt-0.5"
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
          <strong>Set list not approved.</strong> The set list hasn't been approved for singers yet.{' '}
          <Link to="/admin/setlists" className="underline font-semibold cursor-pointer text-primary hover:text-primary-deep">Open Set List Builder</Link>{' '}
          to approve it before sending.
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <WizardStepper
        steps={[
          { number: 1, id: 'TARGETS', label: 'Recipients', isValid: true },
          { number: 2, id: 'COMPOSE', label: 'Compose', isValid: true },
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
        <div className="flex flex-col gap-4">
          <div className="flex items-center w-full gap-2 pb-2.5 border-b border-border max-md:flex-col justify-end">
            <button className="btn btn-primary" onClick={() => setWizardStep('COMPOSE')}>
              Next: Compose Message →
            </button>
          </div>
          <div className="flex flex-col lg:grid lg:grid-cols-[360px_1fr] gap-6 items-start">
          <AppCard
            title="Recipients"
            actions={
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-primary-light text-primary-deep"
              >
                {recipientCounts.total} Matched
              </span>
            }
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-label">Event Context</label>
                <select
                  className="card"
                  value={filters.eventId}
                  onChange={(event) => handleEventContextChange(event.target.value)}
                >
                  <option value="">No Specific Event</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title || event.expand?.venue?.name || ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label">RSVP Status</label>
                <select
                  className="card"
                  value={filters.rsvp}
                  onChange={(event) =>
                    updateFilter('rsvp', event.target.value as CommunicationFilters['rsvp'])
                  }
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

              <div className="flex flex-col gap-1">
                <label className="text-label">Global Status</label>
                <select
                  className="card"
                  value={filters.globalStatus}
                  onChange={(event) => updateFilter('globalStatus', event.target.value)}
                >
                  <option value="Active">Active</option>
                  <option value="Idle">Idle</option>
                  <option value="Inactive">Inactive</option>
                  <option value="">All Statuses</option>
                </select>
              </div>

              <div
                className="flex flex-col gap-1 relative"
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
                    // @allow-inline-style - dynamic rotation based on dropdown state
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
                          className="mr-2"
                        />
                        <span className={filters.voiceParts.includes(sec.code) ? 'selected' : ''}>
                          {sec.name}
                        </span>
                      </label>
                    ))}
                    <div className="border-t border-border my-2"></div>
                    <div className="dropdown-section-header">Individual Parts</div>
                    {voicePartLabels.map((part) => (
                      <label key={part} className="dropdown-item-label">
                        <input
                          type="checkbox"
                          checked={filters.voiceParts.includes(part)}
                          onChange={() => handleVoicePartToggle(part)}
                          className="mr-2"
                        />
                        <span className={filters.voiceParts.includes(part) ? 'selected' : ''}>
                          {part}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 p-4 bg-primary-light rounded-lg">
                <div className="flex justify-between">
                  <span>Matched Singers:</span>
                  <strong>
                    {recipientCounts.total}
                  </strong>
                </div>
                <div className="flex justify-end gap-2 mt-2">
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
                  disabled={recipients.length === 0}
                  onClick={() => onViewRecipients(recipients, 'Matched Singers')}
                >
                  View Matched Singers
                </button>
              </div>
            </div>
          </AppCard>

          <div className="flex flex-col gap-4">
            <AppCard title="Templates & Quick Starts">
              <div className="flex flex-col gap-4">
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

            <div className="sticky bottom-0 left-0 right-0 bg-surface border-t border-border p-3 -mx-4 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex gap-2 items-center lg:static lg:bg-transparent lg:border-t-0 lg:p-0 lg:mx-0 lg:shadow-none lg:justify-end lg:w-full">
              <button className="btn btn-primary" onClick={() => setWizardStep('COMPOSE')}>
                Next: Compose Message →
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {wizardStep === 'COMPOSE' && (
        <div className="flex flex-col gap-4">
          <div
            className="flex items-center w-full gap-2 pb-2.5 border-b border-border flex-col md:flex-row justify-between w-full"
          >
            <button className="btn btn-ghost" onClick={() => setWizardStep('TARGETS')}>
              ← Back to Recipients
            </button>
            <div className="flex flex-row items-center gap-2 flex-wrap flex-2 lg:flex-none">
              <button className="btn btn-secondary" onClick={handleSaveDraft} disabled={isSavingDraft}>
                {isSavingDraft ? 'Saving...' : 'Save Draft'}
              </button>
              <button className="btn btn-primary" onClick={() => setWizardStep('REVIEW')}>
                Next: Review & Send →
              </button>
            </div>
          </div>
          <div className="flex flex-col lg:grid lg:grid-cols-[1fr_300px] gap-6 items-start">
            <div className="flex flex-col gap-4">
              <AppCard title="Composer">
                <ComposeStep
                  subject={subject}
                  onSubjectChange={setSubject}
                  messageType={messageType}
                  onMessageTypeChange={setMessageType}
                  content={content}
                  onContentChange={setContent}
                  editorRef={editorRef}
                  warnings={warnings}
                />
              </AppCard>

              <div
                className="sticky bottom-0 left-0 right-0 bg-surface border-t border-border p-3 -mx-4 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex gap-2 items-center lg:static lg:bg-transparent lg:border-t-0 lg:p-0 lg:mx-0 lg:shadow-none flex-col md:flex-row justify-between w-full"
              >
                <button className="btn btn-ghost" onClick={() => setWizardStep('TARGETS')}>
                  ← Back to Recipients
                </button>
                <div className="flex flex-row items-center gap-2 flex-wrap flex-2 lg:flex-none">
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
              hasCallTime={!!selectedEvent?.callTime?.trim()}
            />
            {renderSetlistWarning()}
          </div>
      </div>
      )}

      {wizardStep === 'REVIEW' && (
        <div className="flex flex-col gap-4">
          <div
            className="flex items-center w-full gap-2 pb-2.5 border-b border-border flex-col md:flex-row justify-between w-full"
          >
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border font-semibold px-4.5 py-2.5 cursor-pointer min-h-11 whitespace-nowrap transition-all duration-200 text-sm active:scale-97 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none bg-white text-text hover:bg-slate-50 hover:border-text-muted [&_svg]:hover:-translate-x-0.5"
              onClick={() => setWizardStep('COMPOSE')}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="inline-flex mr-1 w-4 h-4 transition-transform duration-200"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back
            </button>
            <div className="flex flex-row items-center gap-2 flex-wrap">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border font-semibold px-4.5 py-2.5 cursor-pointer min-h-11 whitespace-nowrap transition-all duration-200 text-sm active:scale-97 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none bg-white text-text hover:bg-slate-50 hover:border-primary hover:text-primary-deep [&_svg]:hover:rotate-12"
                onClick={handleSendTest}
                disabled={isSendingTest || isSending}
                title={`Send email test to ${user?.email || 'your email'}`}
              >
                {isSendingTest ? 'Sending test...' : 'Send Test to Me'}
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-lg border font-semibold px-4.5 py-2.5 cursor-pointer min-h-11 whitespace-nowrap transition-all duration-200 text-sm active:scale-97 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none bg-primary border-primary text-white shadow-[0_2px_4px_rgba(74,124,89,0.15)] hover:bg-primary-deep hover:border-primary-deep hover:-translate-y-0.5 hover:shadow-[0_4px_6px_rgba(74,124,89,0.25)] [&_svg]:hover:translate-x-0.5 [&_svg]:hover:-translate-y-0.5"
                onClick={sendMessage}
                disabled={isSending || selectedRecipients.length === 0}
              >
                {isSending ? 'Sending...' : `Send to ${selectedRecipients.length} Singers`}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-6 items-start">
          {/* Left Column: Unified Live Preview */}
          <div className="flex flex-col">
            <AppCard noPadding>
              <div className="p-4">
                <LivePreview
                  channel={messageType}
                  subject={renderedSubject}
                  bodyHtml={previewHtml}
                  smsBody={renderedSmsBody}
                  recipientName={previewRecipient?.name}
                  recipientEmail={previewRecipient?.email}
                  senderName={choirName}
                  senderEmail={senderEmail}
                />
              </div>
            </AppCard>
          </div>

          {/* Right Column: Sidebar Stack */}
          <aside className="flex flex-col gap-5">
            {/* Card 1: Recipient summary */}
            <AppCard
              title="Recipient Summary"
              actions={
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={selectedRecipients.length === 0}
                  onClick={() => onViewRecipients(selectedRecipients, 'Recipients Selected for Send')}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="inline-flex"
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
              <div className="grid grid-cols-3 max-md:grid-cols-1 gap-3 mt-1">
                <button
                  type="button"
                  className="bg-primary-light border border-primary/15 rounded-lg p-4 flex flex-col items-center text-center gap-1.5 transition-all duration-250 relative overflow-hidden font-sans w-full cursor-pointer hover:-translate-y-0.5 hover:shadow-xs hover:border-primary active:scale-95 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed text-primary-deep [&_svg]:hover:text-primary-deep"
                  disabled={selectedRecipients.length === 0}
                  onClick={() => onViewRecipients(selectedRecipients, 'Recipient List (Total Audience)')}
                >
                  <div className="flex items-center gap-1.5 text-text-muted text-[10px] font-bold uppercase tracking-wider">
                    <svg
                      className="w-4 h-4 text-text-muted transition-colors duration-250"
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
                    <span>Total Audience</span>
                  </div>
                  <strong className="text-2xl font-bold text-text mt-1 mb-0.5 leading-none">{recipientCounts.total}</strong>
                  <span className="text-[10px] text-text-muted">matched singers</span>
                </button>

                <button
                  type="button"
                  className="bg-green-50/50 border border-green-600/15 rounded-lg p-4 flex flex-col items-center text-center gap-1.5 transition-all duration-250 relative overflow-hidden font-sans w-full cursor-pointer hover:-translate-y-0.5 hover:shadow-xs hover:border-green-600 active:scale-95 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed text-green-800 [&_svg]:hover:text-green-600"
                  disabled={selectedRecipients.filter((r) => r.email?.trim()).length === 0}
                  onClick={() =>
                    onViewRecipients(
                      selectedRecipients.filter((r) => r.email?.trim()),
                      'Recipient List (Via Email)'
                    )
                  }
                >
                  <div className="flex items-center gap-1.5 text-text-muted text-[10px] font-bold uppercase tracking-wider">
                    <svg
                      className="w-4 h-4 text-text-muted transition-colors duration-250"
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
                    <span>Via Email</span>
                  </div>
                  <strong className="text-2xl font-bold text-text mt-1 mb-0.5 leading-none">{recipientCounts.hasEmail}</strong>
                  <span className="text-[10px] text-text-muted">receive email</span>
                </button>

                <button
                  type="button"
                  className="bg-blue-50/50 border border-blue-600/15 rounded-lg p-4 flex flex-col items-center text-center gap-1.5 transition-all duration-250 relative overflow-hidden font-sans w-full cursor-pointer hover:-translate-y-0.5 hover:shadow-xs hover:border-blue-600 active:scale-95 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed text-blue-800 [&_svg]:hover:text-blue-600"
                  disabled={selectedRecipients.filter((r) => r.phone?.trim()).length === 0}
                  onClick={() =>
                    onViewRecipients(
                      selectedRecipients.filter((r) => r.phone?.trim()),
                      'Recipient List (Via SMS)'
                    )
                  }
                >
                  <div className="flex items-center gap-1.5 text-text-muted text-[10px] font-bold uppercase tracking-wider">
                    <svg
                      className="w-4 h-4 text-text-muted transition-colors duration-250"
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
                    <span>Via SMS</span>
                  </div>
                  <strong className="text-2xl font-bold text-text mt-1 mb-0.5 leading-none">{recipientCounts.hasPhone}</strong>
                  <span className="text-[10px] text-text-muted">receive SMS text</span>
                </button>
              </div>
            </AppCard>

            {/* Card 2: Pre-flight checklist */}
            <AppCard title="Pre-Flight Checklist">
              <div className="flex flex-col gap-2">
                {subject === '' && (messageType === 'Email' || messageType === 'Both') && (
                  <div className="flex items-start gap-3 w-full rounded-lg p-3 text-xs leading-normal border border-amber-100 border-l-4 border-l-amber-600 transition-transform duration-200 hover:translate-x-0.5 bg-amber-50 text-amber-900">
                    <svg
                      className="flex-shrink-0 w-4 h-4 mt-0.5"
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
                  <div className="flex items-start gap-3 w-full rounded-lg p-3 text-xs leading-normal border border-amber-100 border-l-4 border-l-amber-600 transition-transform duration-200 hover:translate-x-0.5 bg-amber-50 text-amber-900">
                    <svg
                      className="flex-shrink-0 w-4 h-4 mt-0.5"
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
                  <div className="flex items-start gap-3 w-full rounded-lg p-3 text-xs leading-normal border border-amber-100 border-l-4 border-l-amber-600 transition-transform duration-200 hover:translate-x-0.5 bg-amber-50 text-amber-900">
                    <svg
                      className="flex-shrink-0 w-4 h-4 mt-0.5"
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
                    '{setlist}',
                    '{{PLAYER_LINK}}',
                    '{{RSVP_LINKS}}',
                  ];

                  const combinedText = (subject + ' ' + content).toLowerCase();
                  const foundPlaceholders = eventPlaceholders.filter((p) =>
                    combinedText.includes(p.toLowerCase())
                  );

                  if (foundPlaceholders.length > 0) {
                    return (
                      <div className="flex items-start gap-3 w-full rounded-lg p-3 text-xs leading-normal border border-amber-100 border-l-4 border-l-amber-600 transition-transform duration-200 hover:translate-x-0.5 bg-amber-50 text-amber-900">
                        <svg
                          className="flex-shrink-0 w-4 h-4 mt-0.5"
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
                      <div className="flex items-start gap-3 w-full rounded-lg p-3 text-xs leading-normal border border-amber-100 border-l-4 border-l-amber-600 transition-transform duration-200 hover:translate-x-0.5 bg-amber-50 text-amber-900">
                        <svg
                          className="flex-shrink-0 w-4 h-4 mt-0.5"
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

                {renderSetlistWarning()}

                {selectedRecipients.some((r) => !r.email) && (messageType === 'Email' || messageType === 'Both') && (
                  <div className="flex items-start gap-3 w-full rounded-lg p-3 text-xs leading-normal border border-blue-100 border-l-4 border-l-blue-600 transition-transform duration-200 hover:translate-x-0.5 bg-blue-50 text-blue-900">
                    <svg
                      className="flex-shrink-0 w-4 h-4 mt-0.5"
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
                  <div className="flex items-start gap-3 w-full rounded-lg p-3 text-xs leading-normal border border-blue-100 border-l-4 border-l-blue-600 transition-transform duration-200 hover:translate-x-0.5 bg-blue-50 text-blue-900">
                    <svg
                      className="flex-shrink-0 w-4 h-4 mt-0.5"
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
                  <div className="flex items-start gap-3 w-full rounded-lg p-3 text-xs leading-normal border border-amber-100 border-l-4 border-l-amber-600 transition-transform duration-200 hover:translate-x-0.5 bg-amber-50 text-amber-900">
                    <svg
                      className="flex-shrink-0 w-4 h-4 mt-0.5"
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
                        className="underline font-semibold cursor-pointer text-primary hover:text-primary-deep"
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

                <div className="flex items-start gap-3 w-full rounded-lg p-3 text-xs leading-normal border border-emerald-100 border-l-4 border-l-emerald-600 transition-transform duration-200 hover:translate-x-0.5 bg-emerald-50 text-emerald-900">
                  <svg
                    className="flex-shrink-0 w-4 h-4 mt-0.5"
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
              <div className="flex gap-3 w-full max-md:flex-col-reverse">
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-border font-semibold px-4.5 py-2.5 cursor-pointer min-h-11 whitespace-nowrap transition-all duration-200 text-sm active:scale-97 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none bg-white text-text hover:bg-slate-50 hover:border-text-muted [&_svg]:hover:-translate-x-0.5"
                  onClick={() => setWizardStep('COMPOSE')}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4 transition-transform duration-200"
                  >
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  Back
                </button>

                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-border font-semibold px-4.5 py-2.5 cursor-pointer min-h-11 whitespace-nowrap transition-all duration-200 text-sm active:scale-97 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none bg-white text-text hover:bg-slate-50 hover:border-primary hover:text-primary-deep [&_svg]:hover:rotate-12"
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
                    className="w-4 h-4 transition-transform duration-200"
                  >
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                  {isSendingTest ? 'Sending test...' : 'Send Test to Me'}
                </button>

                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border font-semibold px-4.5 py-2.5 cursor-pointer min-h-11 whitespace-nowrap transition-all duration-200 text-sm active:scale-97 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none bg-primary border-primary text-white shadow-[0_2px_4px_rgba(74,124,89,0.15)] hover:bg-primary-deep hover:border-primary-deep hover:-translate-y-0.5 hover:shadow-[0_4px_6px_rgba(74,124,89,0.25)] [&_svg]:hover:translate-x-0.5 [&_svg]:hover:-translate-y-0.5"
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
                    className="w-4 h-4 transition-transform duration-200"
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
      </div>
      )}
    </div>
  );
}
