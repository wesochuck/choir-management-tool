import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import EasyMDE from 'easymde';
import { AppCard } from '../../../components/common/AppCard';
import { Button } from '../../../components/ui';
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

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>('blank');
  const [startedMessage, setStartedMessage] = useState(() => {
    return !!(subject || content);
  });

  // If the subject or content changes externally (e.g., when a draft is resumed),
  // automatically update the startedMessage state.
  useEffect(() => {
    if (subject || content) {
      setStartedMessage(true);
    }
  }, [subject, content]);

  const handleContinue = () => {
    if (selectedTemplateId === 'blank') {
      setSubject('');
      setContent('');
      setMessageType('Email');
    } else {
      const tpl = templates.find(t => t.id === selectedTemplateId);
      if (tpl) {
        setSubject(tpl.subject || '');
        setContent(tpl.content || '');
        setMessageType(tpl.type === 'SMS' ? 'SMS' : tpl.type === 'Both' ? 'Both' : 'Email');
      }
    }
    setStartedMessage(true);
  };

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
      <div className="flex w-full items-start gap-3 rounded-lg border border-l-4 border-amber-100 border-l-amber-600 bg-amber-50 p-3 text-xs leading-normal text-amber-900 transition-transform duration-200 hover:translate-x-0.5">
        <svg
          className="mt-0.5 size-4 flex-shrink-0"
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
          <Link to="/admin/setlists" className="cursor-pointer font-semibold text-primary underline hover:text-primary-deep">Open Set List Builder</Link>{' '}
          to approve it before sending.
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <WizardStepper
        steps={[
          { number: 1, id: 'TARGETS', label: 'Audience', isValid: true },
          { number: 2, id: 'COMPOSE', label: 'Message', isValid: true },
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
        <div className="flex flex-col gap-6">
          {/* Top Actions */}
          <div className="flex w-full items-center justify-between gap-3 border-b border-border pb-3 max-md:flex-col">
            <div>
              <h2 className="text-lg font-semibold text-text">Step 1: Define Your Audience</h2>
              <p className="text-xs text-text-muted">Select filter criteria on the left and verify reachable users on the right.</p>
            </div>
            <Button 
              variant="primary" 
              onClick={() => {
                setWizardStep('COMPOSE');
                setStartedMessage(false);
              }}
            >
              Continue to Message
            </Button>
          </div>

          {/* Two Column Grid */}
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[380px_1fr]">
            {/* Left Column: Filters */}
            <AppCard title="Audience Filters">
              <div className="flex flex-col gap-4">
                {/* Event Context */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold tracking-wider text-text-muted uppercase">Event Context</label>
                  <select
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary focus:outline-none"
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

                {/* RSVP Status */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold tracking-wider text-text-muted uppercase">RSVP Status</label>
                  <select
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-50"
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
                    <span className="text-[11px] text-text-muted italic">
                      Select an event first to filter by RSVP status.
                    </span>
                  )}
                </div>

                {/* Member Status */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold tracking-wider text-text-muted uppercase">Member Status</label>
                  <select
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary focus:outline-none"
                    value={filters.globalStatus}
                    onChange={(event) => updateFilter('globalStatus', event.target.value)}
                  >
                    <option value="Active">Active</option>
                    <option value="Idle">Idle</option>
                    <option value="Inactive">Inactive</option>
                    <option value="">All Statuses</option>
                  </select>
                </div>

                {/* Voice Part / Section dropdown */}
                <div className="relative flex flex-col gap-1.5" ref={dropdownRef}>
                  <label className="text-xs font-semibold tracking-wider text-text-muted uppercase">Voice Part / Section</label>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-left text-sm shadow-sm transition-all hover:border-primary focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <span className={(filters.voiceParts || []).length > 0 ? 'font-medium text-text' : 'text-text-muted'}>
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
                      className={`transition-transform duration-200 text-text-muted ${isDropdownOpen ? 'rotate-180' : 'rotate-0'}`}
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 z-55 mt-1 flex max-h-60 w-full flex-col gap-1 overflow-y-auto rounded-lg border border-border bg-surface p-2 shadow-lg">
                      <div className="px-2 py-1 text-xs font-bold tracking-wider text-text-muted uppercase">Sections</div>
                      {configSections.map((sec) => (
                        <label key={sec.code} className="flex cursor-pointer items-center rounded px-2 py-1.5 text-sm hover:bg-slate-50">
                          <input
                            type="checkbox"
                            checked={filters.voiceParts.includes(sec.code)}
                            onChange={() => handleVoicePartToggle(sec.code)}
                            className="mr-2 rounded border-border text-primary focus:ring-primary"
                          />
                          <span className={filters.voiceParts.includes(sec.code) ? 'font-medium text-primary-deep' : 'text-text'}>
                            {sec.name}
                          </span>
                        </label>
                      ))}
                      <div className="my-1 border-t border-border"></div>
                      <div className="px-2 py-1 text-xs font-bold tracking-wider text-text-muted uppercase">Individual Parts</div>
                      {voicePartLabels.map((part) => (
                        <label key={part} className="flex cursor-pointer items-center rounded px-2 py-1.5 text-sm hover:bg-slate-50">
                          <input
                            type="checkbox"
                            checked={filters.voiceParts.includes(part)}
                            onChange={() => handleVoicePartToggle(part)}
                            className="mr-2 rounded border-border text-primary focus:ring-primary"
                          />
                          <span className={filters.voiceParts.includes(part) ? 'font-medium text-primary-deep' : 'text-text'}>
                            {part}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </AppCard>

            {/* Right Column: Recipient Summary & Preview */}
            <div className="flex flex-col gap-6">
              <AppCard 
                title="Audience Summary"
                actions={
                  <span className="inline-flex items-center rounded bg-primary-light px-2.5 py-0.5 text-xs font-semibold tracking-wider text-primary-deep uppercase">
                    {recipientCounts.total} Matched
                  </span>
                }
              >
                <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  {/* Total Card */}
                  <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-slate-50/50 p-4 text-center">
                    <span className="text-xs font-bold tracking-wider text-text-muted uppercase">Selected</span>
                    <span className="mt-1 text-3xl font-extrabold text-text">{recipientCounts.total}</span>
                    <span className="mt-1 text-[11px] text-text-muted">matched singers</span>
                  </div>

                  {/* Email Card */}
                  <div className="flex flex-col items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50/30 p-4 text-center">
                    <span className="text-xs font-bold tracking-wider text-emerald-800 uppercase">Email Reach</span>
                    <span className="mt-1 text-3xl font-extrabold text-emerald-900">{recipientCounts.hasEmail}</span>
                    <span className="mt-1 text-[11px] text-emerald-700">reachable by email</span>
                  </div>

                  {/* SMS Card */}
                  <div className="flex flex-col items-center justify-center rounded-lg border border-blue-100 bg-blue-50/30 p-4 text-center">
                    <span className="text-xs font-bold tracking-wider text-blue-800 uppercase">SMS Reach</span>
                    <span className="mt-1 text-3xl font-extrabold text-blue-900">{recipientCounts.hasPhone}</span>
                    <span className="mt-1 text-[11px] text-blue-700">reachable by SMS</span>
                  </div>
                </div>

                {recipientCounts.hasPhone === 0 && (
                  <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2.5 text-xs text-amber-800">
                    <svg className="size-4 flex-shrink-0 text-amber-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>SMS is unavailable for this audience.</span>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-border pt-4">
                  <span className="text-xs text-text-muted">Need to audit the exact names?</span>
                  <button
                    type="button"
                    className="inline-flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-sm font-semibold text-primary hover:text-primary-deep hover:underline"
                    disabled={recipients.length === 0}
                    onClick={() => onViewRecipients(recipients, 'Matched Singers')}
                  >
                    <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View matched singers
                  </button>
                </div>
              </AppCard>

              {/* Matched Singers Preview Panel */}
              <AppCard title="Singer Preview (showing first 5)">
                <div className="-my-2 flex flex-col divide-y divide-border">
                  {recipients.length === 0 ? (
                    <div className="py-4 text-center text-sm text-text-muted italic">
                      No singers matched with the current filters.
                    </div>
                  ) : (
                    recipients.slice(0, 5).map((singer) => (
                      <div key={singer.id} className="flex items-center justify-between py-2 text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium text-text">{singer.name}</span>
                          <span className="text-xs text-text-muted">{singer.voicePart || 'No Voice Part'}</span>
                        </div>
                        <div className="flex gap-1.5">
                          {singer.email ? (
                            <span className="inline-flex items-center rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">Email</span>
                          ) : (
                            <span className="inline-flex items-center rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">No Email</span>
                          )}
                          {singer.phone ? (
                            <span className="inline-flex items-center rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">SMS</span>
                          ) : (
                            <span className="inline-flex items-center rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">No SMS</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  {recipients.length > 5 && (
                    <div className="py-2 text-center text-xs text-text-muted italic">
                      and {recipients.length - 5} more singers...
                    </div>
                  )}
                </div>
              </AppCard>
            </div>
          </div>

          {/* Sticky/Bottom Actions */}
          <div className="sticky inset-x-0 bottom-0 z-50 -mx-4 flex items-center justify-end gap-2 border-t border-border bg-surface p-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] lg:static lg:mx-0 lg:w-full lg:border-t-0 lg:bg-transparent lg:p-0 lg:shadow-none">
            <Button 
              variant="primary" 
              onClick={() => {
                setWizardStep('COMPOSE');
                setStartedMessage(false);
              }}
            >
              Continue to Message
            </Button>
          </div>
        </div>
      )}

      {wizardStep === 'COMPOSE' && (
        <div className="flex flex-col gap-4">
          {!startedMessage ? (
            /* Sub-step A: Template Selection */
            <div className="flex flex-col gap-6">
              <div className="flex w-full items-center justify-between gap-3 border-b border-border pb-3 max-md:flex-col">
                <div>
                  <h2 className="text-lg font-semibold text-text">Step 2: Choose how to start your message</h2>
                  <p className="text-xs text-text-muted">Select a template below or start with a blank message.</p>
                </div>
                <Button variant="outline" onClick={() => setWizardStep('TARGETS')}>
                  ← Back to Audience
                </Button>
              </div>

              <AppCard title="Templates & Quick Starts">
                <div className="flex flex-col gap-4">
                  <TemplateGrid
                    templates={templates.map(mapToMessageTemplate)}
                    selectedTemplateId={selectedTemplateId}
                    onSelect={(tpl) => {
                      setSelectedTemplateId(tpl.id);
                    }}
                  />
                </div>
              </AppCard>

              <div className="sticky inset-x-0 bottom-0 z-50 -mx-4 flex items-center justify-between border-t border-border bg-surface p-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] lg:static lg:mx-0 lg:w-full lg:bg-transparent lg:p-0 lg:shadow-none">
                <Button variant="outline" onClick={() => setWizardStep('TARGETS')}>
                  ← Back to Audience
                </Button>
                <Button variant="primary" onClick={handleContinue}>
                  {selectedTemplateId === 'blank' ? 'Start Blank Message' : 'Use Template & Continue'}
                </Button>
              </div>
            </div>
          ) : (
            /* Sub-step B: Composer */
            <div className="flex flex-col gap-4">
              <div
                className="flex w-full w-full flex-col items-center justify-between gap-2 border-b border-border pb-2.5 md:flex-row"
              >
                <Button variant="outline" onClick={() => setStartedMessage(false)}>
                  ← Back to Template Selection
                </Button>
                <div className="flex flex-2 flex-row flex-wrap items-center gap-2 lg:flex-none">
                  <Button variant="secondary" onClick={handleSaveDraft} disabled={isSavingDraft}>
                    {isSavingDraft ? 'Saving...' : 'Save Draft'}
                  </Button>
                  <Button variant="primary" onClick={() => setWizardStep('REVIEW')}>
                    Next: Review & Send →
                  </Button>
                </div>
              </div>
              <div className="flex flex-col items-start gap-6 lg:grid lg:grid-cols-[1fr_300px]">
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
                    className="sticky inset-x-0 bottom-0 z-50 -mx-4 flex w-full flex-col items-center justify-between gap-2 border-t border-border bg-surface p-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:flex-row lg:static lg:mx-0 lg:border-t-0 lg:bg-transparent lg:p-0 lg:shadow-none"
                  >
                    <Button variant="outline" onClick={() => setStartedMessage(false)}>
                      ← Back to Template Selection
                    </Button>
                    <div className="flex flex-2 flex-row flex-wrap items-center gap-2 lg:flex-none">
                      <Button variant="secondary" onClick={handleSaveDraft} disabled={isSavingDraft}>
                        {isSavingDraft ? 'Saving...' : 'Save Draft'}
                      </Button>
                      <Button variant="primary" onClick={() => setWizardStep('REVIEW')}>
                        Next: Review & Send →
                      </Button>
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
        </div>
      )}

      {wizardStep === 'REVIEW' && (
        <div className="flex flex-col gap-4">
          <div
            className="flex w-full w-full flex-col items-center justify-between gap-2 border-b border-border pb-2.5 md:flex-row"
          >
            <button
              type="button"
              className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-white px-4.5 py-2.5 text-sm font-semibold whitespace-nowrap text-text transition-all duration-200 hover:border-text-muted hover:bg-slate-50 active:scale-97 disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none [&_svg]:hover:-translate-x-0.5"
              onClick={() => setWizardStep('COMPOSE')}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-1 inline-flex size-4 transition-transform duration-200"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back
            </button>
            <div className="flex flex-row flex-wrap items-center gap-2">
              <button
                type="button"
                className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-white px-4.5 py-2.5 text-sm font-semibold whitespace-nowrap text-text transition-all duration-200 hover:border-primary hover:bg-slate-50 hover:text-primary-deep active:scale-97 disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none [&_svg]:hover:rotate-12"
                onClick={handleSendTest}
                disabled={isSendingTest || isSending}
                title={`Send email test to ${user?.email || 'your email'}`}
              >
                {isSendingTest ? 'Sending test...' : 'Send Test to Me'}
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4.5 py-2.5 text-sm font-semibold whitespace-nowrap text-white shadow-[0_2px_4px_rgba(74,124,89,0.15)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-deep hover:bg-primary-deep hover:shadow-[0_4px_6px_rgba(74,124,89,0.25)] active:scale-97 disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none [&_svg]:hover:translate-x-0.5 [&_svg]:hover:-translate-y-0.5"
                onClick={sendMessage}
                disabled={isSending || selectedRecipients.length === 0}
              >
                {isSending ? 'Sending...' : `Send to ${selectedRecipients.length} Singers`}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.15fr_0.85fr]">
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
                <Button
                  type="button"
                  variant="outline"
                  size="small"
                  disabled={selectedRecipients.length === 0}
                  onClick={() => onViewRecipients(selectedRecipients, 'Recipients Selected for Send')}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="inline-flex size-4 mr-1"
                  >
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                  View List
                </Button>
              }
            >
              <div className="mt-1 grid grid-cols-3 gap-3 max-md:grid-cols-1">
                <button
                  type="button"
                  className="relative flex w-full cursor-pointer flex-col items-center gap-1.5 overflow-hidden rounded-lg border border-primary/15 bg-primary-light p-4 text-center font-sans text-primary-deep transition-all duration-250 hover:-translate-y-0.5 hover:border-primary hover:shadow-xs active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:hover:text-primary-deep"
                  disabled={selectedRecipients.length === 0}
                  onClick={() => onViewRecipients(selectedRecipients, 'Recipient List (Total Audience)')}
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-text-muted uppercase">
                    <svg
                      className="size-4 text-text-muted transition-colors duration-250"
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
                  <strong className="mt-1 mb-0.5 text-2xl leading-none font-bold text-text">{recipientCounts.total}</strong>
                  <span className="text-[10px] text-text-muted">matched singers</span>
                </button>

                <button
                  type="button"
                  className="relative flex w-full cursor-pointer flex-col items-center gap-1.5 overflow-hidden rounded-lg border border-green-600/15 bg-green-50/50 p-4 text-center font-sans text-green-800 transition-all duration-250 hover:-translate-y-0.5 hover:border-green-600 hover:shadow-xs active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:hover:text-green-600"
                  disabled={selectedRecipients.filter((r) => r.email?.trim()).length === 0}
                  onClick={() =>
                    onViewRecipients(
                      selectedRecipients.filter((r) => r.email?.trim()),
                      'Recipient List (Via Email)'
                    )
                  }
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-text-muted uppercase">
                    <svg
                      className="size-4 text-text-muted transition-colors duration-250"
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
                  <strong className="mt-1 mb-0.5 text-2xl leading-none font-bold text-text">{recipientCounts.hasEmail}</strong>
                  <span className="text-[10px] text-text-muted">receive email</span>
                </button>

                <button
                  type="button"
                  className="relative flex w-full cursor-pointer flex-col items-center gap-1.5 overflow-hidden rounded-lg border border-blue-600/15 bg-blue-50/50 p-4 text-center font-sans text-blue-800 transition-all duration-250 hover:-translate-y-0.5 hover:border-blue-600 hover:shadow-xs active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:hover:text-blue-600"
                  disabled={selectedRecipients.filter((r) => r.phone?.trim()).length === 0}
                  onClick={() =>
                    onViewRecipients(
                      selectedRecipients.filter((r) => r.phone?.trim()),
                      'Recipient List (Via SMS)'
                    )
                  }
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-text-muted uppercase">
                    <svg
                      className="size-4 text-text-muted transition-colors duration-250"
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
                  <strong className="mt-1 mb-0.5 text-2xl leading-none font-bold text-text">{recipientCounts.hasPhone}</strong>
                  <span className="text-[10px] text-text-muted">receive SMS text</span>
                </button>
              </div>
            </AppCard>

            {/* Card 2: Pre-flight checklist */}
            <AppCard title="Pre-Flight Checklist">
              <div className="flex flex-col gap-2">
                {subject === '' && (messageType === 'Email' || messageType === 'Both') && (
                  <div className="flex w-full items-start gap-3 rounded-lg border border-l-4 border-amber-100 border-l-amber-600 bg-amber-50 p-3 text-xs leading-normal text-amber-900 transition-transform duration-200 hover:translate-x-0.5">
                    <svg
                      className="mt-0.5 size-4 flex-shrink-0"
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
                  <div className="flex w-full items-start gap-3 rounded-lg border border-l-4 border-amber-100 border-l-amber-600 bg-amber-50 p-3 text-xs leading-normal text-amber-900 transition-transform duration-200 hover:translate-x-0.5">
                    <svg
                      className="mt-0.5 size-4 flex-shrink-0"
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
                  <div className="flex w-full items-start gap-3 rounded-lg border border-l-4 border-amber-100 border-l-amber-600 bg-amber-50 p-3 text-xs leading-normal text-amber-900 transition-transform duration-200 hover:translate-x-0.5">
                    <svg
                      className="mt-0.5 size-4 flex-shrink-0"
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
                      <div className="flex w-full items-start gap-3 rounded-lg border border-l-4 border-amber-100 border-l-amber-600 bg-amber-50 p-3 text-xs leading-normal text-amber-900 transition-transform duration-200 hover:translate-x-0.5">
                        <svg
                          className="mt-0.5 size-4 flex-shrink-0"
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
                      <div className="flex w-full items-start gap-3 rounded-lg border border-l-4 border-amber-100 border-l-amber-600 bg-amber-50 p-3 text-xs leading-normal text-amber-900 transition-transform duration-200 hover:translate-x-0.5">
                        <svg
                          className="mt-0.5 size-4 flex-shrink-0"
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
                  <div className="flex w-full items-start gap-3 rounded-lg border border-l-4 border-blue-100 border-l-blue-600 bg-blue-50 p-3 text-xs leading-normal text-blue-900 transition-transform duration-200 hover:translate-x-0.5">
                    <svg
                      className="mt-0.5 size-4 flex-shrink-0"
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
                  <div className="flex w-full items-start gap-3 rounded-lg border border-l-4 border-blue-100 border-l-blue-600 bg-blue-50 p-3 text-xs leading-normal text-blue-900 transition-transform duration-200 hover:translate-x-0.5">
                    <svg
                      className="mt-0.5 size-4 flex-shrink-0"
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
                  <div className="flex w-full items-start gap-3 rounded-lg border border-l-4 border-amber-100 border-l-amber-600 bg-amber-50 p-3 text-xs leading-normal text-amber-900 transition-transform duration-200 hover:translate-x-0.5">
                    <svg
                      className="mt-0.5 size-4 flex-shrink-0"
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
                        className="cursor-pointer font-semibold text-primary underline hover:text-primary-deep"
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

                <div className="flex w-full items-start gap-3 rounded-lg border border-l-4 border-emerald-100 border-l-emerald-600 bg-emerald-50 p-3 text-xs leading-normal text-emerald-900 transition-transform duration-200 hover:translate-x-0.5">
                  <svg
                    className="mt-0.5 size-4 flex-shrink-0"
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
              <div className="flex w-full gap-3 max-md:flex-col-reverse">
                <button
                  type="button"
                  className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-white px-4.5 py-2.5 text-sm font-semibold whitespace-nowrap text-text transition-all duration-200 hover:border-text-muted hover:bg-slate-50 active:scale-97 disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none [&_svg]:hover:-translate-x-0.5"
                  onClick={() => setWizardStep('COMPOSE')}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-4 transition-transform duration-200"
                  >
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  Back
                </button>

                <button
                  type="button"
                  className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-white px-4.5 py-2.5 text-sm font-semibold whitespace-nowrap text-text transition-all duration-200 hover:border-primary hover:bg-slate-50 hover:text-primary-deep active:scale-97 disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none [&_svg]:hover:rotate-12"
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
                    className="size-4 transition-transform duration-200"
                  >
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                  {isSendingTest ? 'Sending test...' : 'Send Test to Me'}
                </button>

                <button
                  type="button"
                  className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-4.5 py-2.5 text-sm font-semibold whitespace-nowrap text-white shadow-[0_2px_4px_rgba(74,124,89,0.15)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-deep hover:bg-primary-deep hover:shadow-[0_4px_6px_rgba(74,124,89,0.25)] active:scale-97 disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none [&_svg]:hover:translate-x-0.5 [&_svg]:hover:-translate-y-0.5"
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
                    className="size-4 transition-transform duration-200"
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
