import type React from 'react';
import { AppCard } from '../../../components/common/AppCard';
import { Button, Select } from '../../../components/ui';
import type {
  CommunicationFilters,
  CommunicationRecipient,
} from '../../../services/communicationService';
import type { Event } from '../../../services/eventService';
import type { SectionDef } from '../../../services/settings/seatingSettings';
import type { UseCommunicationDraftReturn } from './useCommunicationDraft';
import { AudienceStatCards } from './AudienceStatCards';
import { WizardActionBar } from './WizardActionBar';

interface AudienceStepProps {
  draft: UseCommunicationDraftReturn;
  events: Event[];
  voicePartLabels: string[];
  configSections: SectionDef[];
  onViewRecipients: (recipients: CommunicationRecipient[], title: string) => void;
  onContinue: () => void;
}

export function AudienceStep({
  draft,
  events,
  voicePartLabels,
  configSections,
  onViewRecipients,
  onContinue,
}: AudienceStepProps) {
  const { filters, updateFilter, recipients, recipientCounts } = draft;

  const handleVoicePartChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as unknown as string[] | string;
    const arr = Array.isArray(val) ? val : [val].filter(Boolean);
    updateFilter('voiceParts', arr);
  };

  const handleEventContextChange = (eventId: string) => {
    updateFilter('eventId', eventId);
    if (!eventId && filters.rsvp !== 'All') {
      updateFilter('rsvp', 'All');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Actions */}
      <div className="border-border flex w-full items-center justify-between gap-3 border-b pb-3 max-md:flex-col max-md:items-stretch">
        <div>
          <h2 className="text-text text-base font-semibold sm:text-lg">
            Step 1: Define Your Audience
          </h2>
          <p className="text-text-muted text-xs">
            Select filter criteria on the left and verify reachable users on the right.
          </p>
        </div>
        <Button variant="primary" onClick={onContinue} className="w-full sm:w-auto">
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
              <label className="text-text-muted text-xs font-semibold tracking-wider uppercase">
                Event Context
              </label>
              <Select
                size="small"
                value={filters.eventId}
                onChange={(event) => handleEventContextChange(event.target.value)}
              >
                <option value="">No Specific Event</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title || event.expand?.venue?.name || ''}
                  </option>
                ))}
              </Select>
            </div>

            {/* RSVP Status */}
            <div className="flex flex-col gap-1.5">
              <label className="text-text-muted text-xs font-semibold tracking-wider uppercase">
                RSVP Status
              </label>
              <Select
                size="small"
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
              </Select>
              {!filters.eventId && (
                <span className="text-text-muted text-[11px] italic">
                  Select an event first to filter by RSVP status.
                </span>
              )}
            </div>

            {/* Member Status */}
            <div className="flex flex-col gap-1.5">
              <label className="text-text-muted text-xs font-semibold tracking-wider uppercase">
                Member Status
              </label>
              <Select
                size="small"
                value={filters.globalStatus}
                onChange={(event) => updateFilter('globalStatus', event.target.value)}
              >
                <option value="Active">Active</option>
                <option value="Idle">On Break</option>
                <option value="Inactive">Inactive</option>
                <option value="">All Statuses</option>
              </Select>
            </div>

            {/* Voice Part / Section multi-select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-text-muted text-xs font-semibold tracking-wider uppercase">
                Voice Part / Section
              </label>
              <Select
                multiple
                placeholder="All Voice Parts"
                value={filters.voiceParts || []}
                onChange={handleVoicePartChange}
                size="small"
              >
                {configSections.map((sec) => (
                  <option key={sec.code} value={sec.code}>
                    {sec.name} (Section)
                  </option>
                ))}
                {voicePartLabels.map((part) => (
                  <option key={part} value={part}>
                    {part}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </AppCard>

        {/* Right Column: Recipient Summary & Preview */}
        <div className="flex flex-col gap-6">
          <AppCard
            title="Audience Summary"
            actions={
              <span className="bg-primary-light text-primary-deep inline-flex items-center rounded px-2.5 py-0.5 text-xs font-semibold tracking-wider uppercase">
                {recipientCounts.total} Matched
              </span>
            }
          >
            <AudienceStatCards
              cards={[
                {
                  label: 'Selected',
                  count: recipientCounts.total,
                  subtitle: 'matched singers',
                  color: 'neutral',
                },
                {
                  label: 'Email Reach',
                  count: recipientCounts.hasEmail,
                  subtitle: 'reachable by email',
                  color: 'emerald',
                },
                {
                  label: 'SMS Reach',
                  count: recipientCounts.hasPhone,
                  subtitle: 'reachable by SMS',
                  color: 'blue',
                },
              ]}
            />

            {recipientCounts.hasPhone === 0 && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2.5 text-xs text-amber-800">
                <svg
                  className="size-4 flex-shrink-0 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span>SMS is unavailable for this audience.</span>
              </div>
            )}

            <div className="border-border flex items-center justify-between border-t pt-4">
              <span className="text-text-muted text-xs">Need to audit the exact names?</span>
              <button
                type="button"
                className="text-primary hover:text-primary-deep inline-flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-sm font-semibold hover:underline"
                disabled={recipients.length === 0}
                onClick={() => onViewRecipients(recipients, 'Matched Singers')}
              >
                <svg
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                View matched singers
              </button>
            </div>
          </AppCard>

          {/* Matched Singers Preview Panel */}
          <AppCard title="Singer Preview (showing first 5)">
            <div className="divide-border -my-2 flex flex-col divide-y">
              {recipients.length === 0 ? (
                <div className="text-text-muted py-4 text-center text-sm italic">
                  No singers matched with the current filters.
                </div>
              ) : (
                recipients.slice(0, 5).map((singer) => (
                  <div key={singer.id} className="flex items-center justify-between py-2 text-sm">
                    <div className="flex flex-col">
                      <span className="text-text font-medium">{singer.name}</span>
                      <span className="text-text-muted text-xs">
                        {singer.voicePart || 'No Voice Part'}
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      {singer.email ? (
                        <span className="inline-flex items-center rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                          Email
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                          No Email
                        </span>
                      )}
                      {singer.phone ? (
                        <span className="inline-flex items-center rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                          SMS
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                          No SMS
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
              {recipients.length > 5 && (
                <div className="text-text-muted py-2 text-center text-xs italic">
                  and {recipients.length - 5} more singers...
                </div>
              )}
            </div>
          </AppCard>
        </div>
      </div>

      <WizardActionBar className="justify-end">
        <Button variant="primary" onClick={onContinue}>
          Continue to Message
        </Button>
      </WizardActionBar>
    </div>
  );
}
